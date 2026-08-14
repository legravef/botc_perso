import type { Character, CharacterCategory, Composition, ScriptId, StorytellerLevel } from '@/types'
import { getCharactersForScript } from '@/data'
import { applySetupModifiers, getBaseDistribution, validateComposition } from './composition'

export interface TroubleBrewingSixPlayerPreset {
  id: 'balanced' | 'beginner' | 'social' | 'baron-chaos'
  label: string
  audience: string
  description: string
  characterIds: string[]
  drunkBelievedCharacterId: string | null
}

/**
 * Compositions prêtes à jouer pour Trouble Brewing à 6 joueurs. Elles
 * respectent toutes la répartition Teensyville 3/1/1/1, sauf la variante
 * Baron qui applique légalement +2 Parias / -2 Villageois (1/3/1/1).
 */
export const TROUBLE_BREWING_SIX_PLAYER_PRESETS: TroubleBrewingSixPlayerPreset[] = [
  {
    id: 'balanced',
    label: 'Équilibrée',
    audience: 'Recommandée',
    description: 'Informations progressives, protection et incertitude autour de l’Ivrogne.',
    characterIds: ['monk', 'librarian', 'undertaker', 'drunk', 'spy', 'imp'],
    drunkBelievedCharacterId: 'empath',
  },
  {
    id: 'beginner',
    label: 'Première partie',
    audience: 'Débutants',
    description: 'Pouvoirs faciles à comprendre et une seule source contrôlée de désinformation.',
    characterIds: ['washerwoman', 'empath', 'monk', 'saint', 'poisoner', 'imp'],
    drunkBelievedCharacterId: null,
  },
  {
    id: 'social',
    label: 'Tendue et sociale',
    audience: 'Intermédiaires',
    description: 'Peu d’informations directes, mais des choix de morts et d’exécutions très délicats.',
    characterIds: ['chef', 'ravenkeeper', 'mayor', 'saint', 'spy', 'imp'],
    drunkBelievedCharacterId: null,
  },
  {
    id: 'baron-chaos',
    label: 'Chaos du Baron',
    audience: 'Expérimentés',
    description: 'Un seul vrai Villageois et trois Parias : une partie volontairement instable.',
    characterIds: ['fortune-teller', 'drunk', 'recluse', 'saint', 'baron', 'imp'],
    drunkBelievedCharacterId: 'empath',
  },
]

/**
 * Profils de recommandation par niveau de Conteur.
 *
 * Le profil "débutant" reproduit la composition "TPI TB1" documentée par
 * Ben Burns (Storyteller salarié de The Pandemonium Institute) comme
 * réglage par défaut pour toute première partie de Trouble Brewing :
 * Diablotin / Confidente / Reclus / (Lavandière ou Libraire ou Chef) /
 * Empathique / Voyante / Croque-mort / Moine (ou Vierge selon Steven
 * Medway et Baron Ted) + un dernier Villageois neutre. Principe explicite :
 * privilégier les personnages qui agissent chaque nuit (pour garder les
 * joueurs impliqués), exclure le Mercenaire et le Saint (risque de fin de
 * partie prématurée), et utiliser la Confidente comme filet de sécurité
 * pour le Mal. Source : Bakery by the Clocktower — TPI Storyteller Advice
 * (sites.google.com/view/bakerybytheclocktower/advice/tpi-storyteller-advice),
 * qui rapporte cette pratique telle que décrite par Ben Burns, Steven
 * Medway et Baron Ted (TPI).
 */
export interface RecommendationProfile {
  /** Personnages jamais tirés à ce niveau, sauf verrouillage explicite par le Conteur. */
  excludedCharacterIds: string[]
  /** Poids relatif de tirage par personnage (défaut 1 si absent). */
  weights: Record<string, number>
}

const BEGINNER_PROFILE: RecommendationProfile = {
  excludedCharacterIds: ['slayer', 'saint'],
  weights: {
    // Cœur de la composition "TPI TB1" : des pouvoirs actifs chaque nuit.
    empath: 4,
    'fortune-teller': 4,
    undertaker: 4,
    monk: 4,
    virgin: 3,
    // Un seul détecteur de paire suffit pour une première partie.
    washerwoman: 2,
    librarian: 2,
    chef: 2,
    investigator: 2,
    soldier: 2,
    ravenkeeper: 2,
    mayor: 1,
    // Étrangers : le Reclus fait partie du cœur TPI TB1 ; l'Ivrogne offre une
    // bonne mécanique de découverte pour un joueur.
    recluse: 3,
    drunk: 2,
    butler: 2,
    // Sbires : la Confidente est le filet de sécurité recommandé.
    'scarlet-woman': 4,
    poisoner: 2,
    baron: 1,
    spy: 1,
  },
}

const INTERMEDIATE_PROFILE: RecommendationProfile = {
  excludedCharacterIds: [],
  weights: {
    empath: 1.4,
    'fortune-teller': 1.4,
    undertaker: 1.4,
    monk: 1.4,
    drunk: 1.3,
    'scarlet-woman': 1.3,
  },
}

const EXPERIENCED_PROFILE: RecommendationProfile = {
  excludedCharacterIds: [],
  weights: {},
}

export function getRecommendationProfile(level: StorytellerLevel): RecommendationProfile {
  if (level === 'beginner') return BEGINNER_PROFILE
  if (level === 'intermediate') return INTERMEDIATE_PROFILE
  return EXPERIENCED_PROFILE
}

/**
 * Tirage pondéré sans remise (méthode de la roulette), pour biaiser vers un
 * profil sans jamais dépasser les emplacements officiels.
 *
 * L'exclusion de niveau (ex. Saint/Mercenaire en débutant) est traitée comme
 * un poids nul plutôt qu'un retrait pur du pool : si tous les personnages
 * restants sont "exclus" (ex. le Baron force à utiliser les 4 Parias à 15
 * joueurs, dont le Saint), on retombe sur un tirage uniforme parmi eux
 * plutôt que d'échouer à compléter la composition. La validité de la
 * composition prime toujours sur la préférence de niveau.
 */
function weightedPickRandom(
  pool: Character[],
  count: number,
  profile: RecommendationProfile,
  randomFn: () => number,
): Character[] {
  const remaining = [...pool]
  const result: Character[] = []
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const rawWeights = remaining.map((c) =>
      profile.excludedCharacterIds.includes(c.id) ? 0 : (profile.weights[c.id] ?? 1),
    )
    const total = rawWeights.reduce((a, b) => a + b, 0)
    const weights = total > 0 ? rawWeights : remaining.map(() => 1)
    const weightTotal = total > 0 ? total : remaining.length
    let r = randomFn() * weightTotal
    let index = weights.length - 1
    for (let w = 0; w < weights.length; w++) {
      r -= weights[w] as number
      if (r <= 0) {
        index = w
        break
      }
    }
    result.push(remaining.splice(index, 1)[0] as Character)
  }
  return result
}

export interface GenerateSuggestedCompositionOptions {
  playerCount: number
  scriptId: ScriptId
  level: StorytellerLevel
  /** Personnages à conserver tels quels, même s'ils sont normalement exclus à ce niveau. */
  lockedCharacterIds?: string[]
  randomFn?: () => number
}

const CATEGORY_LABEL: Record<CharacterCategory, string> = {
  townsfolk: 'Villageois',
  outsider: 'Paria',
  minion: 'Sbire',
  demon: 'Démon',
}

/**
 * Génère une composition biaisée vers un niveau d'expérience du Conteur,
 * tout en respectant strictement la répartition officielle. Les personnages
 * verrouillés par le Conteur sont toujours conservés, même s'ils seraient
 * normalement exclus au niveau choisi (ex. verrouiller le Saint en mode
 * débutant reste possible : c'est un choix explicite qui prime).
 */
export function generateSuggestedComposition(options: GenerateSuggestedCompositionOptions): Composition {
  const { playerCount, scriptId, level, lockedCharacterIds = [], randomFn = Math.random } = options
  const profile = getRecommendationProfile(level)
  const characters = getCharactersForScript(scriptId)
  const base = getBaseDistribution(playerCount)
  const lockedSet = new Set(lockedCharacterIds)

  const byCategory = (category: CharacterCategory) => characters.filter((c) => c.category === category)

  function pickForCategory(category: CharacterCategory, targetCount: number): Character[] {
    const locked = byCategory(category).filter((c) => lockedSet.has(c.id))
    if (locked.length > targetCount) {
      throw new Error(
        `Trop de personnages verrouillés en catégorie ${CATEGORY_LABEL[category]} (${locked.length}) pour ${targetCount} emplacement(s).`,
      )
    }
    const remainingPool = byCategory(category).filter((c) => !lockedSet.has(c.id))
    const picked = weightedPickRandom(remainingPool, targetCount - locked.length, profile, randomFn)
    return [...locked, ...picked]
  }

  const demons = pickForCategory('demon', base.demon)
  const minions = pickForCategory('minion', base.minion)

  const provisionalIds = [...demons, ...minions].map((c) => c.id)
  const { effective } = applySetupModifiers(provisionalIds, playerCount, scriptId)

  const outsiders = pickForCategory('outsider', effective.outsider)
  const townsfolk = pickForCategory('townsfolk', effective.townsfolk)

  const allIds = [...townsfolk, ...outsiders, ...minions, ...demons].map((c) => c.id)
  return validateComposition(allIds, playerCount, scriptId)
}
