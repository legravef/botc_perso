import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NightAssistantScreen } from './NightAssistantScreen'
import { useGameStore } from '@/store'
import { createPlayer } from '@/lib/factories'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('NightAssistantScreen Mayor', () => {
  it('allows the Storyteller to redirect an Imp kill to another living player', () => {
    const [arthur, nina, marc] = ['Arthur', 'Nina', 'Marc'].map((name, i) => createPlayer(name, i))

    useGameStore.getState().createGame('trouble-brewing')
    useGameStore.getState().setPlayers([arthur!, nina!, marc!])
    useGameStore.getState().setPlayerCharacter(arthur!.id, 'imp')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'poisoner')
    useGameStore.getState().setPlayerCharacter(marc!.id, 'mayor')
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByText('Diablotin')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: marc!.name }))
    expect(screen.getByText(/Le Maire peut rediriger/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: nina!.name })[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victime' }))

    const players = useGameStore.getState().game!.players
    expect(players.find((player) => player.id === marc!.id)?.alive).toBe(true)
    expect(players.find((player) => player.id === nina!.id)?.alive).toBe(false)
  })
})

/**
 * Reproduit le bug rapporté : Arthur (Diablotin) se cible lui-même, Nina — Empoisonneuse,
 * qui a donc déjà agi plus tôt cette même nuit — devient la nouvelle Diablotin. La liste des
 * étapes de nuit se recalcule en pleine nuit et perd l'étape "Empoisonneur" désormais résolue,
 * ce qui doit être absorbé sans bloquer le Conteur sur "Aucun personnage à réveiller".
 */
function setupStarpassGame() {
  const names = ['Arthur', 'Nina', 'P3', 'P4', 'P5', 'P6', 'P7']
  const players = names.map((name, i) => createPlayer(name, i))
  const [arthur, nina, p3, p4, p5, p6, p7] = players

  useGameStore.getState().createGame('trouble-brewing')
  useGameStore.getState().setPlayers(players)
  useGameStore.getState().setPlayerCharacter(arthur!.id, 'imp')
  useGameStore.getState().setPlayerCharacter(nina!.id, 'poisoner')
  useGameStore.getState().setPlayerCharacter(p3!.id, 'chef')
  useGameStore.getState().setPlayerCharacter(p4!.id, 'virgin')
  useGameStore.getState().setPlayerCharacter(p5!.id, 'saint')
  useGameStore.getState().setPlayerCharacter(p6!.id, 'mayor')
  useGameStore.getState().setPlayerCharacter(p7!.id, 'recluse')
  useGameStore.getState().setPhase('night.other')

  return { arthur: arthur!, nina: nina! }
}

describe('NightAssistantScreen — starpass du Diablotin', () => {
  it("ne bloque pas la nuit quand le successeur avait déjà agi plus tôt (ex. Empoisonneur)", () => {
    const { arthur, nina } = setupStarpassGame()
    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    // Étape 1/2 : l'Empoisonneuse (Nina) — aucune sélection requise pour avancer.
    expect(screen.getByText('Empoisonneur')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    // Étape 2/2 : le Diablotin (Arthur) se cible lui-même.
    expect(screen.getByText('Diablotin')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `${arthur.name} (vous-même)` }))
    // Un seul Sbire vivant (Nina) : successeur auto-sélectionné.
    expect(screen.getByText(new RegExp(`Successeur automatique.*${nina.name}`))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victime' }))

    // Le bug reproduit ici : sans le correctif, on tombe sur cet écran et on y reste bloqué.
    expect(screen.queryByText('Aucun personnage à réveiller cette nuit.')).not.toBeInTheDocument()

    // La même étape "Diablotin" doit être ré-affichée, tenue cette fois par Nina, déjà validée.
    expect(screen.getByText('Diablotin')).toBeInTheDocument()
    expect(screen.getByText(/Victime enregistrée/)).toBeInTheDocument()

    const footer = screen.getByRole('button', { name: 'Terminer la nuit' })
    expect(footer).toBeEnabled()
  })
})

describe('NightAssistantScreen — Gardien', () => {
  it('ne figure pas dans l’ordre régulier, mais se déclenche immédiatement après sa mort nocturne', () => {
    const [arthur, nina, georges] = ['Arthur', 'Nina', 'Georges'].map((name, i) => createPlayer(name, i))

    useGameStore.getState().createGame('trouble-brewing')
    useGameStore.getState().setPlayers([arthur!, nina!, georges!])
    useGameStore.getState().setPlayerCharacter(arthur!.id, 'imp')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'ravenkeeper')
    useGameStore.getState().setPlayerCharacter(georges!.id, 'poisoner')
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    // L'Empoisonneur joue, puis le Diablotin : le Gardien vivant n'est jamais une étape régulière.
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByText('Diablotin')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: nina!.name }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victime' }))

    expect(screen.getByText(`Gardien — ${nina!.name}`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: arthur!.name }))
    fireEvent.click(screen.getByRole('button', { name: /J.ai montré ce rôle/ }))
    expect(screen.getByRole('button', { name: 'Terminer la nuit' })).toBeEnabled()
  })
})

describe('NightAssistantScreen — Croque-mort ivre ou empoisonné', () => {
  it('permet au Conteur de remplacer le rôle réel par le rôle mensonger à montrer', () => {
    const [ugo, nina, paul] = ['Ugo', 'Nina', 'Paul'].map((name, i) => createPlayer(name, i))

    useGameStore.getState().createGame('trouble-brewing')
    useGameStore.getState().setPlayers([ugo!, nina!, paul!])
    useGameStore.getState().setPlayerCharacter(ugo!.id, 'undertaker')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'baron')
    useGameStore.getState().setPlayerCharacter(paul!.id, 'soldier')
    useGameStore.getState().killPlayer(nina!.id)
    useGameStore.getState().addReminder(ugo!.id, 'Empoisonné (test)', 'poisoner')
    const game = useGameStore.getState().game!
    useGameStore.setState({ game: { ...game, lastExecutedPlayerId: nina!.id, phase: 'night.other' } })

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Croque-mort' })).toBeInTheDocument()
    expect(screen.getAllByText(/Choisissez/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button').find((button) => button.textContent?.includes('Choisir le r'))!)
    fireEvent.click(screen.getByRole('button', { name: 'Soldat' }))
    expect(screen.getAllByText(/Soldat/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Montrer directement sur l'écran/ })).toBeEnabled()
  })
})

describe('NightAssistantScreen — Bad Moon Rising : Professeur', () => {
  it('la résurrection par le Professeur survit à la fin de la nuit (Nina doit être vivante en journée)', () => {
    const [paul, nina] = ['Paul', 'Nina'].map((name, i) => createPlayer(name, i))

    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([paul!, nina!])
    useGameStore.getState().setPlayerCharacter(paul!.id, 'professor')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'gambler')
    // Nina est déjà morte (ex. mauvaise annonce du Parieur une nuit précédente).
    useGameStore.getState().killPlayer(nina!.id)
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)

    expect(screen.getByText('Professeur')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `${nina!.name} (mort)` }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans le grimoire' }))

    expect(useGameStore.getState().game?.players.find((p) => p.id === nina!.id)?.alive).toBe(true)

    useGameStore.getState().completeNight()

    const revivedNina = useGameStore.getState().game?.players.find((p) => p.id === nina!.id)
    expect(revivedNina?.alive).toBe(true)
  })

  it("ne redemande plus de réveiller le Professeur une fois son pouvoir unique utilisé", () => {
    const [paul, nina] = ['Paul', 'Nina'].map((name, i) => createPlayer(name, i))

    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([paul!, nina!])
    useGameStore.getState().setPlayerCharacter(paul!.id, 'professor')
    useGameStore.getState().setPlayerCharacter(nina!.id, 'gambler')
    useGameStore.getState().killPlayer(nina!.id)
    useGameStore.getState().setPhase('night.other')

    render(<NightAssistantScreen onOpenGrimoire={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: `${nina!.name} (mort)` }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans le grimoire' }))

    useGameStore.getState().completeNight()
    useGameStore.getState().startNextNight()

    // Nuit suivante : le pouvoir a déjà été utilisé, il n'y a plus rien à faire pour le Professeur.
    expect(screen.queryByText('Professeur')).not.toBeInTheDocument()
  })
})
