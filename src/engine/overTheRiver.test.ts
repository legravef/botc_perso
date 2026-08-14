import { beforeEach, describe, expect, it } from 'vitest'
import { OVER_THE_RIVER_CHARACTERS } from '@/data'
import { createEmptyPreparation, createPlayer } from '@/lib/factories'
import { useGameStore } from '@/store'
import type { Composition, Game, Player } from '@/types'
import { calculateClockmakerNumber } from './characters'
import { generateRandomComposition, validateComposition } from './composition'
import { generateNightSteps } from './nightOrder'

const SCRIPT = 'over-the-river' as const

function assigned(name: string, seat: number, characterId: string, alignment: Player['alignment']): Player {
  return { ...createPlayer(name, seat), realCharacterId: characterId, alignment }
}

function gameWith(players: Player[], overrides: Partial<Game> = {}): Game {
  const now = new Date().toISOString()
  const composition: Composition = {
    baseCounts: { townsfolk: 3, outsider: players.length === 6 ? 1 : 0, minion: 1, demon: 1 },
    effectiveCounts: { townsfolk: 3, outsider: players.length === 6 ? 1 : 0, minion: 1, demon: 1 },
    characterIds: players.flatMap((player) => player.realCharacterId ? [player.realCharacterId] : []),
    isValid: true,
    errors: [],
    warnings: [],
  }
  return {
    id: 'otr', scriptId: SCRIPT, phase: 'night.first', storytellerLevel: 'intermediate',
    dayNumber: 0, nightNumber: 1, players, composition, preparation: createEmptyPreparation(),
    activeDemonId: null, gameNotes: [], publicScreenActive: false, end: null,
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('Over the River', () => {
  it('contient les 11 personnages officiels du scénario', () => {
    expect(OVER_THE_RIVER_CHARACTERS).toHaveLength(11)
    expect(OVER_THE_RIVER_CHARACTERS.filter((character) => character.category === 'townsfolk')).toHaveLength(6)
    expect(OVER_THE_RIVER_CHARACTERS.filter((character) => character.category === 'outsider')).toHaveLength(2)
    expect(OVER_THE_RIVER_CHARACTERS.filter((character) => character.category === 'minion')).toHaveLength(2)
    expect(OVER_THE_RIVER_CHARACTERS.filter((character) => character.category === 'demon')).toHaveLength(1)
  })

  it('accepte 5 ou 6 joueurs mais refuse les autres tailles', () => {
    expect(validateComposition(['grandmother', 'clockmaker', 'innkeeper', 'spy', 'imp'], 5, SCRIPT).isValid).toBe(true)
    expect(validateComposition(['grandmother', 'clockmaker', 'innkeeper', 'lunatic', 'spy', 'imp'], 6, SCRIPT).isValid).toBe(true)
    expect(validateComposition([], 7, SCRIPT).errors.some((error) => error.includes('5 ou 6'))).toBe(true)
  })

  it('applique les deux variations valides du Parrain à 6 joueurs', () => {
    const plusOne = validateComposition(['grandmother', 'clockmaker', 'lunatic', 'recluse', 'godfather', 'imp'], 6, SCRIPT, 1)
    expect(plusOne.isValid).toBe(true)
    expect(plusOne.effectiveCounts).toEqual({ townsfolk: 2, outsider: 2, minion: 1, demon: 1 })

    const minusOne = validateComposition(['grandmother', 'clockmaker', 'innkeeper', 'professor', 'godfather', 'imp'], 6, SCRIPT, -1)
    expect(minusOne.isValid).toBe(true)
    expect(minusOne.effectiveCounts).toEqual({ townsfolk: 4, outsider: 0, minion: 1, demon: 1 })
  })

  it('ne permet que +1 Paria au Parrain à 5 joueurs', () => {
    const plusOne = validateComposition(['grandmother', 'clockmaker', 'lunatic', 'godfather', 'imp'], 5, SCRIPT, 1)
    expect(plusOne.isValid).toBe(true)
    const minusOne = validateComposition(['grandmother', 'clockmaker', 'innkeeper', 'godfather', 'imp'], 5, SCRIPT, -1)
    expect(minusOne.isValid).toBe(false)
  })

  it('génère des compositions de base valides à 5 et 6 joueurs', () => {
    for (const playerCount of [5, 6]) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        expect(generateRandomComposition({ playerCount, scriptId: SCRIPT }).isValid).toBe(true)
      }
    }
  })

  it('compte le Parrain et l’Espionne comme Sbires réels pour la valeur de référence de l’Horloger', () => {
    const withGodfather = [
      assigned('Démon', 0, 'imp', 'evil'), assigned('Bon', 1, 'grandmother', 'good'),
      assigned('Parrain', 2, 'godfather', 'evil'), assigned('Bon 2', 3, 'clockmaker', 'good'),
      assigned('Bon 3', 4, 'innkeeper', 'good'), assigned('Paria', 5, 'recluse', 'good'),
    ]
    expect(calculateClockmakerNumber(withGodfather)).toBe(2)
    expect(calculateClockmakerNumber(withGodfather.map((player) => player.realCharacterId === 'godfather' ? { ...player, realCharacterId: 'spy' } : player))).toBe(2)
  })

  it('recalcule l’Horloger selon l’enregistrement de l’Espionne et du Reclus', () => {
    const players = [
      assigned('Diablotin', 0, 'imp', 'evil'), assigned('Horloger', 1, 'clockmaker', 'good'),
      assigned('Reclus', 2, 'recluse', 'good'), assigned('Espionne', 3, 'spy', 'evil'),
      assigned('Bon 1', 4, 'innkeeper', 'good'), assigned('Bon 2', 5, 'professor', 'good'),
    ]
    expect(calculateClockmakerNumber(players)).toBe(3)
    expect(calculateClockmakerNumber(players, { spyRegistersAsMinion: true, recluseRegistersAs: 'demon' })).toBe(1)
    expect(calculateClockmakerNumber(players, { spyRegistersAsMinion: false, recluseRegistersAs: 'minion' })).toBe(2)
    expect(calculateClockmakerNumber(players, { spyRegistersAsMinion: false, recluseRegistersAs: 'good' })).toBe(0)
  })

  it('fait croire au Lunatique qu’il est le Démon sans fausse équipe ni bluffs', () => {
    const players = [
      assigned('Lunatique', 0, 'lunatic', 'good'), assigned('Charmeur', 1, 'snakecharmer', 'good'),
      assigned('Grand-mère', 2, 'grandmother', 'good'), assigned('Horloger', 3, 'clockmaker', 'good'),
      assigned('Espionne', 4, 'spy', 'evil'), assigned('Diablotin', 5, 'imp', 'evil'),
    ]
    const game = gameWith(players, { preparation: {
      ...createEmptyPreparation(),
      lunaticBelievedDemonId: 'imp',
      grandmotherRevealPlayerId: players[1]!.id,
    } })
    const steps = generateNightSteps(game, 'first')
    expect(steps.some((step) => step.kind === 'minion-info')).toBe(false)
    const demonInfoSteps = steps.filter((step) => step.kind === 'demon-info')
    expect(demonInfoSteps).toHaveLength(1)
    expect(demonInfoSteps.some((step) => step.playerIds.includes(players[0]!.id))).toBe(false)
    const realDemonInfo = demonInfoSteps.find((step) => step.playerIds.includes(players[5]!.id))
    expect(realDemonInfo?.title).toContain('Lunatique')
    expect(realDemonInfo?.bluffCharacterIds).toBeUndefined()
    expect(steps.some((step) => step.playerIds.includes(players[0]!.id))).toBe(false)
    expect(steps.filter((step) => step.kind === 'character').map((step) => step.characterId)).toEqual([
      'snakecharmer', 'grandmother', 'clockmaker', 'spy',
    ])
  })

  it('respecte l’ordre des autres nuits', () => {
    const players = [
      assigned('Aubergiste', 0, 'innkeeper', 'good'), assigned('Charmeur', 1, 'snakecharmer', 'good'),
      assigned('Lunatique', 2, 'lunatic', 'good'), assigned('Professeur', 3, 'professor', 'good'),
      assigned('Parrain', 4, 'godfather', 'evil'), assigned('Diablotin', 5, 'imp', 'evil'),
    ]
    const game = gameWith(players, {
      phase: 'night.other',
      godfatherKillDue: true,
      godfatherKillDueOnDay: 0,
      preparation: { ...createEmptyPreparation(), lunaticBelievedDemonId: 'imp' },
    })
    expect(generateNightSteps(game, 'other').filter((step) => step.kind === 'character').map((step) => step.characterId)).toEqual([
      'innkeeper', 'snakecharmer', 'lunatic', 'imp', 'godfather', 'professor',
    ])
  })

  it('ne réveille le Parrain après la première nuit que si un Paria est mort ce jour-là', () => {
    const players = [
      assigned('Parrain', 0, 'godfather', 'evil'), assigned('Diablotin', 1, 'imp', 'evil'),
      assigned('Bon', 2, 'clockmaker', 'good'), assigned('Paria', 3, 'recluse', 'good'),
      assigned('Bon 2', 4, 'innkeeper', 'good'), assigned('Bon 3', 5, 'professor', 'good'),
    ]
    const withoutOutsiderDeath = gameWith(players, { phase: 'night.other', godfatherKillDue: false })
    expect(generateNightSteps(withoutOutsiderDeath, 'other').some((step) => step.characterId === 'godfather')).toBe(false)

    const stalePreviousDayTrigger = gameWith(players, {
      phase: 'night.other', dayNumber: 2, nightNumber: 3,
      godfatherKillDue: true, godfatherKillDueOnDay: 1,
    })
    expect(generateNightSteps(stalePreviousDayTrigger, 'other').some((step) => step.characterId === 'godfather')).toBe(false)

    const staleLegacyTrigger = gameWith(players, {
      phase: 'night.other', dayNumber: 2, nightNumber: 3,
      godfatherKillDue: true, godfatherKillDueOnDay: null, lastExecutedPlayerId: null,
    })
    expect(generateNightSteps(staleLegacyTrigger, 'other').some((step) => step.characterId === 'godfather')).toBe(false)

    const withOutsiderDeath = gameWith(players, { phase: 'night.other', godfatherKillDue: true, godfatherKillDueOnDay: 0 })
    const godfatherStep = generateNightSteps(withOutsiderDeath, 'other').find((step) => step.characterId === 'godfather')
    expect(godfatherStep?.instruction).toContain('Un Paria est mort')
    expect(godfatherStep?.resolvedInfo).toBeUndefined()
  })

  it('échange atomiquement le Charmeur et le Démon puis empoisonne le nouveau Charmeur', () => {
    const snakeCharmer = assigned('Charmeur', 0, 'snakecharmer', 'good')
    const imp = assigned('Diablotin', 1, 'imp', 'evil')
    useGameStore.getState().createGame(SCRIPT)
    useGameStore.getState().setPlayers([snakeCharmer, imp])
    useGameStore.getState().resolveSnakeCharmerSwap(snakeCharmer.id, imp.id)

    const updated = useGameStore.getState().game?.players ?? []
    expect(updated.find((player) => player.id === snakeCharmer.id)).toMatchObject({ realCharacterId: 'imp', alignment: 'evil' })
    expect(updated.find((player) => player.id === imp.id)).toMatchObject({ realCharacterId: 'snakecharmer', alignment: 'good' })
    expect(updated.find((player) => player.id === imp.id)?.reminders.some((reminder) => reminder.sourceCharacterId === 'snakecharmer' && reminder.label.startsWith('Empoisonné'))).toBe(true)
  })
})
