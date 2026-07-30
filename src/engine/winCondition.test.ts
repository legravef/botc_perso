import { describe, expect, it } from 'vitest'
import { suggestWinCondition } from './winCondition'
import { createPlayer, createEmptyPreparation } from '@/lib/factories'
import type { Game, Player } from '@/types'

function makeGame(players: Player[]): Game {
  const now = new Date().toISOString()
  return {
    id: 'g1',
    scriptId: 'trouble-brewing',
    phase: 'day.discussion',
    storytellerLevel: 'beginner',
    dayNumber: 1,
    nightNumber: 1,
    players,
    composition: null,
    preparation: createEmptyPreparation(),
    activeDemonId: null,
    gameNotes: [],
    publicScreenActive: false,
    end: null,
    createdAt: now,
    updatedAt: now,
  }
}

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => createPlayer(`P${i}`, i))
}

describe('suggestWinCondition', () => {
  it('ne suggère rien tant que le Démon est vivant et que plus de 2 joueurs sont vivants', () => {
    const players = makePlayers(7).map((p, i) => (i === 6 ? { ...p, realCharacterId: 'imp', alignment: 'evil' as const } : p))
    const game = makeGame(players)
    expect(suggestWinCondition(game)).toBeNull()
  })

  it('suggère la victoire du Bien quand le Démon est mort', () => {
    const players = makePlayers(7).map((p, i) =>
      i === 6 ? { ...p, realCharacterId: 'imp', alignment: 'evil' as const, alive: false } : p,
    )
    const game = makeGame(players)
    const result = suggestWinCondition(game)
    expect(result?.winner).toBe('good')
  })

  it('suggère la victoire du Mal quand il ne reste que 2 joueurs vivants avec le Démon en vie', () => {
    const players = makePlayers(7).map((p, i) => {
      if (i === 6) return { ...p, realCharacterId: 'imp', alignment: 'evil' as const }
      if (i <= 4) return { ...p, alive: false }
      return p
    })
    const game = makeGame(players)
    const result = suggestWinCondition(game)
    expect(result?.winner).toBe('evil')
  })

  it("suggère la victoire immédiate du Mal quand le Saint vient d'être exécuté", () => {
    const players = makePlayers(7).map((p, i) => {
      if (i === 6) return { ...p, realCharacterId: 'imp', alignment: 'evil' as const }
      if (i === 0) return { ...p, realCharacterId: 'saint', alive: false }
      return p
    })
    const game = makeGame(players)
    const result = suggestWinCondition(game, (players[0] as Player).id)
    expect(result?.winner).toBe('evil')
    expect(result?.reason).toContain('Saint')
  })

  it("la mort du Saint hors exécution (justExecutedPlayerId absent) ne déclenche pas sa condition spéciale", () => {
    const players = makePlayers(7).map((p, i) => {
      if (i === 6) return { ...p, realCharacterId: 'imp', alignment: 'evil' as const }
      if (i === 0) return { ...p, realCharacterId: 'saint', alive: false }
      return p
    })
    const game = makeGame(players)
    const result = suggestWinCondition(game)
    // Le Démon est vivant et plus de 2 joueurs sont vivants : aucune condition ne doit se déclencher.
    expect(result).toBeNull()
  })
})
