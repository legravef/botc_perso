/**
 * Modèle de données des personnages, indépendant de l'UI.
 * Une seule de ces structures alimente la fiche personnage, le moteur de
 * composition, l'assistant de nuit et l'écran de révélation.
 */

export type CharacterCategory = 'townsfolk' | 'outsider' | 'minion' | 'demon'

/** Alignement réel du personnage (fixe, indépendant de ce qu'il "semble" être). */
export type Team = 'good' | 'evil'

export type ScriptId = 'trouble-brewing' | 'bad-moon-rising'

/**
 * À quel rythme le pouvoir s'exerce.
 */
export type ActionFrequency =
  | 'passive' // pas d'action consciente (ex. Saint, Reclus)
  | 'first-night-only' // agit uniquement lors de la 1ère nuit
  | 'each-night' // agit chaque nuit (y compris la 1ère selon otherNightOrder/firstNightOrder)
  | 'each-night-except-first' // agit chaque nuit sauf la 1ère (ex. Moine, Empoisonneur, Gardien)
  | 'once-per-game' // pouvoir à usage unique déclenché par le joueur (ex. Mercenaire)
  | 'on-death-trigger' // se déclenche à la mort dans certaines conditions (ex. Gardien, Confidente)
  | 'on-nomination-trigger' // se déclenche lors d'une nomination (ex. Vierge)
  | 'on-execution-trigger' // se déclenche à l'exécution (ex. Saint)

export type SelectionType =
  | 'none' // aucune sélection de joueur
  | 'single-player'
  | 'two-players'
  | 'choose-master' // Majordome

/**
 * Modificateurs de composition déclarés (pas de code arbitraire) afin que
 * `applySetupModifiers` reste une fonction pure et prévisible.
 */
export type SetupModifier =
  | { type: 'add-outsiders-remove-townsfolk'; count: number } // Baron
  | { type: 'choose-outsider-delta'; choices: readonly [-1, 1] } // Godfather
  | null

export interface Character {
  id: string
  scriptId: ScriptId
  nameFr: string
  nameEn: string
  category: CharacterCategory
  team: Team
  shortDescription: string
  fullDescription: string

  /** Position dans l'ordre de la première nuit, null si le personnage n'agit pas cette nuit-là. */
  firstNightOrder: number | null
  /** Position dans l'ordre des nuits suivantes, null si le personnage n'agit jamais après la 1ère nuit. */
  otherNightOrder: number | null

  actionFrequency: ActionFrequency
  selectionType: SelectionType
  targetCount: number

  /** Libellés des rappels (jetons) que ce personnage peut poser sur un joueur. */
  reminders: string[]

  /** Règles spéciales en langage clair, affichées dans l'aide contextuelle "Pourquoi ?". */
  specialRules: string[]

  /** Comportement du pouvoir en cas d'ivresse/empoisonnement, en langage clair. */
  drunkPoisonedNotes: string

  /** Effet sur la composition (Baron uniquement dans Trouble Brewing). */
  setupModifier: SetupModifier

  /** true si ce personnage, une fois choisi, nécessite une étape de configuration
   * dédiée pendant la préparation (Ivrogne, Diablotin, Diseuse...). */
  requiresSetupStep: boolean
}
