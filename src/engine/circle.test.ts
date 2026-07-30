import { describe, expect, it } from 'vitest'
import {
  countAdjacentEvilPairs,
  getEffectivePosition,
  getLivingNeighbors,
  getNeighbors,
  getSeatOrder,
  recomputeSeatOrderFromPositions,
} from './circle'
import { createPlayer } from '@/lib/factories'
import type { Player } from '@/types'

function makeCircle(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => createPlayer(`P${i}`, i))
}

describe('getSeatOrder / getNeighbors — voisins circulaires', () => {
  it('le premier et le dernier joueur sont voisins', () => {
    const players = makeCircle(5)
    const first = players[0] as Player
    const last = players[4] as Player

    const firstNeighbors = getNeighbors(players, first.id)
    const lastNeighbors = getNeighbors(players, last.id)

    expect(firstNeighbors?.left.id).toBe(last.id)
    expect(lastNeighbors?.right.id).toBe(first.id)
  })

  it('retourne les voisins directs pour un joueur au milieu du cercle', () => {
    const players = makeCircle(5)
    const middle = players[2] as Player
    const neighbors = getNeighbors(players, middle.id)
    expect(neighbors?.left.id).toBe(players[1]?.id)
    expect(neighbors?.right.id).toBe(players[3]?.id)
  })

  it('retourne null pour un joueur absent ou un cercle trop petit', () => {
    const players = makeCircle(3)
    expect(getNeighbors(players, 'unknown')).toBeNull()
    expect(getNeighbors([players[0] as Player], (players[0] as Player).id)).toBeNull()
  })

  it("est indépendant de l'ordre d'insertion (trie par siège)", () => {
    const players = makeCircle(4)
    const shuffled = [players[2], players[0], players[3], players[1]] as Player[]
    expect(getSeatOrder(shuffled).map((p) => p.seat)).toEqual([0, 1, 2, 3])
  })
})

describe('getLivingNeighbors — voisins vivants de l\'Empathe', () => {
  it('retourne les voisins directs quand tout le monde est vivant', () => {
    const players = makeCircle(6)
    const target = players[3] as Player
    const { left, right } = getLivingNeighbors(players, target.id)
    expect(left?.id).toBe(players[2]?.id)
    expect(right?.id).toBe(players[4]?.id)
  })

  it('saute les joueurs morts pour trouver le prochain voisin vivant', () => {
    const players = makeCircle(6).map((p, i) => (i === 2 || i === 4 ? { ...p, alive: false } : p))
    const target = players[3] as Player
    const { left, right } = getLivingNeighbors(players, target.id)
    // joueur 2 mort -> voisin gauche vivant = joueur 1
    expect(left?.id).toBe(players[1]?.id)
    // joueur 4 mort -> voisin droit vivant = joueur 5
    expect(right?.id).toBe(players[5]?.id)
  })

  it('retourne null des deux côtés si tous les autres joueurs sont morts', () => {
    const players = makeCircle(4).map((p, i) => (i === 0 ? p : { ...p, alive: false }))
    const { left, right } = getLivingNeighbors(players, (players[0] as Player).id)
    expect(left).toBeNull()
    expect(right).toBeNull()
  })

  it('traverse le point de jonction premier/dernier joueur', () => {
    const players = makeCircle(5).map((p, i) => (i === 1 || i === 4 ? { ...p, alive: false } : p))
    const target = players[0] as Player
    const { left, right } = getLivingNeighbors(players, target.id)
    // à gauche de 0 : 4 (mort) -> 3 (vivant)
    expect(left?.id).toBe(players[3]?.id)
    // à droite de 0 : 1 (mort) -> 2 (vivant)
    expect(right?.id).toBe(players[2]?.id)
  })
})

describe('countAdjacentEvilPairs — calcul du Chef', () => {
  it('compte 0 paire sans méchants adjacents', () => {
    const players = makeCircle(5)
    expect(countAdjacentEvilPairs(players)).toBe(0)
  })

  it('compte les paires de méchants adjacents, y compris entre le premier et le dernier siège', () => {
    const players = makeCircle(5).map((p, i) => (i === 0 || i === 4 ? { ...p, alignment: 'evil' as const } : p))
    // joueurs 4 et 0 sont voisins et tous deux méchants => 1 paire
    expect(countAdjacentEvilPairs(players)).toBe(1)
  })

  it('compte deux paires pour trois méchants consécutifs', () => {
    const players = makeCircle(6).map((p, i) =>
      i === 1 || i === 2 || i === 3 ? { ...p, alignment: 'evil' as const } : p,
    )
    expect(countAdjacentEvilPairs(players)).toBe(2)
  })

  it("respecte les apparences forcées (Reclus vu comme méchant, Espion vu comme bon)", () => {
    const players = makeCircle(3)
    const [a, b] = players as [Player, Player, Player]
    const overrides = { [a.id]: true, [b.id]: true }
    expect(countAdjacentEvilPairs(players, overrides)).toBeGreaterThanOrEqual(1)
  })
})

describe('getEffectivePosition — placement libre sur la carte', () => {
  it('retourne une position par défaut en deux colonnes face à face tant que le joueur n\'a jamais été déplacé', () => {
    // 4 joueurs : sièges 0-1 en colonne de gauche, sièges 2-3 en colonne de droite.
    const topLeft = getEffectivePosition(createPlayer('Alice', 0), 4)
    const bottomLeft = getEffectivePosition(createPlayer('Bruno', 1), 4)
    const bottomRight = getEffectivePosition(createPlayer('Chloé', 2), 4)
    const topRight = getEffectivePosition(createPlayer('David', 3), 4)

    expect(topLeft.x).toBeLessThan(0)
    expect(bottomLeft.x).toBeLessThan(0)
    expect(bottomRight.x).toBeGreaterThan(0)
    expect(topRight.x).toBeGreaterThan(0)
    expect(topLeft.y).toBeLessThan(bottomLeft.y)
    // La colonne de droite est parcourue de bas en haut pour boucler correctement autour de la table.
    expect(bottomRight.y).toBeGreaterThan(topRight.y)
  })

  it('retourne mapX/mapY tels quels dès que le joueur a été déplacé librement', () => {
    const player = { ...createPlayer('Alice', 0), mapX: 0.4, mapY: 0.9 }
    expect(getEffectivePosition(player, 4)).toEqual({ x: 0.4, y: 0.9 })
  })
})

describe('recomputeSeatOrderFromPositions — disposition libre (ovale, deux rangées face à face...)', () => {
  it("ne change rien à l'adjacence quand personne n'a bougé (positions par défaut)", () => {
    const players = makeCircle(6)
    const recomputed = recomputeSeatOrderFromPositions(players)
    const seats = recomputed.map((p) => p.seat).sort((a, b) => a - b)
    expect(seats).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('recalcule les voisins correctement pour une disposition en deux rangées face à face', () => {
    // 4 joueurs : deux rangées de 2 qui se font face (comme dans le dessin de l'utilisateur).
    // Rangée du haut : P0 (gauche), P1 (droite). Rangée du bas : P2 (droite), P3 (gauche).
    // L'ordre réel autour de la "table" doit être P0 → P1 → P2 → P3 → (retour à P0).
    const players = makeCircle(4).map((p, i) => {
      const positions = [
        { x: -1, y: -1 }, // P0 : haut-gauche
        { x: 1, y: -1 }, // P1 : haut-droite
        { x: 1, y: 1 }, // P2 : bas-droite
        { x: -1, y: 1 }, // P3 : bas-gauche
      ]
      return { ...p, mapX: positions[i]!.x, mapY: positions[i]!.y }
    })

    const recomputed = recomputeSeatOrderFromPositions(players)
    const bySeat = [...recomputed].sort((a, b) => a.seat - b.seat)
    const namesInOrder = bySeat.map((p) => p.name)

    // La séquence doit former une boucle cohérente autour du rectangle (dans un sens ou l'autre),
    // jamais une diagonale (P0 adjacent à P2, ou P1 adjacent à P3).
    const indexOf = (name: string) => namesInOrder.indexOf(name)
    const circularDistance = (a: number, b: number) => {
      const diff = Math.abs(a - b)
      return Math.min(diff, namesInOrder.length - diff)
    }
    expect(circularDistance(indexOf('P0'), indexOf('P2'))).toBe(2) // diagonale opposée
    expect(circularDistance(indexOf('P1'), indexOf('P3'))).toBe(2) // diagonale opposée
    expect(circularDistance(indexOf('P0'), indexOf('P1'))).toBe(1) // adjacents réels
    expect(circularDistance(indexOf('P2'), indexOf('P3'))).toBe(1) // adjacents réels
  })

  it('ne modifie aucun champ des joueurs à part le siège', () => {
    const players = makeCircle(3).map((p, i) => ({ ...p, mapX: i, mapY: -i, name: `Joueur ${i}` }))
    const recomputed = recomputeSeatOrderFromPositions(players)
    for (const player of recomputed) {
      const original = players.find((p) => p.id === player.id)
      expect(player.name).toBe(original?.name)
      expect(player.mapX).toBe(original?.mapX)
      expect(player.mapY).toBe(original?.mapY)
    }
  })

  it('retourne un tableau vide sans erreur', () => {
    expect(recomputeSeatOrderFromPositions([])).toEqual([])
  })
})
