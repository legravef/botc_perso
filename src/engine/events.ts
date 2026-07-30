import { nanoid } from 'nanoid'
import type { Game, GameEvent, GameEventType } from '@/types'

export interface CreateEventOptions {
  actorId?: string
  targetIds?: string[]
  payload?: Record<string, unknown>
}

/**
 * Construit un événement d'historique à partir d'un état avant/après. Le
 * MVP stocke des snapshots complets (voir ARCHITECTURE.md §2) plutôt que des
 * patches, pour garantir un undo fiable dès l'Incrément 1.
 */
export function createEvent(
  type: GameEventType,
  previousState: Game,
  resultingState: Game,
  options: CreateEventOptions = {},
): GameEvent {
  return {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    phase: resultingState.phase,
    type,
    actorId: options.actorId,
    targetIds: options.targetIds,
    payload: options.payload ?? {},
    previousState,
    resultingState,
  }
}

export interface UndoResult {
  history: GameEvent[]
  state: Game
}

/** Retire le dernier événement de l'historique et restaure l'état précédent. */
export function undoLastEvent(history: GameEvent[]): UndoResult | null {
  const last = history[history.length - 1]
  if (!last) return null
  return { history: history.slice(0, -1), state: last.previousState }
}
