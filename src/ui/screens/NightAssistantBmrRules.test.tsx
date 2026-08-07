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

  it('peut montrer directement l’identité de l’Exorciste au Pukka ciblé', () => {
    const [pukka, exorciste] = ['Pukka', 'Élodie'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([pukka!, exorciste!])
    useGameStore.getState().setPlayerCharacter(pukka!.id, 'pukka')
    useGameStore.getState().setPlayerCharacter(exorciste!.id, 'exorcist')
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: pukka!.name }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans le grimoire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Afficher l’Exorciste sur la tablette' }))
    expect(screen.getByText('L’Exorciste est…')).toBeInTheDocument()
    expect(screen.getByText(exorciste!.name)).toBeInTheDocument()
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

describe('Bad Moon Rising - Marin', () => {
  it('ne propose jamais les joueurs morts', () => {
    const [marin, nina] = ['Marin', 'Nina'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([marin!, nina!])
    useGameStore.getState().setPlayerCharacter(marin!.id, 'sailor')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'tinker')
    useGameStore.getState().killPlayer(nina!.id)
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    expect(screen.getByRole('button', { name: marin!.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `${nina!.name} (mort)` })).not.toBeInTheDocument()
  })
})

describe('Bad Moon Rising - pouvoirs uniques', () => {
  it('redemande à la Courtisane chaque nuit tant qu’elle choisit de ne pas utiliser son pouvoir', () => {
    const [courtisane] = ['Courtisane'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([courtisane!])
    useGameStore.getState().setPlayerCharacter(courtisane!.id, 'courtier')
    useGameStore.getState().setPhase('night.first')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    expect(screen.getByText('Voulez-vous utiliser votre pouvoir cette nuit ?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Non, me rendormir' }))
    expect(screen.getByText('Très bien, vous pouvez vous rendormir.')).toBeInTheDocument()

    act(() => {
      useGameStore.getState().completeNight()
      useGameStore.getState().startNextNight()
    })
    expect(screen.getByText('Voulez-vous utiliser votre pouvoir cette nuit ?')).toBeInTheDocument()
  })

  it.each([
    ['courtier', 'Courtisane'],
    ['professor', 'Professeur'],
    ['assassin', 'Assassin'],
  ] as const)('propose d’abord le choix Oui / Non au %s', (characterId, _roleName) => {
    const [actor, target] = ['Acteur', 'Cible'].map((name, i) => createPlayer(name, i))
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([actor!, target!])
    useGameStore.getState().setPlayerCharacter(actor!.id, characterId)
    useGameStore.getState().setPlayerCharacter(target!.id, 'tinker')
    if (characterId === 'professor') useGameStore.getState().killPlayer(target!.id)
    useGameStore.getState().setPhase(characterId === 'courtier' ? 'night.first' : 'night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Oui, utiliser mon pouvoir' }))
    if (characterId === 'courtier') {
      expect(screen.getByRole('button', { name: 'Donner la tablette à la Courtisane' })).toBeInTheDocument()
    } else {
      expect(screen.getByRole('button', { name: characterId === 'professor' ? `${target!.name} (mort)` : target!.name })).toBeInTheDocument()
    }
  })
})
