import type { Team } from './character'

export type StatusOrigin =
  | { type: 'poison'; sourceCharacterId: string; appliedNight: number }
  | { type: 'drunk'; reason: 'is-the-drunk' | 'ability' | 'other'; sourceCharacterId?: string }
  | { type: 'protected'; sourceCharacterId: string; night: number } // ex. Moine
  | { type: 'custom'; label: string }

export interface PlayerReminder {
  id: string
  /** Libellé du rappel (repris de Character.reminders ou saisi librement). */
  label: string
  /** Personnage qui a posé le rappel. */
  sourceCharacterId: string
  createdAt: string
}

export interface PlayerNote {
  id: string
  text: string
  createdAt: string
  category?: 'bluff' | 'information' | 'power-used' | 'suspected' | 'confirmed' | 'watch' | 'general'
}

export interface Player {
  id: string
  name: string
  /** Ordre logique autour de la table (0-indexé) : détermine les voisins pour les pouvoirs
   * (Empathique, Chef...). Recalculé automatiquement à partir de mapX/mapY quand le Conteur
   * déplace librement un siège sur le grimoire, pour rester fidèle à la disposition réelle. */
  seat: number
  /** Position libre sur la carte du grimoire, en unités relatives au rayon par défaut (centrée
   * sur 0, typiquement entre -1 et 1 mais pas bornée). null tant que le Conteur n'a jamais
   * déplacé ce joueur : un cercle régulier est alors utilisé par défaut. */
  mapX: number | null
  mapY: number | null

  /** Personnage réellement attribué. */
  realCharacterId: string | null
  /** Personnage que le joueur croit posséder, si différent (Ivrogne uniquement dans Trouble Brewing). */
  perceivedCharacterId: string | null

  /** Alignement réel (dérivé de realCharacterId, mais stocké pour permettre un
   * futur transfert, ex. Confidente devenant le Diablotin). */
  alignment: Team

  alive: boolean
  ghostVoteAvailable: boolean

  reminders: PlayerReminder[]
  statuses: StatusOrigin[]
  notes: PlayerNote[]
}
