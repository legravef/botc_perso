import { describe, expect, it } from 'vitest'
import { generateLayoutPositions, getLayoutPreset } from './layoutPresets'
import { recomputeSeatOrderFromPositions } from './circle'
import { createPlayer } from '@/lib/factories'
import type { Player } from '@/types'

describe('layoutPresets — dispositions prédéfinies (inspiré de Pocket Grimoire)', () => {
  it('génère une position par siège pour chaque disposition', () => {
    for (const preset of ['circle', 'two-rows', 'diagonal'] as const) {
      const positions = generateLayoutPositions(preset, 7)
      expect(positions).toHaveLength(7)
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true)
        expect(Number.isFinite(pos.y)).toBe(true)
      }
    }
  })

  it('lève une erreur pour un identifiant de disposition inconnu', () => {
    // @ts-expect-error -- volontairement invalide pour tester la validation
    expect(() => getLayoutPreset('not-a-preset')).toThrow()
  })

  it("chaque disposition conserve la séquence circulaire d'origine (rotation ou inversion de sens autorisées, jamais mélangée)", () => {
    // Seule la géométrie compte ici, pas le sens de parcours (horaire/anti-horaire) : selon
    // l'orientation d'une disposition (colonnes vs rangées), le tri par angle peut légitimement
    // parcourir le pourtour de la table dans un sens ou dans l'autre.
    const forward = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']
    const reversedFromP0 = [forward[0] as string, ...forward.slice(1).reverse()]

    for (const preset of ['circle', 'two-rows', 'diagonal'] as const) {
      const players: Player[] = Array.from({ length: 6 }, (_, i) => createPlayer(`P${i}`, i))
      const positions = generateLayoutPositions(preset, 6)
      const withPositions = players.map((p, i) => ({ ...p, mapX: positions[i]!.x, mapY: positions[i]!.y }))
      const recomputed = recomputeSeatOrderFromPositions(withPositions)
      const namesInOrder = [...recomputed].sort((a, b) => a.seat - b.seat).map((p) => p.name)

      const startIndex = namesInOrder.indexOf('P0')
      const rotated = [...namesInOrder.slice(startIndex), ...namesInOrder.slice(0, startIndex)]
      expect([forward, reversedFromP0]).toContainEqual(rotated)
    }
  })

  it('la disposition "diagonale" place les joueurs le long dune ligne croissante', () => {
    const positions = generateLayoutPositions('diagonal', 4)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]!.x).toBeGreaterThan(positions[i - 1]!.x)
      expect(positions[i]!.y).toBeGreaterThan(positions[i - 1]!.y)
    }
  })
})
