import type { Game } from './game'

/**
 * Type d'événement de l'historique. Volontairement large dès l'Incrément 1
 * (players/composition) — les types liés aux nuits/votes/exécutions sont
 * ajoutés au fil des incréments suivants sans casser la forme de base.
 */
export type GameEventType =
  | 'game.created'
  | 'players.updated'
  | 'composition.set'
  | 'characters.assigned'
  | 'phase.changed'
  | 'settings.updated'
  | 'player.updated'
  | 'preparation.updated'
  | 'execution.resolved'
  | 'game.ended'

export interface GameEvent {
  id: string
  timestamp: string
  phase: Game['phase']
  type: GameEventType
  actorId?: string | undefined
  targetIds?: string[] | undefined
  payload: Record<string, unknown>
  /** Snapshot complet de l'état avant l'événement (voir engine/events.ts pour la stratégie d'undo). */
  previousState: Game
  /** Snapshot complet de l'état après l'événement. */
  resultingState: Game
}
