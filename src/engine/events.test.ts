import { describe, expect, it } from 'vitest'
import { createEvent, undoLastEvent } from './events'
import type { Game } from '@/types'
import { createEmptyPreparation } from '@/lib/factories'

function makeGame(overrides: Partial<Game> = {}): Game {
  const now = new Date().toISOString()
  return {
    id: 'game-1',
    scriptId: 'trouble-brewing',
    phase: 'setup.players',
    storytellerLevel: 'beginner',
    dayNumber: 0,
    nightNumber: 0,
    players: [],
    composition: null,
    preparation: createEmptyPreparation(),
    activeDemonId: null,
    gameNotes: [],
    publicScreenActive: false,
    end: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('createEvent / undoLastEvent', () => {
  it('restaure exactement l\'état précédent après un undo', () => {
    const before = makeGame({ phase: 'setup.players' })
    const after = makeGame({ phase: 'setup.composition' })
    const event = createEvent('phase.changed', before, after)

    const result = undoLastEvent([event])
    expect(result?.state).toEqual(before)
    expect(result?.history).toHaveLength(0)
  })

  it('retourne null quand l\'historique est vide', () => {
    expect(undoLastEvent([])).toBeNull()
  })

  it('ne dépile que le dernier événement', () => {
    const s1 = makeGame({ phase: 'setup.players' })
    const s2 = makeGame({ phase: 'setup.composition' })
    const s3 = makeGame({ phase: 'setup.assignment' })
    const e1 = createEvent('phase.changed', s1, s2)
    const e2 = createEvent('phase.changed', s2, s3)

    const result = undoLastEvent([e1, e2])
    expect(result?.state.phase).toBe('setup.composition')
    expect(result?.history).toEqual([e1])
  })
})
