import type { Player, PlayerNote } from './player'
import type { ScriptId } from './character'

export type StorytellerLevel = 'beginner' | 'intermediate' | 'experienced'

/**
 * Phase de haut niveau de la partie. Pilote la navigation entre écrans.
 * Les sous-étapes de nuit/jour sont gérées séparément (voir NightStep dans engine/nightOrder.ts).
 */
export type GamePhase =
  | 'setup.players'
  | 'setup.composition'
  | 'setup.assignment'
  | 'setup.preparation'
  | 'setup.seating'
  | 'setup.reveal'
  | 'night.first'
  | 'day.discussion'
  | 'night.other'
  | 'game.ended'

export interface CategoryCounts {
  townsfolk: number
  outsider: number
  minion: number
  demon: number
}

export interface Composition {
  /** Répartition officielle avant application des modificateurs (Baron...). */
  baseCounts: CategoryCounts
  /** Répartition effective après modificateurs. */
  effectiveCounts: CategoryCounts
  /** Identifiants des personnages sélectionnés pour cette partie. */
  characterIds: string[]
  /** true si la composition respecte effectiveCounts et les règles d'unicité. */
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface GameEndInfo {
  winner: 'good' | 'evil'
  reason: string
  confirmedAt: string
}

/**
 * Choix effectués par le Conteur lors de la "Préparation automatique de la
 * partie" (voir spécification), utilisés ensuite par l'assistant de
 * première nuit pour afficher les informations correctes sans que le
 * Conteur ait à les recalculer à la table.
 */
export interface InfoPairPreparation {
  /** Personnage montré (Villageois / Paria / Sbire selon le pouvoir concerné). */
  characterId: string
  /** Joueur possédant réellement ce personnage. */
  playerAId: string
  /** Second joueur montré (leurre). */
  playerBId: string
}

export interface Preparation {
  washerwoman: InfoPairPreparation | 'none' | null
  librarian: InfoPairPreparation | 'none' | null
  investigator: InfoPairPreparation | 'none' | null
  /** Joueur bon qui déclenchera toujours une réponse positive pour la Voyante. */
  fortuneTellerRedHerringPlayerId: string | null
  /** Personnage de Villageois absent que l'Ivrogne croit posséder. */
  drunkBelievedCharacterId: string | null
  /** Jusqu'à 3 personnages absents utilisés comme bluffs par le Diablotin. */
  impBluffCharacterIds: string[]
}

export interface Game {
  id: string
  scriptId: ScriptId
  phase: GamePhase
  storytellerLevel: StorytellerLevel

  dayNumber: number
  nightNumber: number

  players: Player[]
  composition: Composition | null
  preparation: Preparation

  activeDemonId: string | null // playerId du joueur incarnant actuellement le Démon

  /** Dernier joueur exécuté : utilisé pour déclencher le Croque-mort la nuit suivante. */
  lastExecutedPlayerId?: string | null

  gameNotes: PlayerNote[]

  publicScreenActive: boolean

  end: GameEndInfo | null

  createdAt: string
  updatedAt: string
}
