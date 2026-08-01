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
  /** Bad Moon Rising — joueur bon montré à la Grand-mère la première nuit (aussi utilisé pour sa malédiction). */
  grandmotherRevealPlayerId: string | null
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

  /** Bad Moon Rising — Cerveau : numéro du jour où une exécution en attente doit trancher la
   * partie (démon exécuté avec un Cerveau vivant). null si aucun jour supplémentaire n'est dû. */
  mastermindExtraDayDueOnDay?: number | null
  /** Bad Moon Rising — Po : le prochain réveil doit tuer 3 joueurs car Po n'a tué personne la nuit précédente. */
  poMustKillThree?: boolean
  /** Bad Moon Rising — Courtisane : numéro de nuit après lequel le rappel "Ivre" posé par la Courtisane doit être retiré automatiquement. */
  courtierExpiresOnNight?: number | null
  /** Bad Moon Rising — Parrain : variation choisie à la composition (+1 ou -1 Paria). */
  godfatherOutsiderDelta?: -1 | 0 | 1
  /** Bad Moon Rising — mémoire de la cible de l’Exorciste. */
  lastExorcistTargetId?: string | null
  /** Bad Moon Rising — le Parrain peut tuer cette nuit après la mort diurne d’un Paria. */
  godfatherKillDue?: boolean
  /** Bad Moon Rising — victimes de la dernière attaque du Shabaloth, disponibles à la régurgitation. */
  shabalothVictimIds?: string[]
  /** Bad Moon Rising — Pipelette : une déclaration vraie impose une mort la nuit suivante. */
  gossipKillDue?: boolean
  /** Bad Moon Rising — Moonchild : cible choisie publiquement au moment de sa mort. */
  moonchildTargetId?: string | null
  moonchildTargetWasGood?: boolean | null

  gameNotes: PlayerNote[]

  publicScreenActive: boolean

  end: GameEndInfo | null

  createdAt: string
  updatedAt: string
}
