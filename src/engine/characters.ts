import type { Player } from '@/types'
import { countAdjacentEvilPairs, getLivingNeighbors } from './circle'

/**
 * playerId -> true si ce joueur doit être considéré comme méchant pour ce
 * calcul précis (choix du Conteur pour l'Espion/le Reclus). Absent = utiliser
 * l'alignement réel du joueur.
 */
export type AppearanceOverrides = Record<string, boolean>

/** Nombre de paires de joueurs méchants assis côte à côte (pouvoir du Chef). */
export function calculateChefNumber(players: Player[], appearanceOverrides: AppearanceOverrides = {}): number {
  return countAdjacentEvilPairs(players, appearanceOverrides)
}

/** Nombre de voisins vivants méchants (0, 1 ou 2) autour de l'Empathique. */
export function calculateEmpathNumber(
  players: Player[],
  empathPlayerId: string,
  appearanceOverrides: AppearanceOverrides = {},
): number {
  const { left, right } = getLivingNeighbors(players, empathPlayerId)
  const isEvil = (p: Player | null): boolean => {
    if (!p) return false
    return appearanceOverrides[p.id] ?? p.alignment === 'evil'
  }
  return [left, right].filter(isEvil).length
}

export interface ClockmakerRegistrations {
  /** Par défaut, l'Espionne est enregistrée normalement comme Sbire. */
  spyRegistersAsMinion?: boolean
  /** Par défaut, le Reclus est enregistré normalement et ne compte pas. */
  recluseRegistersAs?: 'good' | 'minion' | 'demon'
}

/** Distance minimale en nombre de pas entre un Démon et un Sbire enregistrés (1 = voisins). */
export function calculateClockmakerNumber(
  players: Player[],
  registrations: ClockmakerRegistrations = {},
): number {
  const ordered = [...players].sort((a, b) => a.seat - b.seat)
  const spyRegistersAsMinion = registrations.spyRegistersAsMinion ?? true
  const recluseRegistersAs = registrations.recluseRegistersAs ?? 'good'
  const demonIndexes = ordered
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.realCharacterId === 'imp' || (player.realCharacterId === 'recluse' && recluseRegistersAs === 'demon'))
    .map(({ index }) => index)
  const minionIndexes = ordered
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => {
      if (player.realCharacterId === 'recluse') return recluseRegistersAs === 'minion'
      if (player.realCharacterId === 'spy') return spyRegistersAsMinion
      return player.alignment === 'evil' && ['baron', 'scarlet-woman', 'godfather'].includes(player.realCharacterId ?? '')
    })
    .map(({ index }) => index)
  if (demonIndexes.length === 0 || minionIndexes.length === 0) return 0
  return Math.min(...demonIndexes.flatMap((demonIndex) => minionIndexes.map((minionIndex) => {
    const direct = Math.abs(minionIndex - demonIndex)
    return Math.min(direct, ordered.length - direct)
  })))
}
