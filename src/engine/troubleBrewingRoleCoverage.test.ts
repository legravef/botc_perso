import { beforeEach, describe, expect, it } from 'vitest'
import { getCharactersForScript } from '@/data'
import { createPlayer } from '@/lib/factories'
import { useGameStore } from '@/store'
import { generateNightSteps } from './nightOrder'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

function setupAllTroubleBrewingRoles() {
  const characters = getCharactersForScript('trouble-brewing')
  const players = characters.map((character, seat) => createPlayer(`P${seat + 1}`, seat, character.id))

  useGameStore.getState().createGame('trouble-brewing')
  useGameStore.getState().setPlayers(players)
  for (const [index, character] of characters.entries()) {
    useGameStore.getState().setPlayerCharacter(players[index]!.id, character.id)
  }

  const playerFor = (characterId: string) => players[characters.findIndex((character) => character.id === characterId)]!
  useGameStore.getState().setPreparation({
    washerwoman: { characterId: 'chef', playerAId: playerFor('chef').id, playerBId: playerFor('empath').id },
    librarian: { characterId: 'butler', playerAId: playerFor('butler').id, playerBId: playerFor('drunk').id },
    investigator: { characterId: 'poisoner', playerAId: playerFor('poisoner').id, playerBId: playerFor('spy').id },
    fortuneTellerRedHerringPlayerId: playerFor('mayor').id,
    drunkBelievedCharacterId: 'chef',
    impBluffCharacterIds: ['washerwoman', 'librarian', 'investigator'],
  })

  return { characters, players, playerFor }
}

describe('Trouble Brewing — couverture de tous les rôles', () => {
  it('expose tous les rôles actifs de première nuit, avec les informations de Sbires et Démon', () => {
    const { characters } = setupAllTroubleBrewingRoles()
    const game = useGameStore.getState().game!
    const steps = generateNightSteps(game, 'first')
    const ids = new Set(steps.map((step) => step.characterId))

    expect(characters).toHaveLength(22)
    expect(steps.some((step) => step.kind === 'minion-info')).toBe(true)
    expect(steps.some((step) => step.kind === 'demon-info' && step.playerIds.length === 1)).toBe(true)
    for (const id of ['poisoner', 'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortune-teller', 'butler', 'spy']) {
      expect(ids).toContain(id)
    }
    // L'Ivrogne est réveillé sous l'identité du Chef, mais son action reste explicitement simulée.
    expect(steps.some((step) => step.id === 'drunk-simulated-chef' && step.isSimulated)).toBe(true)
  })

  it('expose les rôles actifs des nuits suivantes et réserve les passifs/déclencheurs à leur événement', () => {
    const { playerFor } = setupAllTroubleBrewingRoles()
    const game = useGameStore.getState().game!
    useGameStore.setState({ game: { ...game, lastExecutedPlayerId: playerFor('baron').id } })

    const steps = generateNightSteps(useGameStore.getState().game!, 'other')
    const ids = new Set(steps.map((step) => step.characterId))
    for (const id of ['poisoner', 'monk', 'undertaker', 'butler', 'spy', 'imp']) {
      expect(ids).toContain(id)
    }
    for (const id of ['virgin', 'slayer', 'soldier', 'mayor', 'recluse', 'saint', 'baron', 'scarlet-woman', 'ravenkeeper']) {
      expect(ids).not.toContain(id)
    }
  })
})
