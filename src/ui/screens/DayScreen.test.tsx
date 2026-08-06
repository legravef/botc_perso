import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DayScreen } from './DayScreen'
import { useGameStore } from '@/store'
import { createPlayer } from '@/lib/factories'
import type { Player } from '@/types'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

function setupDay(characterIds: string[]): Player[] {
  const players = characterIds.map((_, index) => createPlayer(`P${index + 1}`, index)!)
  useGameStore.getState().createGame('trouble-brewing')
  useGameStore.getState().setPlayers(players)
  players.forEach((player, index) => useGameStore.getState().setPlayerCharacter(player!.id, characterIds[index]!))
  useGameStore.getState().setPhase('day.discussion')
  return players
}

function getButtonContaining(text: string) {
  const button = screen.getAllByRole('button').find((element) => element.textContent?.includes(text))
  if (!button) throw new Error(`Button containing ${text} not found`)
  return button
}

describe('DayScreen special Trouble Brewing actions', () => {
  it('kills the actual Demon when the Slayer fires, then records that the shot was used', () => {
    const players = setupDay(['slayer', 'imp', 'mayor'])
    const slayer = players[0]!
    const imp = players[1]!
    render(<DayScreen onOpenGrimoire={() => {}} />)

    fireEvent.click(screen.getAllByRole('button', { name: slayer.name })[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: imp.name })[0]!)
    fireEvent.click(getButtonContaining('Chasseur'))

    const game = useGameStore.getState().game!
    expect(game.players.find((player) => player.id === imp.id)?.alive).toBe(false)
    expect(game.players.find((player) => player.id === slayer.id)?.reminders.some((reminder) => reminder.sourceCharacterId === 'slayer')).toBe(true)
  })

  it('prepares the immediate Virgin execution only for a Townsfolk nominator', () => {
    const players = setupDay(['virgin', 'chef', 'poisoner'])
    const virgin = players[0]!
    const chef = players[1]!
    const poisoner = players[2]!
    render(<DayScreen onOpenGrimoire={() => {}} />)

    fireEvent.click(screen.getAllByRole('button', { name: virgin.name })[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: chef.name })[0]!)
    fireEvent.click(getButtonContaining('Vierge'))
    fireEvent.click(getButtonContaining('Confirmer et passer'))

    const game = useGameStore.getState().game!
    expect(game.players.find((player) => player.id === chef.id)?.alive).toBe(false)
    expect(game.players.find((player) => player.id === virgin.id)?.reminders.some((reminder) => reminder.sourceCharacterId === 'virgin')).toBe(true)
    expect(game.players.find((player) => player.id === poisoner.id)?.alive).toBe(true)
  })
})
