import type { CategoryCounts } from '@/types'

/**
 * Répartition officielle des catégories de personnages selon le nombre de
 * joueurs, avant application des modificateurs de composition (Baron...).
 * Le Conteur n'est jamais compté parmi les joueurs.
 *
 * Source : règle de base de Blood on the Clocktower (identique pour tous
 * les scénarios), confirmée par le brief projet et les règles officielles.
 */
export const BASE_DISTRIBUTION_TABLE: Record<number, CategoryCounts> = {
  5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
}

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 15
