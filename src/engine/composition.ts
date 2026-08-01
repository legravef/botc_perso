import type { CategoryCounts, Character, CharacterCategory, Composition, ScriptId } from '@/types'
import { MAX_PLAYERS, MIN_PLAYERS, getCharactersForScript } from '@/data'
import { BASE_DISTRIBUTION_TABLE } from '@/data/distribution-table'

const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  townsfolk: 'Villageois',
  outsider: 'Parias',
  minion: 'Sbires',
  demon: 'Démons',
}

export function getBaseDistribution(playerCount: number): CategoryCounts {
  const dist = BASE_DISTRIBUTION_TABLE[playerCount]
  if (!dist) {
    throw new Error(
      `Aucune répartition officielle pour ${playerCount} joueurs (plage prise en charge : ${MIN_PLAYERS}-${MAX_PLAYERS}).`,
    )
  }
  return { ...dist }
}

export interface SetupModifierApplication {
  characterId: string
  description: string
}

export interface EffectiveDistribution {
  base: CategoryCounts
  effective: CategoryCounts
  appliedModifiers: SetupModifierApplication[]
}

/**
 * Applique les modificateurs de composition (ex. Baron) déclarés sur les
 * personnages sélectionnés à la répartition officielle de base.
 */
export function applySetupModifiers(
  characterIds: string[],
  playerCount: number,
  scriptId: ScriptId,
  godfatherOutsiderDelta: -1 | 0 | 1 = 0,
): EffectiveDistribution {
  const base = getBaseDistribution(playerCount)
  const effective = { ...base }
  const characters = getCharactersForScript(scriptId)
  const appliedModifiers: SetupModifierApplication[] = []

  for (const id of characterIds) {
    const character = characters.find((c) => c.id === id)
    const modifier = character?.setupModifier
    if (!character || !modifier) continue

    if (modifier.type === 'add-outsiders-remove-townsfolk') {
      effective.outsider += modifier.count
      effective.townsfolk -= modifier.count
      appliedModifiers.push({
        characterId: id,
        description: `${character.nameFr} : +${modifier.count} Paria(s), -${modifier.count} Villageois(s).`,
      })
    }
    if (modifier.type === 'choose-outsider-delta') {
      if (godfatherOutsiderDelta !== 0) {
        effective.outsider += godfatherOutsiderDelta
        effective.townsfolk -= godfatherOutsiderDelta
        appliedModifiers.push({
          characterId: id,
          description: `${character.nameFr} : ${godfatherOutsiderDelta > 0 ? '+1' : '-1'} Paria, ${godfatherOutsiderDelta > 0 ? '-1' : '+1'} Villageois.`,
        })
      }
    }
  }

  return { base, effective, appliedModifiers }
}

/**
 * Valide une sélection de personnages pour un nombre de joueurs donné.
 * Fonction pure : ne modifie rien, ne lève pas d'exception pour des données
 * de jeu incorrectes (nombre de joueurs hors plage, doublons...) — elle les
 * rapporte comme erreurs dans le résultat.
 */
export function validateComposition(
  characterIds: string[],
  playerCount: number,
  scriptId: ScriptId,
  godfatherOutsiderDelta: -1 | 0 | 1 = 0,
): Composition {
  const errors: string[] = []
  const warnings: string[] = []
  const characters = getCharactersForScript(scriptId)

  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    errors.push(
      `Le nombre de joueurs doit être compris entre ${MIN_PLAYERS} et ${MAX_PLAYERS} (actuellement ${playerCount}).`,
    )
  }

  for (const id of characterIds) {
    if (!characters.some((c) => c.id === id)) {
      errors.push(`Personnage inconnu pour ce script : "${id}".`)
    }
  }

  const occurrences = new Map<string, number>()
  for (const id of characterIds) occurrences.set(id, (occurrences.get(id) ?? 0) + 1)
  for (const [id, count] of occurrences) {
    if (count > 1) {
      const character = characters.find((c) => c.id === id)
      errors.push(
        `${character?.nameFr ?? id} est sélectionné ${count} fois : chaque personnage ne peut être choisi qu'une seule fois.`,
      )
    }
  }

  const validIds = [...occurrences.keys()].filter((id) => characters.some((c) => c.id === id))
  const clampedPlayerCount = Math.min(Math.max(playerCount, MIN_PLAYERS), MAX_PLAYERS)
  const { base, effective, appliedModifiers } = applySetupModifiers(validIds, clampedPlayerCount, scriptId, godfatherOutsiderDelta)

  const actualCounts: CategoryCounts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  for (const id of validIds) {
    const character = characters.find((c) => c.id === id)
    if (character) actualCounts[character.category] += 1
  }

  const playerCountInRange = playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS

  if (playerCountInRange && validIds.length !== playerCount) {
    errors.push(
      `La composition doit contenir exactement ${playerCount} personnages (actuellement ${validIds.length}).`,
    )
  }

  if (playerCountInRange) {
    for (const category of Object.keys(effective) as CharacterCategory[]) {
      if (actualCounts[category] !== effective[category]) {
        errors.push(
          `${CATEGORY_LABELS[category]} : ${actualCounts[category]} sélectionné(s), ${effective[category]} attendu(s).`,
        )
      }
    }
  }

  if (actualCounts.demon > 1) {
    errors.push('Une composition ne peut comporter qu\'un seul Démon.')
  }

  for (const modifier of appliedModifiers) warnings.push(modifier.description)

  if (validIds.includes('drunk')) {
    warnings.push(
      "L'Ivrogne nécessite de choisir, en préparation de partie, un Villageois absent qu'il croira être.",
    )
  }
  if (validIds.includes('imp')) {
    warnings.push(
      'Le Diablotin nécessite de choisir trois bluffs parmi les personnages absents, en préparation de partie.',
    )
  }

  return {
    baseCounts: base,
    effectiveCounts: effective,
    characterIds: validIds,
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export interface GenerateCompositionOptions {
  playerCount: number
  scriptId: ScriptId
  /** Identifiants de personnages à conserver tels quels avant de tirer le reste au hasard. */
  lockedCharacterIds?: string[]
  /** Fonction de tirage aléatoire, injectable pour les tests (doit retourner un nombre dans [0, 1[). */
  randomFn?: () => number
}

function pickRandom<T>(pool: T[], count: number, randomFn: () => number): T[] {
  const remaining = [...pool]
  const result: T[] = []
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const index = Math.floor(randomFn() * remaining.length)
    result.push(remaining.splice(index, 1)[0] as T)
  }
  return result
}

/**
 * Génère une composition aléatoire valide pour le nombre de joueurs donné,
 * en respectant les personnages verrouillés par le Conteur.
 */
export function generateRandomComposition(options: GenerateCompositionOptions): Composition {
  const { playerCount, scriptId, lockedCharacterIds = [], randomFn = Math.random } = options
  const characters = getCharactersForScript(scriptId)
  const base = getBaseDistribution(playerCount)
  const lockedSet = new Set(lockedCharacterIds)

  const byCategory = (category: CharacterCategory): Character[] =>
    characters.filter((c) => c.category === category)

  const lockedDemons = byCategory('demon').filter((c) => lockedSet.has(c.id))
  if (lockedDemons.length > base.demon) {
    throw new Error(`Trop de Démons verrouillés (${lockedDemons.length}) pour ${base.demon} emplacement(s).`)
  }
  const demons = [
    ...lockedDemons,
    ...pickRandom(
      byCategory('demon').filter((c) => !lockedSet.has(c.id)),
      base.demon - lockedDemons.length,
      randomFn,
    ),
  ]

  const lockedMinions = byCategory('minion').filter((c) => lockedSet.has(c.id))
  if (lockedMinions.length > base.minion) {
    throw new Error(`Trop de Sbires verrouillés (${lockedMinions.length}) pour ${base.minion} emplacement(s).`)
  }
  const minions = [
    ...lockedMinions,
    ...pickRandom(
      byCategory('minion').filter((c) => !lockedSet.has(c.id)),
      base.minion - lockedMinions.length,
      randomFn,
    ),
  ]

  const provisionalIds = [...demons, ...minions].map((c) => c.id)
  const { effective } = applySetupModifiers(provisionalIds, playerCount, scriptId)
  const baronNote = minions.some((c) => c.id === 'baron') ? ' (Baron inclus)' : ''

  const lockedOutsiders = byCategory('outsider').filter((c) => lockedSet.has(c.id))
  if (lockedOutsiders.length > effective.outsider) {
    throw new Error(
      `Trop de Parias verrouillés (${lockedOutsiders.length}) pour ${effective.outsider} emplacement(s)${baronNote}.`,
    )
  }
  const outsiders = [
    ...lockedOutsiders,
    ...pickRandom(
      byCategory('outsider').filter((c) => !lockedSet.has(c.id)),
      effective.outsider - lockedOutsiders.length,
      randomFn,
    ),
  ]

  const lockedTownsfolk = byCategory('townsfolk').filter((c) => lockedSet.has(c.id))
  if (lockedTownsfolk.length > effective.townsfolk) {
    throw new Error(
      `Trop de Villageois verrouillés (${lockedTownsfolk.length}) pour ${effective.townsfolk} emplacement(s)${baronNote}.`,
    )
  }
  const townsfolk = [
    ...lockedTownsfolk,
    ...pickRandom(
      byCategory('townsfolk').filter((c) => !lockedSet.has(c.id)),
      effective.townsfolk - lockedTownsfolk.length,
      randomFn,
    ),
  ]

  const allIds = [...townsfolk, ...outsiders, ...minions, ...demons].map((c) => c.id)
  return validateComposition(allIds, playerCount, scriptId)
}
