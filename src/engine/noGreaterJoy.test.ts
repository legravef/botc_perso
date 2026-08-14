import { describe, expect, it } from 'vitest'
import { NO_GREATER_JOY_CHARACTERS } from '@/data'
import { createEmptyPreparation, createPlayer } from '@/lib/factories'
import type { Composition, Game, Player } from '@/types'
import { calculateClockmakerNumber } from './characters'
import { generateRandomComposition, validateComposition } from './composition'
import { generateNightSteps } from './nightOrder'

const SCRIPT = 'no-greater-joy' as const

function assigned(name: string, seat: number, characterId: string, alignment: Player['alignment']): Player {
  return { ...createPlayer(name, seat), realCharacterId: characterId, alignment }
}

function gameWith(players: Player[]): Game {
  const now = new Date().toISOString()
  const composition: Composition = {
    baseCounts: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
    effectiveCounts: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
    characterIds: players.flatMap((player) => player.realCharacterId ? [player.realCharacterId] : []),
    isValid: true,
    errors: [],
    warnings: [],
  }
  return {
    id: 'ngj', scriptId: SCRIPT, phase: 'night.first', storytellerLevel: 'beginner',
    dayNumber: 0, nightNumber: 0, players, composition, preparation: createEmptyPreparation(),
    activeDemonId: null, gameNotes: [], publicScreenActive: false, end: null,
    createdAt: now, updatedAt: now,
  }
}

describe('No Greater Joy', () => {
  it('contient les 11 personnages officiels du scénario', () => {
    expect(NO_GREATER_JOY_CHARACTERS).toHaveLength(11)
    expect(NO_GREATER_JOY_CHARACTERS.filter((character) => character.category === 'townsfolk')).toHaveLength(6)
    expect(NO_GREATER_JOY_CHARACTERS.filter((character) => character.category === 'outsider')).toHaveLength(2)
    expect(NO_GREATER_JOY_CHARACTERS.filter((character) => character.category === 'minion')).toHaveLength(2)
    expect(NO_GREATER_JOY_CHARACTERS.filter((character) => character.category === 'demon')).toHaveLength(1)
  })

  it('est réservé à exactement 6 joueurs', () => {
    expect(validateComposition([], 5, SCRIPT).errors.some((error) => error.includes('dédié'))).toBe(true)
  })

  it('génère toujours une composition valide à 6 joueurs', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(generateRandomComposition({ playerCount: 6, scriptId: SCRIPT }).isValid).toBe(true)
    }
  })

  it('limite le Baron à +1 Paria à 6 joueurs', () => {
    const composition = validateComposition(['clockmaker', 'empath', 'drunk', 'klutz', 'baron', 'imp'], 6, SCRIPT)
    expect(composition.isValid).toBe(true)
    expect(composition.effectiveCounts).toEqual({ townsfolk: 2, outsider: 2, minion: 1, demon: 1 })
  })

  it('calcule la distance de l’Horloger avec 1 pour des voisins', () => {
    const players = [
      assigned('Démon', 0, 'imp', 'evil'),
      assigned('Bon 1', 1, 'artist', 'good'),
      assigned('Sbire', 2, 'baron', 'evil'),
      assigned('Bon 2', 3, 'empath', 'good'),
      assigned('Bon 3', 4, 'sage', 'good'),
      assigned('Bon 4', 5, 'drunk', 'good'),
    ]
    expect(calculateClockmakerNumber(players)).toBe(2)
  })

  it('ne donne ni information d’équipe ni bluffs pendant la première nuit', () => {
    const players = [
      assigned('Horloger', 0, 'clockmaker', 'good'),
      assigned('Empathique', 1, 'empath', 'good'),
      assigned('Artiste', 2, 'artist', 'good'),
      assigned('Maladroit', 3, 'klutz', 'good'),
      assigned('Baron', 4, 'baron', 'evil'),
      assigned('Diablotin', 5, 'imp', 'evil'),
    ]
    const steps = generateNightSteps(gameWith(players), 'first')
    expect(steps.some((step) => step.kind === 'minion-info' || step.kind === 'demon-info')).toBe(false)
    expect(steps.find((step) => step.characterId === 'clockmaker')?.displayReveal).toEqual({ kind: 'number', value: 1 })
  })
})
