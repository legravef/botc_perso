import { describe, expect, it } from 'vitest'
import { calculateChefNumber, calculateEmpathNumber } from './characters'
import { createPlayer } from '@/lib/factories'
import type { Player } from '@/types'

function makeCircle(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => createPlayer(`P${i}`, i))
}

describe('calculateChefNumber', () => {
  it('correspond au nombre de paires de méchants adjacents', () => {
    const players = makeCircle(7).map((p, i) => (i === 3 || i === 4 ? { ...p, alignment: 'evil' as const } : p))
    expect(calculateChefNumber(players)).toBe(1)
  })

  it("prend en compte l'apparence forcée d'un Reclus comme méchant", () => {
    const players = makeCircle(4)
    const recluse = players[0] as Player
    const neighbor = players[1] as Player
    const withNeighborEvil = players.map((p) => (p.id === neighbor.id ? { ...p, alignment: 'evil' as const } : p))
    expect(calculateChefNumber(withNeighborEvil, { [recluse.id]: true })).toBe(1)
  })
})

describe('calculateEmpathNumber', () => {
  it('retourne 0 si aucun voisin vivant n\'est méchant', () => {
    const players = makeCircle(5)
    const empath = players[2] as Player
    expect(calculateEmpathNumber(players, empath.id)).toBe(0)
  })

  it('retourne 1 si un seul voisin vivant est méchant', () => {
    const players = makeCircle(5).map((p, i) => (i === 1 ? { ...p, alignment: 'evil' as const } : p))
    const empath = players[2] as Player
    expect(calculateEmpathNumber(players, empath.id)).toBe(1)
  })

  it('retourne 2 si les deux voisins vivants sont méchants', () => {
    const players = makeCircle(5).map((p, i) => (i === 1 || i === 3 ? { ...p, alignment: 'evil' as const } : p))
    const empath = players[2] as Player
    expect(calculateEmpathNumber(players, empath.id)).toBe(2)
  })

  it('ignore les joueurs morts et regarde plus loin', () => {
    const players = makeCircle(6).map((p, i) => {
      if (i === 1) return { ...p, alive: false }
      if (i === 0) return { ...p, alignment: 'evil' as const }
      return p
    })
    const empath = players[2] as Player
    // voisin gauche vivant de 2 (en sautant 1 qui est mort) = joueur 0, méchant
    expect(calculateEmpathNumber(players, empath.id)).toBe(1)
  })
})
