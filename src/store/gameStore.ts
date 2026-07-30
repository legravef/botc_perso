import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
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
  recomputeSeatOrderFromPositions,
  undoLastEvent,
  type LayoutPresetId,
} from '@/engine'
import { createEmptyPreparation } from '@/lib/factories'
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
  createGame: () => void
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
  /** Confirme la fin de partie avec le vainqueur retenu par le Conteur. */
  endGame: (info: Pick<GameEndInfo, 'winner' | 'reason'>) => void

  killPlayer: (playerId: string) => void
  revivePlayer: (playerId: string) => void
  toggleGhostVote: (playerId: string) => void
  setPlayerCharacter: (playerId: string, characterId: string) => void
  addReminder: (playerId: string, label: string, sourceCharacterId: string) => void
  removeReminder: (playerId: string, reminderId: string) => void
  /** Retire tout rappel précédemment posé par ce personnage (sur tous les joueurs) puis en pose un nouveau sur la cible — utile pour les pouvoirs qui ne durent qu'une nuit (Empoisonneur, Moine, Majordome...). */
  applyNightlyReminder: (sourceCharacterId: string, label: string, targetPlayerId: string) => void
  addNote: (playerId: string, text: string, category?: PlayerNote['category']) => void
  removeNote: (playerId: string, noteId: string) => void

  undo: () => void
  /** Vide l'historique (perte définitive de la capacité d'annuler) sans toucher à l'état actuel de la partie. */
  clearHistory: () => void
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

  return {
    game: null,
    history: [],
    savedGames: loadIndex(),
    canUndo: false,

    refreshSavedGames: () => set({ savedGames: loadIndex() }),

    createGame: () => {
      const now = new Date().toISOString()
      const game: Game = {
        id: nanoid(),
        scriptId: 'trouble-brewing',
        phase: 'setup.players',
        storytellerLevel: 'beginner',
        dayNumber: 0,
        nightNumber: 0,
        players: [],
        composition: null,
        preparation: createEmptyPreparation(),
        activeDemonId: null,
        gameNotes: [],
        publicScreenActive: false,
        end: null,
        createdAt: now,
        updatedAt: now,
      }
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
        // L'Ivrogne doit voir le Villageois cru comme son propre personnage sur l'écran de révélation.
        const players =
          'drunkBelievedCharacterId' in partial
            ? g.players.map((p) =>
                p.realCharacterId === 'drunk'
                  ? { ...p, perceivedCharacterId: preparation.drunkBelievedCharacterId }
                  : p,
              )
            : g.players
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
        }
      }),

    /** Démarre la nuit suivante depuis la phase de jour. */
    startNextNight: () =>
      commit('phase.changed', (g) => ({ ...g, phase: 'night.other', nightNumber: g.nightNumber + 1 })),

    resolveExecution: (executedPlayerId) =>
      commit(
        'execution.resolved',
        (g) => ({
          ...g,
          players: executedPlayerId
            ? g.players.map((p) => (p.id === executedPlayerId ? { ...p, alive: false } : p))
            : g.players,
        }),
        { targetIds: executedPlayerId ? [executedPlayerId] : [] },
      ),

    endGame: (info) =>
      commit('game.ended', (g) => ({
        ...g,
        phase: 'game.ended',
        end: { ...info, confirmedAt: new Date().toISOString() },
      })),

    killPlayer: (playerId) => updatePlayer(playerId, (p) => ({ ...p, alive: false }), { targetIds: [playerId] }),

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

    clearHistory: () => {
      const current = get().game
      if (!current) return
      set({ history: [], canUndo: false })
      saveGameToStorage(current, [])
      get().refreshSavedGames()
    },
  }
})
