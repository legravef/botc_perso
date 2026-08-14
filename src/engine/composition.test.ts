import { describe, expect, it } from 'vitest'
import {
  applySetupModifiers,
  generateRandomComposition,
  getBaseDistribution,
  validateComposition,
} from './composition'
import { BASE_DISTRIBUTION_TABLE } from '@/data/distribution-table'
import { TROUBLE_BREWING_CHARACTERS } from '@/data/characters/trouble-brewing'

const SCRIPT = 'trouble-brewing' as const

function idsByCategory(category: string, count: number, excludeIds: string[] = []): string[] {
  return TROUBLE_BREWING_CHARACTERS.filter((c) => c.category === category && !excludeIds.includes(c.id))
    .slice(0, count)
    .map((c) => c.id)
}

describe('getBaseDistribution', () => {
  it.each(Object.keys(BASE_DISTRIBUTION_TABLE).map(Number))(
    'retourne la répartition officielle pour %i joueurs',
    (playerCount) => {
      const dist = getBaseDistribution(playerCount)
      expect(dist).toEqual(BASE_DISTRIBUTION_TABLE[playerCount])
      // La somme des catégories doit toujours correspondre au nombre de joueurs.
      expect(dist.townsfolk + dist.outsider + dist.minion + dist.demon).toBe(playerCount)
    },
  )

  it('rejette un nombre de joueurs hors plage', () => {
    expect(() => getBaseDistribution(4)).toThrow()
    expect(() => getBaseDistribution(16)).toThrow()
  })
})

describe('applySetupModifiers — Baron', () => {
  it('applique la répartition 1 Villageois / 3 Parias / 1 Sbire / 1 Démon à 6 joueurs', () => {
    const { base, effective } = applySetupModifiers(['baron'], 6, SCRIPT)
    expect(base).toEqual({ townsfolk: 3, outsider: 1, minion: 1, demon: 1 })
    expect(effective).toEqual({ townsfolk: 1, outsider: 3, minion: 1, demon: 1 })
  })

  it('ajoute deux Parias et retire deux Villageois quand le Baron est sélectionné (9 joueurs)', () => {
    const base = getBaseDistribution(9) // 5 villageois, 2 étrangers, 1 sbire, 1 démon
    const { effective, appliedModifiers } = applySetupModifiers(['baron'], 9, SCRIPT)
    expect(base).toEqual({ townsfolk: 5, outsider: 2, minion: 1, demon: 1 })
    expect(effective).toEqual({ townsfolk: 3, outsider: 4, minion: 1, demon: 1 })
    expect(appliedModifiers).toHaveLength(1)
  })

  it("ne modifie rien sans le Baron", () => {
    const { base, effective } = applySetupModifiers(['imp'], 9, SCRIPT)
    expect(effective).toEqual(base)
  })

  it('conserve le nombre total de joueurs après modification', () => {
    const { effective } = applySetupModifiers(['baron'], 9, SCRIPT)
    expect(effective.townsfolk + effective.outsider + effective.minion + effective.demon).toBe(9)
  })
})

describe('validateComposition', () => {
  it('valide une composition correcte à 7 joueurs (sans Baron)', () => {
    const ids = [
      ...idsByCategory('townsfolk', 5),
      ...idsByCategory('minion', 1, ['baron']),
      ...idsByCategory('demon', 1),
    ]
    const result = validateComposition(ids, 7, SCRIPT)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejette une composition avec le mauvais nombre de personnages', () => {
    const result = validateComposition(['imp'], 7, SCRIPT)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejette un personnage sélectionné deux fois', () => {
    const ids = [...idsByCategory('townsfolk', 4), 'imp', 'imp', 'poisoner']
    const result = validateComposition(ids, 7, SCRIPT)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('sélectionné'))).toBe(true)
  })

  it('rejette une composition dont les comptes de catégories ne correspondent pas à la répartition attendue', () => {
    // 7 joueurs attend 5 villageois / 0 étranger / 1 sbire / 1 démon.
    const invalidIds = [...idsByCategory('townsfolk', 4), 'poisoner', 'imp', 'scarlet-woman']
    const result = validateComposition(invalidIds, 7, SCRIPT)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('Villageois') || e.includes('Sbires'))).toBe(true)
  })

  it('signale que le Baron modifie la composition (avertissement) sur une composition valide', () => {
    const ids = [
      ...idsByCategory('townsfolk', 3),
      ...idsByCategory('outsider', 4),
      'baron',
      ...idsByCategory('demon', 1),
    ]
    const result = validateComposition(ids, 9, SCRIPT)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some((w) => w.includes('Baron'))).toBe(true)
  })

  it("avertit que l'Ivrogne nécessite un faux rôle de Villageois", () => {
    const ids = [
      ...idsByCategory('townsfolk', 4),
      'drunk',
      ...idsByCategory('minion', 1, ['baron']),
      ...idsByCategory('demon', 1),
    ]
    const result = validateComposition(ids, 7, SCRIPT)
    expect(result.warnings.some((w) => w.includes('Ivrogne'))).toBe(true)
  })
})

describe('generateRandomComposition', () => {
  it.each([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])(
    'génère toujours une composition valide à %i joueurs',
    (playerCount) => {
      const result = generateRandomComposition({ playerCount, scriptId: SCRIPT })
      expect(result.isValid).toBe(true)
      expect(result.characterIds).toHaveLength(playerCount)
      expect(new Set(result.characterIds).size).toBe(playerCount)
    },
  )

  it('respecte les personnages verrouillés', () => {
    const result = generateRandomComposition({
      playerCount: 9,
      scriptId: SCRIPT,
      lockedCharacterIds: ['baron', 'imp'],
    })
    expect(result.characterIds).toContain('baron')
    expect(result.characterIds).toContain('imp')
    expect(result.isValid).toBe(true)
  })

  it('recalcule correctement les emplacements Paria/Villageois quand le Baron est verrouillé', () => {
    const result = generateRandomComposition({
      playerCount: 9,
      scriptId: SCRIPT,
      lockedCharacterIds: ['baron'],
    })
    expect(result.effectiveCounts).toEqual({ townsfolk: 3, outsider: 4, minion: 1, demon: 1 })
  })

  it('est déterministe avec une fonction aléatoire injectée', () => {
    const a = generateRandomComposition({ playerCount: 7, scriptId: SCRIPT, randomFn: () => 0 })
    const b = generateRandomComposition({ playerCount: 7, scriptId: SCRIPT, randomFn: () => 0 })
    expect(a.characterIds).toEqual(b.characterIds)
  })

  it('lève une erreur si trop de personnages sont verrouillés dans une catégorie', () => {
    const allMinions = TROUBLE_BREWING_CHARACTERS.filter((c) => c.category === 'minion').map((c) => c.id)
    expect(() =>
      generateRandomComposition({ playerCount: 7, scriptId: SCRIPT, lockedCharacterIds: allMinions }),
    ).toThrow()
  })
})
