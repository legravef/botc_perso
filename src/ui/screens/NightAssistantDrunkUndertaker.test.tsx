import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NightAssistantScreen } from './NightAssistantScreen'
import { useGameStore } from '@/store'
import { createPlayer } from '@/lib/factories'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('Drunk Undertaker simulation', () => {
  it('lets the Storyteller choose the shown role', () => {
    const [nina, simon, paul] = ['Nina', 'Simon', 'Paul'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('trouble-brewing')
    useGameStore.getState().setPlayers([nina!, simon!, paul!])
    useGameStore.getState().setPlayerCharacter(nina!.id, 'drunk')
    useGameStore.getState().setPlayerCharacter(simon!.id, 'baron')
    useGameStore.getState().setPlayerCharacter(paul!.id, 'soldier')
    useGameStore.getState().killPlayer(simon!.id)
    useGameStore.getState().setPreparation({ drunkBelievedCharacterId: 'undertaker' })
    const game = useGameStore.getState().game!
    useGameStore.setState({ game: { ...game, lastExecutedPlayerId: simon!.id, phase: 'night.other' } })

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    expect(screen.getByRole('heading', { name: /Croque-mort/ })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button').find((button) => button.textContent?.includes('Choisir le r'))!)
    fireEvent.click(screen.getByRole('button', { name: 'Soldat' }))
    expect(screen.getAllByText(/Soldat/).length).toBeGreaterThan(0)
  })
})
