import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  Character,
  Composition,
  Game,
  GameEndInfo,
  GameEvent,
  GameEventType,
  GamePhase,
  Player,
  PlayerNote,
  Preparation,
  StorytellerLevel,
} from '@/types'
import { getCharacterById } from '@/data'
import {
  createEvent,
  generateLayoutPositions,
  getLivingNeighbors,
  recomputeSeatOrderFromPositions,
  undoLastEvent,
  type LayoutPresetId,
} from '@/engine'

type DeathCause = 'night' | 'execution'

interface DeathResolution {
  player: Player
  outcome: 'dead' | 'prevented' | 'survived'
  reason: string
}

/** Un rappel "Ivre (...)" posé par l'une des capacités qui rendent quelqu'un ivre. */
function isDrunkFrom(player: Player, sourceCharacterId: string): boolean {
  return player.reminders.some((r) => r.sourceCharacterId === sourceCharacterId && r.label.startsWith('Ivre'))
}

function isPlayerDrunk(player: Player): boolean {
  return ['courtier', 'sailor', 'innkeeper', 'goon', 'minstrel'].some((source) => isDrunkFrom(player, source))
    || player.reminders.some((reminder) => reminder.label.startsWith('Empoisonné'))
}

/**
 * Résout la mort d'un joueur en tenant compte de toutes les protections/immunités suivies par
 * l'application (Bad Moon Rising V3 — voir la feuille de référence de l'utilisateur) : Aubergiste/
 * Moine (nuit uniquement), Marin (nuit, seulement s'il est resté sobre), Herboriste (nuit ET
 * exécution, voisins vivants les plus proches, tant qu'ils sont gentils), Avocat du diable et
 * Pacifiste (exécution uniquement), puis les immunités à usage unique Bouffon et Zombuul.
 * `ignoreProtection` (Assassin) court-circuite tout sauf rien : la mort est toujours appliquée.
 */
function resolvePlayerDeathDetailed(
  player: Player,
  allPlayers: Player[],
  source: Character | undefined,
  cause: DeathCause,
  ignoreProtection: boolean,
): DeathResolution {
  if (!player.alive) return { player, outcome: 'prevented', reason: 'était déjà mort(e)' }
  if (ignoreProtection) return { player: { ...player, alive: false }, outcome: 'dead', reason: 'Assassin : les protections sont ignorées' }

  if (cause === 'night') {
    const protectedByInnkeeper = player.reminders.some(
      (r) => r.sourceCharacterId === 'innkeeper' && r.label.startsWith('Protégé'),
    )
    const protectedByMonk = source?.category === 'demon' && player.reminders.some((r) => r.sourceCharacterId === 'monk')
    const sailorImmune = player.realCharacterId === 'sailor' && !isPlayerDrunk(player)
    const soldierImmune = player.realCharacterId === 'soldier' && source?.category === 'demon' && !isPlayerDrunk(player)
    if (protectedByInnkeeper) return { player, outcome: 'prevented', reason: 'protégé(e) par l’Aubergiste' }
    if (protectedByMonk) return { player, outcome: 'prevented', reason: 'protégé(e) par le Moine' }
    if (sailorImmune) return { player, outcome: 'prevented', reason: 'Marin sobre : il est immortel cette nuit' }
    if (soldierImmune) return { player, outcome: 'prevented', reason: 'Soldat : immunisé contre le Démon' }
  }

  if (cause === 'execution') {
    const advocateProtected = player.reminders.some((r) => r.sourceCharacterId === 'devils-advocate')
    const pacifistProtected = player.reminders.some((r) => r.sourceCharacterId === 'pacifist')
    if (advocateProtected) return { player, outcome: 'prevented', reason: 'protégé(e) par l’Avocat du diable' }
    if (pacifistProtected) return { player, outcome: 'prevented', reason: 'sauvé(e) par le Pacifiste' }
  }

  const teaLady = allPlayers.find((p) => p.alive && p.realCharacterId === 'tea-lady' && !isPlayerDrunk(p))
  if (teaLady && player.alignment === 'good') {
    const neighbors = getLivingNeighbors(allPlayers, teaLady.id)
    if (neighbors.left?.id === player.id || neighbors.right?.id === player.id) {
      return { player, outcome: 'prevented', reason: 'protégé(e) par l’Herboriste (voisin gentil)' }
    }
  }

  const foolUsed = player.reminders.some((r) => r.sourceCharacterId === 'fool')
  if (player.realCharacterId === 'fool' && !foolUsed && !isPlayerDrunk(player)) {
    return {
      outcome: 'survived', reason: 'Bouffon : sa première vie est consommée', player: {
      ...player,
      reminders: [
        ...player.reminders,
        { id: nanoid(), label: 'Vie du Bouffon consommée', sourceCharacterId: 'fool', createdAt: new Date().toISOString() },
      ],
    }}
  }

  const zombuulUsed = player.reminders.some((r) => r.sourceCharacterId === 'zombuul')
  if (player.realCharacterId === 'zombuul' && !zombuulUsed) {
    return {
      outcome: 'survived', reason: 'Zombuul : paraît mort(e), mais reste vivant(e)', player: {
      ...player,
      reminders: [
        ...player.reminders,
        { id: nanoid(), label: 'Mort vivant', sourceCharacterId: 'zombuul', createdAt: new Date().toISOString() },
      ],
    }}
  }

  return { player: { ...player, alive: false }, outcome: 'dead', reason: source ? `tué(e) par ${source.nameFr}` : 'meurt' }
}

function resolvePlayerDeath(player: Player, allPlayers: Player[], source: Character | undefined, cause: DeathCause, ignoreProtection: boolean): Player {
  return resolvePlayerDeathDetailed(player, allPlayers, source, cause, ignoreProtection).player
}

/**
 * Confidente (Trouble Brewing) : si le Démon vient de mourir (quelle qu'en soit la cause) et
 * qu'il reste au moins 5 joueurs vivants, la Confidente vivante devient immédiatement le nouveau
 * Démon — jamais annoncé publiquement. `beforePlayers`/`afterPlayers` doivent correspondre au
 * même instant (juste avant/après la résolution de la mort qui vient d'être appliquée).
 */
function applyScarletWomanSuccession(scriptId: Game['scriptId'], beforePlayers: Player[], afterPlayers: Player[]): Player[] {
  const diedDemon = beforePlayers.find((before) => {
    if (!before.alive) return false
    const after = afterPlayers.find((p) => p.id === before.id)
    if (!after || after.alive) return false
    const character = before.realCharacterId ? getCharacterById(scriptId, before.realCharacterId) : undefined
    return character?.category === 'demon'
  })
  if (!diedDemon?.realCharacterId) return afterPlayers

  const livingCount = afterPlayers.filter((p) => p.alive).length
  const scarletWoman = afterPlayers.find((p) => p.alive && p.realCharacterId === 'scarlet-woman')
  if (!scarletWoman || livingCount < 5) return afterPlayers

  return afterPlayers.map((p) =>
    p.id === scarletWoman.id
      ? {
          ...p,
          realCharacterId: diedDemon.realCharacterId,
          alignment: 'evil',
          notes: [
            ...p.notes,
            {
              id: nanoid(),
              text: `Confidente : devient le nouveau Démon (${diedDemon.realCharacterId}) après la mort de ${diedDemon.name}.`,
              category: 'information' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      : p,
  )
}
import { createEmptyPreparation, createPlayer } from '@/lib/factories'
import {
  type SaveIndexEntry,
  deleteGameFromStorage,
  exportGameToJson,
  importGameFromJson,
  loadGameFromStorage,
  loadIndex,
  saveGameToStorage,
} from './persistence'

interface CommitOptions {
  actorId?: string
  targetIds?: string[]
  payload?: Record<string, unknown>
}

interface GameStore {
  game: Game | null
  history: GameEvent[]
  savedGames: SaveIndexEntry[]
  canUndo: boolean

  refreshSavedGames: () => void
  createGame: (scriptId?: Game['scriptId']) => void
  /** Démarre une nouvelle partie en réutilisant les joueurs (noms + disposition sur la carte)
   * de la partie courante — pratique pour enchaîner plusieurs parties avec le même groupe
   * installé de la même façon à table, sans tout re-saisir. Repart directement sur le choix de
   * la composition (l'étape des joueurs est déjà faite). */
  restartWithSamePlayers: () => void
  loadGame: (id: string) => void
  closeGame: () => void
  deleteGame: (id: string) => void
  exportCurrentGame: () => string | null
  importGame: (json: string) => void

  setPlayers: (players: Player[]) => void
  /**
   * Valide en un seul coup les positions libres de tous les joueurs sur la
   * carte du grimoire et recalcule l'ordre logique des sièges (voisins) à
   * partir de ces positions finales. Le déplacement visuel lui-même reste
   * entièrement local à l'écran (voir SeatingLayout) tant que cette action
   * n'est pas appelée : la "chaîne" de voisinage n'est donc établie qu'au
   * moment de la validation, pas à chaque glisser — pour un déplacement
   * fluide, sans aller-retour avec le store ni écriture disque à chaque geste.
   */
  setAllPlayerPositions: (positions: { playerId: string; mapX: number; mapY: number }[]) => void
  /** Applique une disposition prédéfinie (cercle, deux rangées, diagonale...) à tous les joueurs en un coup, en conservant leur ordre de sièges actuel. */
  applyLayoutPreset: (presetId: LayoutPresetId) => void
  setComposition: (composition: Composition | null) => void
  setStorytellerLevel: (level: StorytellerLevel) => void
  setPhase: (phase: GamePhase) => void
  assignCharacters: (assignments: Record<string, string>) => void
  setPreparation: (partial: Partial<Preparation>) => void
  completeNight: () => void
  startNextNight: () => void

  /** Applique le résultat de l'exécution du jour (décidée verbalement à table) : tue le joueur
   * donné, ou ne fait rien si personne n'a été exécuté. */
  resolveExecution: (executedPlayerId: string | null) => void
  /** Résout des morts nocturnes en tenant compte des protections et immunités suivies par l'application. */
  resolveNightDeaths: (playerIds: string[], sourceCharacterId: string, ignoreProtection?: boolean) => void
  /** Confirme la fin de partie avec le vainqueur retenu par le Conteur. */
  endGame: (info: Pick<GameEndInfo, 'winner' | 'reason'>) => void

  killPlayer: (playerId: string) => void
  /** Déclare un joueur mort manuellement depuis le grimoire (ex. tir du Mercenaire visant le
   * Démon en journée, ou toute autre mort non couverte par les flux guidés d'exécution/de nuit).
   * Applique la succession de la Confidente si c'est le Démon qui vient de mourir. */
  declareDeath: (playerId: string) => void
  revivePlayer: (playerId: string) => void
  toggleGhostVote: (playerId: string) => void
  setPlayerCharacter: (playerId: string, characterId: string) => void
  /** Bad Moon Rising — Bras droit : change l'alignement réel d'un joueur (indépendamment de son personnage). */
  setPlayerAlignment: (playerId: string, alignment: Player['alignment']) => void
  /** Bad Moon Rising — Po : force (ou lève) l'obligation de tuer 3 joueurs au prochain réveil. */
  setPoMustKillThree: (value: boolean) => void
  /** Bad Moon Rising — Courtisane : programme l'expiration automatique du rappel "Ivre" qu'elle a posé. */
  setCourtierExpiry: (night: number | null) => void
  setGodfatherOutsiderDelta: (value: -1 | 0 | 1) => void
  setLastExorcistTarget: (playerId: string | null) => void
  setLastDevilsAdvocateTarget: (playerId: string | null) => void
  setLunaticTargets: (playerIds: string[]) => void
  setGodfatherKillDue: (value: boolean) => void
  setShabalothVictims: (playerIds: string[]) => void
  setGossipKillDue: (value: boolean) => void
  setMoonchildTarget: (playerId: string | null, wasGood?: boolean | null) => void
  addReminder: (playerId: string, label: string, sourceCharacterId: string) => void
  removeReminder: (playerId: string, reminderId: string) => void
  /** Retire tout rappel précédemment posé par ce personnage (sur tous les joueurs) puis en pose un nouveau sur la cible — utile pour les pouvoirs qui ne durent qu'une nuit (Empoisonneur, Moine, Majordome...). */
  applyNightlyReminder: (sourceCharacterId: string, label: string, targetPlayerId: string) => void
  addNote: (playerId: string, text: string, category?: PlayerNote['category']) => void
  removeNote: (playerId: string, noteId: string) => void

  undo: () => void
  /** Vide l'historique (perte définitive de la capacité d'annuler) sans toucher à l'état actuel de la partie. */
  clearHistory: () => void
  /** Annule en un clic toute la nuit en cours (quel que soit le nombre d'actions déjà enregistrées) et revient à l'état d'avant le début de cette nuit. */
  cancelNight: () => void
}

export const useGameStore = create<GameStore>((set, get) => {
  function commit(type: GameEventType, mutate: (game: Game) => Game, options: CommitOptions = {}): void {
    const current = get().game
    if (!current) return
    const previousState = current
    const resultingState: Game = { ...mutate(current), updatedAt: new Date().toISOString() }
    const event = createEvent(type, previousState, resultingState, options)
    const history = [...get().history, event]
    set({ game: resultingState, history, canUndo: history.length > 0 })
    saveGameToStorage(resultingState, history)
    get().refreshSavedGames()
  }

  function updatePlayer(playerId: string, updater: (player: Player) => Player, options: CommitOptions = {}): void {
    commit(
      'player.updated',
      (g) => ({ ...g, players: g.players.map((p) => (p.id === playerId ? updater(p) : p)) }),
      options,
    )
  }

  function buildFreshGame(phase: GamePhase, players: Player[], scriptId: Game['scriptId'] = 'trouble-brewing'): Game {
    const now = new Date().toISOString()
    return {
      id: nanoid(),
      scriptId,
      phase,
      storytellerLevel: 'beginner',
      dayNumber: 0,
      nightNumber: 0,
      players,
      composition: null,
      preparation: createEmptyPreparation(),
      activeDemonId: null,
      lastExecutedPlayerId: null,
      mastermindExtraDayDueOnDay: null,
      poMustKillThree: false,
      courtierExpiresOnNight: null,
      godfatherOutsiderDelta: 0,
      lastExorcistTargetId: null,
      lastDevilsAdvocateTargetId: null,
      lunaticTargetIds: [],
      minstrelExpiresOnNight: null,
      godfatherKillDue: false,
      shabalothVictimIds: [],
      gossipKillDue: false,
      moonchildTargetId: null,
      moonchildTargetWasGood: null,
      nightLog: [],
      gameNotes: [],
      publicScreenActive: false,
      end: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  return {
    game: null,
    history: [],
    savedGames: loadIndex(),
    canUndo: false,

    refreshSavedGames: () => set({ savedGames: loadIndex() }),

    createGame: (scriptId = 'trouble-brewing') => {
      const game = buildFreshGame('setup.players', [], scriptId)
      set({ game, history: [], canUndo: false })
      saveGameToStorage(game, [])
      get().refreshSavedGames()
    },

    restartWithSamePlayers: () => {
      const current = get().game
      if (!current) return
      const reusedPlayers = [...current.players]
        .sort((a, b) => a.seat - b.seat)
        .map((p) => {
          const fresh = createPlayer(p.name, p.seat)
          return { ...fresh, mapX: p.mapX, mapY: p.mapY }
        })
      const game = buildFreshGame('setup.composition', reusedPlayers, current.scriptId)
      set({ game, history: [], canUndo: false })
      saveGameToStorage(game, [])
      get().refreshSavedGames()
    },

    loadGame: (id) => {
      const persisted = loadGameFromStorage(id)
      if (!persisted) return
      set({ game: persisted.game, history: persisted.history, canUndo: persisted.history.length > 0 })
    },

    /** Retourne à l'accueil sans supprimer la sauvegarde : la partie reste reprenable. */
    closeGame: () => set({ game: null, history: [], canUndo: false }),

    deleteGame: (id) => {
      deleteGameFromStorage(id)
      const current = get().game
      if (current?.id === id) set({ game: null, history: [], canUndo: false })
      get().refreshSavedGames()
    },

    exportCurrentGame: () => {
      const { game, history } = get()
      if (!game) return null
      return exportGameToJson(game, history)
    },

    importGame: (json) => {
      const persisted = importGameFromJson(json)
      set({ game: persisted.game, history: persisted.history, canUndo: persisted.history.length > 0 })
      saveGameToStorage(persisted.game, persisted.history)
      get().refreshSavedGames()
    },

    setPlayers: (players) => commit('players.updated', (g) => ({ ...g, players })),

    setAllPlayerPositions: (positions) =>
      commit(
        'players.updated',
        (g) => {
          const positionByPlayerId = new Map(positions.map((p) => [p.playerId, p]))
          const updated = g.players.map((p) => {
            const pos = positionByPlayerId.get(p.id)
            return pos ? { ...p, mapX: pos.mapX, mapY: pos.mapY } : p
          })
          return { ...g, players: recomputeSeatOrderFromPositions(updated) }
        },
        { targetIds: positions.map((p) => p.playerId) },
      ),

    applyLayoutPreset: (presetId) =>
      commit('players.updated', (g) => {
        const ordered = [...g.players].sort((a, b) => a.seat - b.seat)
        const positions = generateLayoutPositions(presetId, ordered.length)
        const positionByPlayerId = new Map(ordered.map((p, index) => [p.id, positions[index]]))
        const updated = g.players.map((p) => {
          const pos = positionByPlayerId.get(p.id)
          return pos ? { ...p, mapX: pos.x, mapY: pos.y } : p
        })
        return { ...g, players: recomputeSeatOrderFromPositions(updated) }
      }),

    setComposition: (composition) => commit('composition.set', (g) => ({ ...g, composition })),

    setStorytellerLevel: (level) => commit('settings.updated', (g) => ({ ...g, storytellerLevel: level })),

    setPhase: (phase) => commit('phase.changed', (g) => ({ ...g, phase })),

    assignCharacters: (assignments) =>
      commit('characters.assigned', (g) => ({
        ...g,
        players: g.players.map((p) => {
          const characterId = assignments[p.id]
          if (!characterId) return p
          const character = getCharacterById(g.scriptId, characterId)
          return {
            ...p,
            realCharacterId: characterId,
            alignment: character?.team ?? p.alignment,
          }
        }),
      })),

    setPreparation: (partial) =>
      commit('preparation.updated', (g) => {
        const preparation = { ...g.preparation, ...partial }
        // L'Ivrogne et le Lunatique doivent voir leur identité fictive à la révélation.
        let players = g.players
        if ('drunkBelievedCharacterId' in partial) {
          players = players.map((p) =>
            p.realCharacterId === 'drunk'
              ? { ...p, perceivedCharacterId: preparation.drunkBelievedCharacterId }
              : p,
          )
        }
        if ('lunaticBelievedDemonId' in partial) {
          players = players.map((p) =>
            p.realCharacterId === 'lunatic'
              ? { ...p, perceivedCharacterId: preparation.lunaticBelievedDemonId }
              : p,
          )
        }
        return { ...g, preparation, players }
      }),

    /** Termine la nuit en cours (première ou suivante) et fait passer au jour. */
    completeNight: () =>
      commit('phase.changed', (g) => {
        const isFirst = g.phase === 'night.first'
        return {
          ...g,
          phase: 'day.discussion',
          dayNumber: isFirst ? 1 : g.dayNumber + 1,
          nightNumber: isFirst ? 1 : g.nightNumber,
          // Ces effets ne valent que jusqu'à l'aube : ne jamais laisser un vieux rappel
          // protéger/saouler un joueur lors d'une nuit suivante.
          players: g.players.map((player) => ({
            ...player,
            reminders: player.reminders.filter(
              (reminder) => {
                if (['monk', 'sailor', 'exorcist'].includes(reminder.sourceCharacterId)) return false
                // L'Aubergiste protège uniquement pendant la nuit, mais l'ivresse reste
                // jusqu'au prochain crépuscule (début de la nuit suivante).
                return !(reminder.sourceCharacterId === 'innkeeper' && reminder.label.startsWith('Protégé'))
              },
            ),
          })),
        }
      }),

    /** Démarre la nuit suivante depuis la phase de jour. */
    startNextNight: () =>
      commit('phase.changed', (g) => {
        const nightNumber = g.nightNumber + 1
        const courtierExpired = g.courtierExpiresOnNight !== null && g.courtierExpiresOnNight !== undefined && nightNumber > g.courtierExpiresOnNight
        const minstrelExpired = g.minstrelExpiresOnNight !== null && g.minstrelExpiresOnNight !== undefined && nightNumber > g.minstrelExpiresOnNight
        return {
          ...g,
          phase: 'night.other',
          nightNumber,
          lunaticTargetIds: [],
          nightLog: [],
          courtierExpiresOnNight: courtierExpired ? null : g.courtierExpiresOnNight,
          minstrelExpiresOnNight: minstrelExpired ? null : g.minstrelExpiresOnNight,
          players: g.players.map((player) => ({
            ...player,
            // Effets valables "jusqu'au prochain crépuscule" (début de la nuit suivante) :
            // Avocat du diable, Bras droit (marqueur ivre + marqueur "déjà ciblé cette nuit"),
            // et la Courtisane si ses 3 nuits/3 jours sont écoulés.
            reminders: player.reminders.filter((reminder) => {
              if (reminder.sourceCharacterId === 'devils-advocate') return false
              if (reminder.sourceCharacterId === 'goon' || reminder.sourceCharacterId === 'goon-flip') return false
              if (reminder.sourceCharacterId === 'innkeeper' && reminder.label.startsWith('Ivre')) return false
              if (minstrelExpired && reminder.sourceCharacterId === 'minstrel') return false
              if (courtierExpired && reminder.sourceCharacterId === 'courtier') return false
              return true
            }),
          })),
        }
      }),

    resolveExecution: (executedPlayerId) =>
      commit(
        'execution.resolved',
        (g) => {
          if (!executedPlayerId) return { ...g, lastExecutedPlayerId: null }
          const executedBefore = g.players.find((p) => p.id === executedPlayerId)
          const executedCharacter = executedBefore?.realCharacterId
            ? getCharacterById(g.scriptId, executedBefore.realCharacterId)
            : undefined
          const isDemonExecution = executedCharacter?.category === 'demon'
          const mastermindAlive = g.players.some(
            (p) => p.alive && p.id !== executedPlayerId && p.realCharacterId === 'mastermind',
          )
          let players = g.players.map((p) =>
            p.id === executedPlayerId ? resolvePlayerDeath(p, g.players, executedCharacter, 'execution', false) : p,
          )
          const executedDied = players.find((p) => p.id === executedPlayerId)?.alive === false
          const minstrelAlive = g.players.some((p) => p.alive && p.realCharacterId === 'minstrel' && !isPlayerDrunk(p))
          if (executedDied && executedCharacter?.category === 'minion' && minstrelAlive) {
            players = players.map((p) => p.id === executedPlayerId ? p : {
              ...p,
              reminders: [...p.reminders, { id: nanoid(), label: 'Ivre (Ménestrel)', sourceCharacterId: 'minstrel', createdAt: new Date().toISOString() }],
            })
          }
          const godfatherKillDue = executedDied && executedCharacter?.category === 'outsider'
            ? true
            : g.godfatherKillDue
          players = applyScarletWomanSuccession(g.scriptId, g.players, players)
          return {
            ...g,
            lastExecutedPlayerId: executedPlayerId,
            mastermindExtraDayDueOnDay:
              isDemonExecution && mastermindAlive ? g.dayNumber + 1 : g.mastermindExtraDayDueOnDay,
            godfatherKillDue,
            minstrelExpiresOnNight: executedDied && executedCharacter?.category === 'minion' && minstrelAlive
              ? g.nightNumber + 1
              : g.minstrelExpiresOnNight,
            players,
          }
        },
        { targetIds: executedPlayerId ? [executedPlayerId] : [] },
      ),

    resolveNightDeaths: (playerIds, sourceCharacterId, ignoreProtection = false) =>
      commit(
        'player.updated',
        (g) => {
          const source = getCharacterById(g.scriptId, sourceCharacterId)
          const sourcePlayer = g.players.find((player) => player.realCharacterId === sourceCharacterId)
          const sourceName = sourcePlayer && source ? `${sourcePlayer.name} (${source.nameFr})` : (source?.nameFr ?? sourceCharacterId)
          const targets = new Set(playerIds)
          const resolutions = g.players
            .filter((player) => targets.has(player.id))
            .map((player) => ({ player, resolution: resolvePlayerDeathDetailed(player, g.players, source, 'night', ignoreProtection) }))
          let players = g.players.map((player) => resolutions.find((entry) => entry.player.id === player.id)?.resolution.player ?? player)
          const nightLog = [...(g.nightLog ?? []), ...resolutions.map(({ player, resolution }) => ({
            sourceCharacterId,
            sourceName,
            targetName: player.name,
            outcome: resolution.outcome,
            reason: resolution.reason,
          }))]
          // Grand-mère : si le Démon tue le joueur qu'elle a vu en première nuit, elle meurt aussi.
          const linkedId = g.preparation.grandmotherRevealPlayerId
          if (source?.category === 'demon' && linkedId && targets.has(linkedId)) {
            const linkedDied = players.find((p) => p.id === linkedId)?.alive === false
            if (linkedDied) {
              const grandmother = players.find((p) => p.alive && p.realCharacterId === 'grandmother')
              if (grandmother) {
                const grandmotherCharacter = getCharacterById(g.scriptId, 'grandmother')
                const resolution = resolvePlayerDeathDetailed(grandmother, players, grandmotherCharacter, 'night', false)
                players = players.map((p) => p.id === grandmother.id ? resolution.player : p)
                nightLog.push({
                  sourceCharacterId: 'grandmother', sourceName: 'Grand-mère', targetName: grandmother.name,
                  outcome: resolution.outcome, reason: `meurt car le Démon a tué son petit-fils (${resolution.reason})`,
                })
              }
            }
          }
          const beforeSuccession = players
          players = applyScarletWomanSuccession(g.scriptId, g.players, players)
          if (players !== beforeSuccession) {
            const newDemon = players.find((p) => p.realCharacterId && p.notes.some((note) => note.text.startsWith('Confidente : devient')))
            if (newDemon) {
              nightLog.push({
                sourceCharacterId: 'scarlet-woman', sourceName: 'Confidente', targetName: newDemon.name,
                outcome: 'survived', reason: 'devient le nouveau Démon suite à la mort de l’ancien',
              })
            }
          }
          return { ...g, players, nightLog }
        },
        { targetIds: playerIds, payload: { sourceCharacterId, ignoreProtection } },
      ),

    endGame: (info) =>
      commit('game.ended', (g) => ({
        ...g,
        phase: 'game.ended',
        end: { ...info, confirmedAt: new Date().toISOString() },
      })),

    killPlayer: (playerId) => updatePlayer(playerId, (p) => ({ ...p, alive: false }), { targetIds: [playerId] }),

    declareDeath: (playerId) =>
      commit('player.updated', (g) => {
        const beforePlayers = g.players
        const afterPlayers = g.players.map((p) => (p.id === playerId ? { ...p, alive: false } : p))
        return { ...g, players: applyScarletWomanSuccession(g.scriptId, beforePlayers, afterPlayers) }
      }, { targetIds: [playerId] }),

    revivePlayer: (playerId) => updatePlayer(playerId, (p) => ({ ...p, alive: true }), { targetIds: [playerId] }),

    toggleGhostVote: (playerId) =>
      updatePlayer(playerId, (p) => ({ ...p, ghostVoteAvailable: !p.ghostVoteAvailable }), {
        targetIds: [playerId],
      }),

    setPlayerCharacter: (playerId, characterId) =>
      commit(
        'player.updated',
        (g) => ({
          ...g,
          players: g.players.map((p) => {
            if (p.id !== playerId) return p
            const character = getCharacterById(g.scriptId, characterId)
            return { ...p, realCharacterId: characterId, alignment: character?.team ?? p.alignment }
          }),
        }),
        { targetIds: [playerId] },
      ),

    setPlayerAlignment: (playerId, alignment) =>
      updatePlayer(playerId, (p) => ({ ...p, alignment }), { targetIds: [playerId], payload: { alignment } }),

    setPoMustKillThree: (value) => commit('player.updated', (g) => ({ ...g, poMustKillThree: value })),

    setCourtierExpiry: (night) => commit('player.updated', (g) => ({ ...g, courtierExpiresOnNight: night })),

    setGodfatherOutsiderDelta: (value) => commit('composition.set', (g) => ({ ...g, godfatherOutsiderDelta: value })),
    setLastExorcistTarget: (playerId) => commit('player.updated', (g) => ({ ...g, lastExorcistTargetId: playerId })),
    setLastDevilsAdvocateTarget: (playerId) => commit('player.updated', (g) => ({ ...g, lastDevilsAdvocateTargetId: playerId })),
    setLunaticTargets: (playerIds) => commit('player.updated', (g) => ({ ...g, lunaticTargetIds: playerIds })),
    setGodfatherKillDue: (value) => commit('player.updated', (g) => ({ ...g, godfatherKillDue: value })),
    setShabalothVictims: (playerIds) => commit('player.updated', (g) => ({ ...g, shabalothVictimIds: playerIds })),
    setGossipKillDue: (value) => commit('player.updated', (g) => ({ ...g, gossipKillDue: value })),
    setMoonchildTarget: (playerId, wasGood = null) => commit('player.updated', (g) => ({ ...g, moonchildTargetId: playerId, moonchildTargetWasGood: wasGood })),

    addReminder: (playerId, label, sourceCharacterId) =>
      updatePlayer(
        playerId,
        (p) => ({
          ...p,
          reminders: [
            ...p.reminders,
            { id: nanoid(), label, sourceCharacterId, createdAt: new Date().toISOString() },
          ],
        }),
        { targetIds: [playerId], payload: { label } },
      ),

    removeReminder: (playerId, reminderId) =>
      updatePlayer(playerId, (p) => ({ ...p, reminders: p.reminders.filter((r) => r.id !== reminderId) }), {
        targetIds: [playerId],
      }),

    applyNightlyReminder: (sourceCharacterId, label, targetPlayerId) =>
      commit(
        'player.updated',
        (g) => ({
          ...g,
          players: g.players.map((p) => {
            const cleared = p.reminders.filter((r) => r.sourceCharacterId !== sourceCharacterId)
            if (p.id === targetPlayerId) {
              return {
                ...p,
                reminders: [
                  ...cleared,
                  { id: nanoid(), label, sourceCharacterId, createdAt: new Date().toISOString() },
                ],
              }
            }
            return cleared.length !== p.reminders.length ? { ...p, reminders: cleared } : p
          }),
        }),
        { targetIds: [targetPlayerId], payload: { sourceCharacterId, label } },
      ),

    addNote: (playerId, text, category) =>
      updatePlayer(
        playerId,
        (p) => ({
          ...p,
          notes: [...p.notes, { id: nanoid(), text, category, createdAt: new Date().toISOString() }],
        }),
        { targetIds: [playerId] },
      ),

    removeNote: (playerId, noteId) =>
      updatePlayer(playerId, (p) => ({ ...p, notes: p.notes.filter((n) => n.id !== noteId) }), {
        targetIds: [playerId],
      }),

    undo: () => {
      const result = undoLastEvent(get().history)
      if (!result) return
      set({ game: result.state, history: result.history, canUndo: result.history.length > 0 })
      saveGameToStorage(result.state, result.history)
      get().refreshSavedGames()
    },

    cancelNight: () => {
      const { history } = get()
      const current = get().game
      if (!current || !current.phase.startsWith('night.')) return
      // Cherche, en partant de la fin, le dernier événement qui a fait basculer la partie en
      // nuit ('night.first' ou 'night.other') : son `previousState` est l'état exact d'avant
      // le début de cette nuit (jour précédent, ou écran de révélation pour la nuit 1).
      const startIndex = [...history].reverse().findIndex(
        (event) => event.type === 'phase.changed' && (event.resultingState.phase === 'night.first' || event.resultingState.phase === 'night.other'),
      )
      if (startIndex === -1) return
      const eventIndex = history.length - 1 - startIndex
      const target = history[eventIndex]
      if (!target) return
      const newHistory = history.slice(0, eventIndex)
      set({ game: target.previousState, history: newHistory, canUndo: newHistory.length > 0 })
      saveGameToStorage(target.previousState, newHistory)
      get().refreshSavedGames()
    },

    clearHistory: () => {
      const current = get().game
      if (!current) return
      set({ history: [], canUndo: false })
      saveGameToStorage(current, [])
      get().refreshSavedGames()
    },
  }
})
