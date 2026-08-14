import type { Character, Game, InfoPairPreparation, Player } from '@/types'
import { getCharacterById, getCharactersForScript } from '@/data'
import { calculateChefNumber, calculateClockmakerNumber, calculateEmpathNumber } from './characters'

export type NightType = 'first' | 'other'

export interface NightStep {
  id: string
  kind: 'minion-info' | 'demon-info' | 'character'
  characterId: string | null
  /** Joueurs à réveiller pour cette étape. */
  playerIds: string[]
  title: string
  instruction: string
  /** Information privée déjà calculée par le moteur, à donner au(x) joueur(s). */
  resolvedInfo?: string
  /** true si ce réveil est simulé pour l'Ivrogne (son pouvoir cru ne fonctionne pas réellement). */
  isSimulated?: boolean
  /** true si le joueur est empoisonné : l'information calculée dans `resolvedInfo` est fournie à
   * titre indicatif pour le Conteur, mais NE DOIT PAS être donnée telle quelle au joueur. */
  isPoisoned?: boolean
  /** Étape "Information du Démon" : personnages de bluff à montrer explicitement (ne pas oublier). */
  bluffCharacterIds?: string[]
  /** Voyante : joueur bon qui déclenche toujours une réponse positive, en plus du vrai Démon. */
  redHerringPlayerId?: string
  /** Étape "Information du Démon"/Voyante : identifiant du joueur incarnant le Démon, pour affichage explicite. */
  demonPlayerId?: string
  /** Démon fictif à présenter au Lunatique à la place de son rôle réel. */
  perceivedDemonCharacterId?: string
  /** Contenu à afficher plein écran, tourné vers le joueur — remplace une feuille de référence
   * papier. `pair` : deux joueurs (sans distinction) + le rôle concerné (Lavandière/Libraire/
   * Enquêteur). `number` : un nombre à montrer silencieusement (Chef/Empathique). */
  displayReveal?:
    | { kind: 'pair'; playerAId: string; playerBId: string; characterId: string }
    | { kind: 'number'; value: number }
    | { kind: 'player-role'; playerId: string; characterId: string }
    | { kind: 'players'; playerIds: string[]; title: string }
    | { kind: 'characters'; characterIds: string[]; title: string }
}

interface OrderedStep extends NightStep {
  orderValue: number
}

/** Rôles Trouble Brewing dont l'information donnée doit être fausse (au choix du Conteur) si le
 * joueur est empoisonné, plutôt que la vraie valeur calculée par le moteur. */
const POISON_SENSITIVE_INFO_ROLES = new Set([
  'chef', 'empath', 'washerwoman', 'librarian', 'investigator', 'fortune-teller', 'undertaker',
  'clockmaker', 'chambermaid', 'sage',
])

function isPoisonedPlayer(player: Player): boolean {
  return player.reminders.some((reminder) => reminder.label.startsWith('Empoisonné') || reminder.label.startsWith('Ivre'))
}

function buildPairStep(
  game: Game,
  base: Omit<NightStep, 'resolvedInfo' | 'instruction'>,
  prep: InfoPairPreparation | 'none' | null,
  categoryLabel: string,
): NightStep {
  if (prep === 'none') {
    return { ...base, instruction: `Informez-le qu'aucun ${categoryLabel} n'est en jeu.`, resolvedInfo: `Aucun ${categoryLabel} en jeu.` }
  }
  if (!prep) {
    return {
      ...base,
      instruction: 'Préparation manquante pour ce personnage — retournez à l\'étape de préparation.',
    }
  }
  const playerA = game.players.find((p) => p.id === prep.playerAId)
  const playerB = game.players.find((p) => p.id === prep.playerBId)
  const character = getCharacterById(game.scriptId, prep.characterId)
  return {
    ...base,
    instruction: `Montrez-lui ${playerA?.name ?? '?'} et ${playerB?.name ?? '?'}, ainsi que le rôle : ${character?.nameFr ?? '?'}.`,
    resolvedInfo: `Le ${categoryLabel} réel est ${character?.nameFr ?? '?'}, détenu par ${playerA?.name ?? '?'}.`,
    displayReveal: { kind: 'pair', playerAId: prep.playerAId, playerBId: prep.playerBId, characterId: prep.characterId },
  }
}

function buildCharacterStep(game: Game, character: Character, player: Player): NightStep {
  const step = buildCharacterStepRaw(game, character, player)
  if (POISON_SENSITIVE_INFO_ROLES.has(character.id) && step.resolvedInfo && isPoisonedPlayer(player)) {
    return {
      ...step,
      isPoisoned: true,
      resolvedInfo: `${player.name} est empoisonné(e) : vous êtes libre de donner la réponse de votre choix (vraie, fausse ou approximative). Pour référence (Conteur uniquement) : ${step.resolvedInfo} — quel que soit votre choix, ne laissez rien deviner de l'empoisonnement.`,
      displayReveal: undefined,
    }
  }
  return step
}

function buildCharacterStepRaw(game: Game, character: Character, player: Player): NightStep {
  const base = {
    id: `${character.id}-${player.id}`,
    kind: 'character' as const,
    characterId: character.id,
    playerIds: [player.id],
    title: character.nameFr,
  }

  switch (character.id) {
    case 'clockmaker': {
      const number = calculateClockmakerNumber(game.players)
      return {
        ...base,
        instruction: 'Montrez silencieusement la distance minimale entre le Démon et son Sbire (1 signifie qu’ils sont voisins).',
        resolvedInfo: `Nombre à indiquer : ${number}`,
        displayReveal: { kind: 'number', value: number },
      }
    }
    case 'chef': {
      const number = calculateChefNumber(game.players)
      return {
        ...base,
        instruction: 'Montrez-lui silencieusement le nombre de paires de joueurs méchants assis côte à côte.',
        resolvedInfo: `Nombre à indiquer : ${number}`,
        displayReveal: { kind: 'number', value: number },
      }
    }
    case 'empath': {
      const number = calculateEmpathNumber(game.players, player.id)
      return {
        ...base,
        instruction: 'Montrez-lui silencieusement le nombre de ses voisins vivants méchants.',
        resolvedInfo: `Nombre à indiquer : ${number}`,
        displayReveal: { kind: 'number', value: number },
      }
    }
    case 'washerwoman':
      return buildPairStep(game, base, game.preparation.washerwoman, 'Villageois')
    case 'librarian':
      return buildPairStep(game, base, game.preparation.librarian, 'Paria')
    case 'investigator':
      return buildPairStep(game, base, game.preparation.investigator, 'Sbire')
    case 'fortune-teller': {
      const redHerring = game.players.find((p) => p.id === game.preparation.fortuneTellerRedHerringPlayerId)
      const demonPlayer = game.players.find((p) => p.realCharacterId === 'imp')
      return {
        ...base,
        instruction: 'Demandez-lui de choisir 2 joueurs.',
        resolvedInfo: `Répondez OUI si l'un des deux est le Démon (${demonPlayer?.name ?? '?'}) ou le leurre (${redHerring?.name ?? '?'}), sinon NON.`,
        demonPlayerId: demonPlayer?.id,
        redHerringPlayerId: redHerring?.id,
      }
    }
    case 'undertaker': {
      const executed = game.lastExecutedPlayerId
        ? game.players.find((candidate) => candidate.id === game.lastExecutedPlayerId)
        : undefined
      const executedCharacter = executed?.realCharacterId
        ? getCharacterById(game.scriptId, executed.realCharacterId)
        : undefined
      if (executed) {
        return {
          ...base,
          instruction: `Montrez-lui le rôle réel du joueur exécuté hier : ${executed.name}.`,
          resolvedInfo: `Montrez : ${executedCharacter?.nameFr ?? '?'}.`,
          displayReveal: executedCharacter ? { kind: 'characters', characterIds: [executedCharacter.id], title: 'Le personnage du joueur exécuté' } : undefined,
        }
      }
      return {
        ...base,
        instruction:
          "Si un joueur a été exécuté hier, montrez-lui son personnage réel. Sinon, ne réveillez pas ce joueur.",
      }
    }
    case 'ravenkeeper':
      return {
        ...base,
        instruction:
          "Ne réveiller que s'il vient de mourir cette nuit. Il choisit alors un joueur : révélez-lui son personnage réel.",
      }
    case 'spy':
      return { ...base, instruction: 'Montrez-lui le grimoire (tous les rôles réels, vivants et morts).' }
    case 'grandmother': {
      const revealPlayer = game.players.find((p) => p.id === game.preparation.grandmotherRevealPlayerId)
      if (!revealPlayer) {
        return {
          ...base,
          instruction: 'Préparation manquante pour ce personnage — retournez à l\'étape de préparation.',
        }
      }
      const revealCharacter = revealPlayer.realCharacterId
        ? getCharacterById(game.scriptId, revealPlayer.realCharacterId)
        : undefined
      return {
        ...base,
        instruction: `Montrez-lui ${revealPlayer.name} et son rôle réel.`,
        resolvedInfo: `Joueur montré : ${revealPlayer.name} (${revealCharacter?.nameFr ?? '?'}). Si le Démon le tue plus tard, la Grand-mère mourra aussi — l'appli le fera automatiquement.`,
        displayReveal: revealCharacter ? { kind: 'player-role', playerId: revealPlayer.id, characterId: revealCharacter.id } : undefined,
      }
    }
    case 'godfather': {
      const outsiders = game.players.filter((p) => {
        const c = p.realCharacterId ? getCharacterById(game.scriptId, p.realCharacterId) : undefined
        return c?.category === 'outsider'
      })
      const names = outsiders
        .map((p) => (p.realCharacterId ? getCharacterById(game.scriptId, p.realCharacterId)?.nameFr : undefined))
        .filter((n): n is string => Boolean(n))
      return {
        ...base,
        instruction: 'Indiquez-lui quels Parias sont en jeu (sans révéler qui les possède).',
        resolvedInfo: names.length > 0 ? `Parias en jeu : ${names.join(', ')}.` : 'Aucun Paria en jeu.',
        displayReveal: { kind: 'characters', characterIds: outsiders.flatMap((player) => player.realCharacterId ? [player.realCharacterId] : []), title: 'Parias en jeu' },
      }
    }
    case 'lunatic': {
      const believedDemon = game.preparation.lunaticBelievedDemonId
        ? getCharacterById(game.scriptId, game.preparation.lunaticBelievedDemonId)
        : undefined
      if (believedDemon) {
        return {
          ...base,
          title: believedDemon.nameFr,
          instruction: `Réveillez-le comme ${believedDemon.nameFr}, puis faites-lui effectuer l’action de ce Démon. Ses choix sont simulés : ils n’ont aucun effet réel.`,
          perceivedDemonCharacterId: believedDemon.id,
        }
      }
      return {
        ...base,
        instruction: 'Préparation du Lunatique incomplète : choisissez le Démon qu’il croit être avant de jouer.',
      }
    }
    default:
      return { ...base, instruction: character.shortDescription }
  }
}

/**
 * Génère la liste ordonnée des étapes de nuit pour les personnages
 * effectivement en jeu et vivants, y compris les informations de Sbires/
 * Démon en première nuit et le réveil simulé de l'Ivrogne.
 */
export function generateNightSteps(game: Game, nightType: NightType): NightStep[] {
  const characters = getCharactersForScript(game.scriptId)
  // Un joueur mort garde son ancien `realCharacterId` (killPlayer ne le vide pas) : après un
  // transfert de rôle en cours de partie (starpass du Diablotin, succession de la Confidente...),
  // deux joueurs peuvent momentanément partager le même characterId — l'un mort, l'autre vivant
  // et désormais le vrai titulaire. Il faut donc filtrer sur "vivant" AVANT de chercher une
  // correspondance, jamais prendre le premier joueur trouvé puis vérifier s'il est vivant.
  const findAlivePlayer = (characterId: string) => game.players.find((p) => p.realCharacterId === characterId && p.alive)

  const ordered: OrderedStep[] = []

  // À 5 ou 6 joueurs en Trouble Brewing (Teensyville), les joueurs maléfiques
  // ne reçoivent pas les informations d'équipe et le Démon ne reçoit aucun bluff.
  const isSupportedTeensyville = ['trouble-brewing', 'no-greater-joy'].includes(game.scriptId) && game.players.length <= 6
  if (nightType === 'first' && !isSupportedTeensyville) {
    const demonPlayer = game.players.find((p) => {
      const character = p.realCharacterId ? getCharacterById(game.scriptId, p.realCharacterId) : undefined
      return p.alive && character?.category === 'demon'
    })
    const minionPlayers = game.players.filter((p) => {
      const c = characters.find((ch) => ch.id === p.realCharacterId)
      return c?.category === 'minion' && p.alive
    })

    if (demonPlayer && minionPlayers.length > 0) {
      ordered.push({
        id: 'minion-info',
        kind: 'minion-info',
        characterId: null,
        playerIds: minionPlayers.map((p) => p.id),
        title: 'Information des Sbires',
        instruction: 'Réveillez le ou les Sbires ensemble et indiquez-leur qui est leur Démon.',
        resolvedInfo: `Démon : ${demonPlayer.name}. Autres Sbires : ${minionPlayers.map((p) => p.name).join(', ') || 'aucun'}.`,
        orderValue: -2,
      })
    }

    if (demonPlayer) {
      const lunaticPlayer = game.players.find((player) => player.realCharacterId === 'lunatic')
      const bluffNames = game.preparation.impBluffCharacterIds
        .map((id) => getCharacterById(game.scriptId, id)?.nameFr)
        .filter((n): n is string => Boolean(n))
        .join(', ')
      ordered.push({
        id: 'demon-info',
        kind: 'demon-info',
        characterId: null,
        playerIds: [demonPlayer.id],
        title: 'Information du Démon',
        instruction: 'Réveillez le Démon. Montrez-lui ses Sbires ET ses 3 bluffs (personnages absents) — ne l\'oubliez pas.',
        resolvedInfo: `Sbires : ${minionPlayers.map((p) => p.name).join(', ') || 'aucun'}.${lunaticPlayer ? ` Lunatique : ${lunaticPlayer.name}.` : ''} Bluffs : ${bluffNames || 'non définis'}.`,
        bluffCharacterIds: game.preparation.impBluffCharacterIds,
        demonPlayerId: demonPlayer.id,
        orderValue: -1,
      })
    }
  }

  for (const character of characters) {
    const order = nightType === 'first' ? character.firstNightOrder : character.otherNightOrder
    if (order === null) continue
    if (character.id === 'undertaker' && !game.lastExecutedPlayerId) continue
    const player = findAlivePlayer(character.id)
    if (!player) continue
    // Pouvoir "une fois par partie" (Professeur, Assassin, Courtisane...) déjà utilisé cette
    // partie : ne plus réveiller ce joueur, il n'y a plus rien à faire pour lui.
    if (character.actionFrequency === 'once-per-game' && player.notes.some((note) => note.text.includes(`[BMR:${character.id}]`))) continue
    if (nightType === 'first' && character.id === 'lunatic') {
      const believedDemon = game.preparation.lunaticBelievedDemonId
        ? getCharacterById(game.scriptId, game.preparation.lunaticBelievedDemonId)
        : undefined
      const falseMinions = (game.preparation.lunaticMinionPlayerIds ?? [])
        .map((id) => game.players.find((candidate) => candidate.id === id)?.name)
        .filter((name): name is string => Boolean(name))
      const bluffIds = game.preparation.lunaticBluffCharacterIds ?? []
      const bluffNames = bluffIds
        .map((id) => getCharacterById(game.scriptId, id)?.nameFr)
        .filter((name): name is string => Boolean(name))
      const configured = believedDemon && falseMinions.length > 0 && bluffNames.length === 3
      ordered.push({
        id: `lunatic-wake-${player.id}`,
        kind: 'character',
        characterId: 'lunatic',
        playerIds: [player.id],
        title: 'Réveil du Lunatique',
        instruction: believedDemon
          ? `Réveillez ${player.name}. Présentez-le comme ${believedDemon.nameFr}, sans jamais mentionner le Lunatique.`
          : 'Préparation du Lunatique incomplète : choisissez d’abord le Démon qu’il croit être.',
        orderValue: order,
      })
      ordered.push({
        id: `lunatic-info-${player.id}`,
        kind: 'demon-info',
        characterId: null,
        playerIds: [player.id],
        title: 'Information du Démon',
        instruction: configured
          ? 'Réveillez le Démon. Montrez-lui ses Sbires ET ses 3 bluffs (personnages absents) — ne l’oubliez pas.'
          : 'Préparation du Démon incomplète — retournez à la préparation avant de continuer.',
        resolvedInfo: configured
          ? `Sbires : ${falseMinions.join(', ')}. Bluffs : ${bluffNames.join(', ')}.`
          : undefined,
        bluffCharacterIds: bluffIds,
        demonPlayerId: player.id,
        perceivedDemonCharacterId: believedDemon?.id,
        orderValue: order + 0.01,
      })
      continue
    }
    ordered.push({ ...buildCharacterStep(game, character, player), orderValue: order })
    if (nightType === 'other' && character.id === 'lunatic') {
      const demonPlayer = game.players.find((candidate) => {
        const candidateCharacter = candidate.realCharacterId ? getCharacterById(game.scriptId, candidate.realCharacterId) : undefined
        return candidate.alive && candidateCharacter?.category === 'demon'
      })
      const targetIds = game.lunaticTargetIds ?? []
      if (demonPlayer && targetIds.length > 0) {
        const names = targetIds
          .map((id) => game.players.find((candidate) => candidate.id === id)?.name)
          .filter((name): name is string => Boolean(name))
        ordered.push({
          id: `lunatic-targets-${demonPlayer.id}`,
          // Étape purement informative : characterId reste null (contrairement au vrai réveil du
          // Démon juste après) pour que l'assistant de nuit n'affiche pas aussi le sélecteur de
          // cible d'action ici — sinon le Conteur le voit une fois en trop, sur cette étape ET sur
          // celle du Démon qui suit.
          kind: 'demon-info',
          characterId: null,
          playerIds: [demonPlayer.id],
          title: 'Information du Démon',
          instruction: `Montrez au Démon les choix effectués cette nuit par le Lunatique (${player.name}).`,
          resolvedInfo: `Le Lunatique a choisi : ${names.join(', ')}.`,
          displayReveal: { kind: 'players', playerIds: targetIds, title: 'Les choix du Lunatique' },
          // Après l'Exorciste (8), mais avant les Démons (à partir de 9) : le Démon
          // doit déjà savoir s'il a été exorcisé avant de recevoir les choix du Lunatique.
          orderValue: 8.5,
        })
      }
    }
  }

  if (nightType === 'other' && game.gossipKillDue) {
    ordered.push({
      id: 'gossip-kill', kind: 'character', characterId: 'gossip', playerIds: [],
      title: 'Pipelette — mort', instruction: 'La déclaration de la Pipelette était vraie : choisissez maintenant un joueur qui meurt.',
      orderValue: 16,
    })
  }
  if (nightType === 'other' && game.moonchildTargetId) {
    ordered.push({
      id: 'moonchild-death', kind: 'character', characterId: 'moonchild', playerIds: [],
      title: 'Moonchild — résolution', instruction: 'Vérifiez l’alignement de la cible au moment de son choix : si elle est gentille, elle meurt.',
      orderValue: 18,
    })
  }

  const drunkPlayer = findAlivePlayer('drunk')
  const believedId = game.preparation.drunkBelievedCharacterId
  if (drunkPlayer && believedId) {
    const believedCharacter = getCharacterById(game.scriptId, believedId)
    const order = believedCharacter
      ? nightType === 'first'
        ? believedCharacter.firstNightOrder
        : believedCharacter.otherNightOrder
      : null
    if (believedCharacter && order !== null) {
      ordered.push({
        id: `drunk-simulated-${believedId}`,
        kind: 'character',
        characterId: believedId,
        playerIds: [drunkPlayer.id],
        title: `${believedCharacter.nameFr} (simulé — Ivrogne)`,
        instruction: `Simulez le réveil comme si ${drunkPlayer.name} possédait ce pouvoir. Il ne fonctionne pas réellement : donnez une information libre, vraie ou fausse, sans le révéler.`,
        isSimulated: true,
        orderValue: order,
      })
    }
  }

  return ordered.sort((a, b) => a.orderValue - b.orderValue).map(({ orderValue: _orderValue, ...step }) => step)
}
