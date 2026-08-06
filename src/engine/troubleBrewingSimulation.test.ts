import { beforeEach, describe, expect, it } from 'vitest'
import { createPlayer } from '@/lib/factories'
import { useGameStore } from '@/store'
import { generateNightSteps } from './nightOrder'

const simulations = [
  ['imp', 'poisoner', 'mayor', 'virgin', 'slayer', 'chef', 'monk'],
  ['imp', 'baron', 'undertaker', 'ravenkeeper', 'empath', 'soldier', 'butler'],
  ['imp', 'scarlet-woman', 'fortune-teller', 'washerwoman', 'librarian', 'investigator', 'recluse'],
  ['imp', 'spy', 'chef', 'empath', 'fortune-teller', 'slayer', 'saint'],
  ['imp', 'poisoner', 'mayor', 'undertaker', 'monk', 'virgin', 'drunk'],
  ['imp', 'baron', 'ravenkeeper', 'soldier', 'washerwoman', 'librarian', 'saint'],
  ['imp', 'scarlet-woman', 'investigator', 'chef', 'empath', 'fortune-teller', 'recluse'],
  ['imp', 'spy', 'slayer', 'mayor', 'monk', 'undertaker', 'butler'],
  ['imp', 'poisoner', 'ravenkeeper', 'virgin', 'soldier', 'washerwoman', 'drunk'],
  ['imp', 'baron', 'fortune-teller', 'investigator', 'chef', 'empath', 'recluse'],
] as const

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('Trouble Brewing - 10 simulated game paths', () => {
  it.each(simulations)('simulates a three-night path with %s as the Demon', (...characterIds) => {
    const players = characterIds.map((_, index) => createPlayer(`P${index + 1}`, index)!)
    const store = useGameStore.getState()
    store.createGame('trouble-brewing')
    store.setPlayers(players)
    players.forEach((player, index) => store.setPlayerCharacter(player.id, characterIds[index]!))
    store.setPhase('night.other')

    for (let night = 0; night < 3; night += 1) {
      const gameBefore = useGameStore.getState().game!
      const steps = generateNightSteps(gameBefore, 'other')
      expect(steps.some((step) => step.characterId === 'imp')).toBe(true)

      const imp = gameBefore.players.find((player) => player.realCharacterId === 'imp' && player.alive)
      const target = gameBefore.players.find((player) => player.alive && player.id !== imp?.id)
      expect(target).toBeDefined()
      useGameStore.getState().resolveNightDeaths([target!.id], 'imp')
      useGameStore.getState().completeNight()
      expect(useGameStore.getState().game?.phase).toBe('day.discussion')

      useGameStore.getState().resolveExecution(null)
      useGameStore.getState().startNextNight()
      expect(useGameStore.getState().game?.phase).toBe('night.other')
    }
  })
})
