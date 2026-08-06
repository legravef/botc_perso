import { beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NightAssistantScreen } from './NightAssistantScreen'
import { useGameStore } from '@/store'
import { createPlayer } from '@/lib/factories'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('Bad Moon Rising - Pukka', () => {
  it('keeps the first-night poison and kills that target when the next Pukka action is recorded', () => {
    const [pukka, nina, paul] = ['Pukka', 'Nina', 'Paul'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([pukka!, nina!, paul!])
    useGameStore.getState().setPlayerCharacter(pukka!.id, 'pukka')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'tinker')
    useGameStore.getState().setPlayerCharacter(paul!.id, 'moonchild')
    useGameStore.getState().setPhase('night.first')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: nina!.name }))
    expect(screen.getByRole('button', { name: 'Terminer la nuit' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans le grimoire' }))
    expect(useGameStore.getState().game?.players.find((player) => player.id === nina!.id)?.reminders.some((reminder) => reminder.sourceCharacterId === 'pukka')).toBe(true)

    act(() => {
      useGameStore.getState().completeNight()
      useGameStore.getState().resolveExecution(null)
      useGameStore.getState().startNextNight()
    })

    fireEvent.click(screen.getByRole('button', { name: paul!.name }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans le grimoire' }))
    expect(useGameStore.getState().game?.players.find((player) => player.id === nina!.id)?.alive).toBe(false)
  })
})

describe('Bad Moon Rising - Gambler', () => {
  it('offers dead players as valid targets', () => {
    const [gambler, nina, paul] = ['Gambler', 'Nina', 'Paul'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([gambler!, nina!, paul!])
    useGameStore.getState().setPlayerCharacter(gambler!.id, 'gambler')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'sailor')
    useGameStore.getState().setPlayerCharacter(paul!.id, 'zombuul')
    useGameStore.getState().killPlayer(nina!.id)
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    expect(screen.getByRole('button', { name: `${nina!.name} (mort)` })).toBeInTheDocument()
  })
})
