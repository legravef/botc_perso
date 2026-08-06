import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NightAssistantScreen } from './NightAssistantScreen'
import { useGameStore } from '@/store'
import { createPlayer } from '@/lib/factories'

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
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
