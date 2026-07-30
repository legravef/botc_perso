import { describe, expect, it } from 'vitest'
import { generateSuggestedComposition } from './recommendation'

const SCRIPT = 'trouble-brewing' as const

describe('generateSuggestedComposition — niveau débutant (TPI TB1)', () => {
  it.each([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])(
    'produit toujours une composition valide à %i joueurs',
    (playerCount) => {
      const result = generateSuggestedComposition({ playerCount, scriptId: SCRIPT, level: 'beginner' })
      expect(result.isValid).toBe(true)
      expect(result.characterIds).toHaveLength(playerCount)
    },
  )

  it('exclut systématiquement le Mercenaire et le Saint (risque de fin de partie prématurée)', () => {
    for (let trial = 0; trial < 100; trial++) {
      const result = generateSuggestedComposition({ playerCount: 10, scriptId: SCRIPT, level: 'beginner' })
      expect(result.characterIds).not.toContain('slayer')
      expect(result.characterIds).not.toContain('saint')
    }
  })

  it('favorise fortement la Confidente comme filet de sécurité (sur 200 tirages à 7 joueurs, 1 sbire)', () => {
    let scarletWomanCount = 0
    const trials = 200
    for (let i = 0; i < trials; i++) {
      const result = generateSuggestedComposition({ playerCount: 7, scriptId: SCRIPT, level: 'beginner' })
      if (result.characterIds.includes('scarlet-woman')) scarletWomanCount++
    }
    // Poids 4 sur un total minion d'environ 4+2+1+1=8 → ~50% de chances par tirage ;
    // large marge pour éviter tout flakiness tout en prouvant le biais (vs 25% en tirage uniforme).
    expect(scarletWomanCount / trials).toBeGreaterThan(0.3)
  })

  it('un personnage verrouillé prime sur une exclusion de niveau (le Conteur peut forcer le Saint)', () => {
    // 9 joueurs : 2 Parias de base, quel que soit le tirage du Baron — la place est garantie.
    const result = generateSuggestedComposition({
      playerCount: 9,
      scriptId: SCRIPT,
      level: 'beginner',
      lockedCharacterIds: ['saint'],
    })
    expect(result.characterIds).toContain('saint')
    expect(result.isValid).toBe(true)
  })

  it('reste valide même quand le Baron force à utiliser tous les Parias, Saint compris, à 15 joueurs', () => {
    for (let i = 0; i < 30; i++) {
      const result = generateSuggestedComposition({
        playerCount: 15,
        scriptId: SCRIPT,
        level: 'beginner',
        lockedCharacterIds: ['baron'],
      })
      expect(result.isValid).toBe(true)
      expect(result.characterIds).toHaveLength(15)
    }
  })

  it('est déterministe avec une fonction aléatoire injectée', () => {
    const a = generateSuggestedComposition({ playerCount: 8, scriptId: SCRIPT, level: 'beginner', randomFn: () => 0.5 })
    const b = generateSuggestedComposition({ playerCount: 8, scriptId: SCRIPT, level: 'beginner', randomFn: () => 0.5 })
    expect(a.characterIds).toEqual(b.characterIds)
  })
})

describe('generateSuggestedComposition — niveaux intermédiaire et expérimenté', () => {
  it('le niveau expérimenté peut inclure le Mercenaire ou le Saint (aucune exclusion)', () => {
    let sawExcludedCharacter = false
    for (let i = 0; i < 100; i++) {
      const result = generateSuggestedComposition({ playerCount: 7, scriptId: SCRIPT, level: 'experienced' })
      if (result.characterIds.includes('slayer') || result.characterIds.includes('saint')) {
        sawExcludedCharacter = true
        break
      }
    }
    expect(sawExcludedCharacter).toBe(true)
  })

  it("le niveau intermédiaire n'exclut aucun personnage", () => {
    let sawExcludedCharacter = false
    for (let i = 0; i < 150; i++) {
      const result = generateSuggestedComposition({ playerCount: 7, scriptId: SCRIPT, level: 'intermediate' })
      if (result.characterIds.includes('slayer') || result.characterIds.includes('saint')) {
        sawExcludedCharacter = true
        break
      }
    }
    expect(sawExcludedCharacter).toBe(true)
  })

  it.each([5, 9, 15])('reste toujours valide à %i joueurs pour tous les niveaux', (playerCount) => {
    for (const level of ['beginner', 'intermediate', 'experienced'] as const) {
      const result = generateSuggestedComposition({ playerCount, scriptId: SCRIPT, level })
      expect(result.isValid).toBe(true)
    }
  })
})
