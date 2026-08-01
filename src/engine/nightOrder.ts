import type { Character, Game, InfoPairPreparation, Player } from '@/types'
import { getCharacterById, getCharactersForScript } from '@/data'
import { calculateChefNumber, calculateEmpathNumber } from './characters'

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
  /** Étape "Information du Démon" : personnages de bluff à montrer explicitement (ne pas oublier). */
  bluffCharacterIds?: string[]
  /** Voyante : joueur bon qui déclenche toujours une réponse positive, en plus du vrai Démon. */
  redHerringPlayerId?: string
  /** Étape "Information du Démon"/Voyante : identifiant du joueur incarnant le Démon, pour affichage explicite. */
  demonPlayerId?: string
  /** Contenu à afficher plein écran, tourné vers le joueur — remplace une feuille de référence
   * papier. `pair` : deux joueurs (sans distinction) + le rôle concerné (Lavandière/Libraire/
   * Enquêteur). `number` : un nombre à montrer silencieusement (Chef/Empathique). */
  displayReveal?: { kind: 'pair'; playerAId: string; playerBId: string; characterId: string } | { kind: 'number'; value: number }
}

interface OrderedStep extends NightStep {
  orderValue: number
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
  const base = {
    id: `${character.id}-${player.id}`,
    kind: 'character' as const,
    characterId: character.id,
    playerIds: [player.id],
    title: character.nameFr,
  }

  switch (character.id) {
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
  const findPlayer = (characterId: string) => game.players.find((p) => p.realCharacterId === characterId)
  const findAlivePlayer = (characterId: string) => {
    const player = findPlayer(characterId)
    return player?.alive ? player : undefined
  }

  const ordered: OrderedStep[] = []

  if (nightType === 'first') {
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
        resolvedInfo: `Sbires : ${minionPlayers.map((p) => p.name).join(', ') || 'aucun'}. Bluffs : ${bluffNames || 'non définis'}.`,
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
    ordered.push({ ...buildCharacterStep(game, character, player), orderValue: order })
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
