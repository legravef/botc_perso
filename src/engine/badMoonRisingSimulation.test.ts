import { beforeEach, describe, expect, it } from 'vitest'
import { createPlayer } from '@/lib/factories'
import { useGameStore } from '@/store'
import { generateNightSteps } from './nightOrder'

const simulations = [
  ['pukka', 'godfather', 'grandmother', 'sailor', 'courtier', 'goon', 'lunatic'],
  ['zombuul', 'devils-advocate', 'chambermaid', 'exorcist', 'innkeeper', 'gambler', 'tinker'],
  ['shabaloth', 'assassin', 'gossip', 'professor', 'minstrel', 'tea-lady', 'moonchild'],
  ['po', 'mastermind', 'pacifist', 'fool', 'sailor', 'courtier', 'goon'],
  ['pukka', 'godfather', 'chambermaid', 'innkeeper', 'gambler', 'professor', 'tinker'],
  ['zombuul', 'devils-advocate', 'grandmother', 'exorcist', 'minstrel', 'tea-lady', 'lunatic'],
  ['shabaloth', 'assassin', 'sailor', 'courtier', 'pacifist', 'fool', 'moonchild'],
  ['po', 'mastermind', 'chambermaid', 'innkeeper', 'gossip', 'professor', 'goon'],
  ['pukka', 'godfather', 'grandmother', 'exorcist', 'minstrel', 'tea-lady', 'tinker'],
  ['zombuul', 'assassin', 'sailor', 'gambler', 'pacifist', 'fool', 'lunatic'],
] as const

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('Bad Moon Rising - 10 simulated game paths', () => {
  it.each(simulations)('simulates first night then three full cycles', (...characterIds) => {
    const players = characterIds.map((_, index) => createPlayer(`P${index + 1}`, index)!)
    const store = useGameStore.getState()
    store.createGame('bad-moon-rising')
    store.setPlayers(players)
    players.forEach((player, index) => store.setPlayerCharacter(player.id, characterIds[index]!))
    store.setPhase('night.first')

    const firstNightSteps = generateNightSteps(useGameStore.getState().game!, 'first')
    const demonId = characterIds[0]!
    if (demonId === 'pukka') expect(firstNightSteps.some((step) => step.characterId === 'pukka')).toBe(true)
    store.completeNight()
    store.resolveExecution(null)
    store.startNextNight()

    for (let night = 0; night < 3; night += 1) {
      const gameBefore = useGameStore.getState().game!
      const steps = generateNightSteps(gameBefore, 'other')
      expect(steps.some((step) => step.characterId === demonId)).toBe(true)

      const demon = gameBefore.players.find((player) => player.realCharacterId === demonId && player.alive)
      const target = gameBefore.players.find((player) => player.alive && player.id !== demon?.id)
      expect(target).toBeDefined()
      useGameStore.getState().resolveNightDeaths([target!.id], demonId)
      useGameStore.getState().completeNight()
      expect(useGameStore.getState().game?.phase).toBe('day.discussion')

      useGameStore.getState().resolveExecution(null)
      useGameStore.getState().startNextNight()
      expect(useGameStore.getState().game?.phase).toBe('night.other')
    }
  })
})
