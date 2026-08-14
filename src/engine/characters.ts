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

/** Distance minimale en nombre de pas entre le Démon et un Sbire (1 = voisins). */
export function calculateClockmakerNumber(players: Player[]): number {
  const ordered = [...players].sort((a, b) => a.seat - b.seat)
  const demonIndex = ordered.findIndex((player) => player.alignment === 'evil' && player.realCharacterId === 'imp')
  const minionIndexes = ordered
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.alignment === 'evil' && ['baron', 'scarlet-woman'].includes(player.realCharacterId ?? ''))
    .map(({ index }) => index)
  if (demonIndex < 0 || minionIndexes.length === 0) return 0
  return Math.min(...minionIndexes.map((index) => {
    const direct = Math.abs(index - demonIndex)
    return Math.min(direct, ordered.length - direct)
  }))
}
