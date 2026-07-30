import { getDefaultPosition, type Position } from './circle'

/**
 * Dispositions prédéfinies, applicables en un clic à tous les joueurs, en
 * complément du placement libre à la souris/au doigt (voir SeatingLayout).
 * Inspiré du système de "Positioner" de Pocket Grimoire
 * (github.com/Skateside/pocket-grimoire), qui propose plusieurs agencements
 * tout prêts (ellipse, diagonale, horizontale, verticale) plutôt que de
 * ne compter que sur le glisser-déposer manuel.
 */
export type LayoutPresetId = 'circle' | 'two-rows' | 'diagonal'

export interface LayoutPreset {
  id: LayoutPresetId
  label: string
  getPosition: (seat: number, total: number) => Position
}

function circlePosition(seat: number, total: number): Position {
  const angle = (seat / total) * 2 * Math.PI - Math.PI / 2
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

function diagonalPosition(seat: number, total: number): Position {
  const t = total <= 1 ? 0.5 : seat / (total - 1)
  return { x: -1 + 2 * t, y: -1 + 2 * t }
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: 'circle', label: 'Cercle', getPosition: circlePosition },
  { id: 'two-rows', label: 'Deux rangées face à face', getPosition: getDefaultPosition },
  { id: 'diagonal', label: 'Diagonale', getPosition: diagonalPosition },
]

export function getLayoutPreset(id: LayoutPresetId): LayoutPreset {
  const preset = LAYOUT_PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Disposition inconnue : ${id}.`)
  return preset
}

/** Génère les positions (dans l'ordre des sièges 0..n-1) pour une disposition prédéfinie donnée. */
export function generateLayoutPositions(id: LayoutPresetId, total: number): Position[] {
  const preset = getLayoutPreset(id)
  return Array.from({ length: total }, (_, seat) => preset.getPosition(seat, total))
}
