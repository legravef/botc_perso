import type { ActionFrequency, Character, SelectionType } from '@/types'

type Definition = {
  id: string
  nameFr: string
  nameEn: string
  category: Character['category']
  description: string
  first?: number
  other?: number
  frequency?: ActionFrequency
  selection?: SelectionType
  targets?: number
  reminders?: string[]
  setup?: boolean
  setupModifier?: Character['setupModifier']
  rules?: string[]
}

function character(definition: Definition): Character {
  return {
    id: definition.id,
    scriptId: 'no-greater-joy',
    nameFr: definition.nameFr,
    nameEn: definition.nameEn,
    category: definition.category,
    team: definition.category === 'minion' || definition.category === 'demon' ? 'evil' : 'good',
    shortDescription: definition.description,
    fullDescription: definition.description,
    firstNightOrder: definition.first ?? null,
    otherNightOrder: definition.other ?? null,
    actionFrequency: definition.frequency ?? 'passive',
    selectionType: definition.selection ?? 'none',
    targetCount: definition.targets ?? 0,
    reminders: definition.reminders ?? [],
    specialRules: definition.rules ?? [],
    drunkPoisonedNotes: 'S’il est ivre ou empoisonné, son pouvoir ne fonctionne pas et les informations reçues peuvent être fausses.',
    setupModifier: definition.setupModifier ?? null,
    requiresSetupStep: definition.setup ?? false,
  }
}

/** No Greater Joy, scénario Teensyville officiel de Steven Medway. */
export const NO_GREATER_JOY_CHARACTERS: Character[] = [
  character({ id: 'clockmaker', nameFr: 'Horloger', nameEn: 'Clockmaker', category: 'townsfolk', description: 'La première nuit, vous apprenez le nombre de pas séparant le Démon de son Sbire le plus proche.', first: 1, frequency: 'first-night-only', rules: ['Deux joueurs voisins sont à 1 pas l’un de l’autre. Comptez dans les deux sens et donnez la plus petite distance.'] }),
  character({ id: 'investigator', nameFr: 'Enquêteur', nameEn: 'Investigator', category: 'townsfolk', description: 'La première nuit, vous voyez 2 joueurs et un rôle de Sbire. L’un des deux est ce rôle.', first: 2, frequency: 'first-night-only', setup: true }),
  character({ id: 'empath', nameFr: 'Empathique', nameEn: 'Empath', category: 'townsfolk', description: 'Chaque nuit, vous apprenez combien de vos 2 voisins vivants les plus proches sont méchants.', first: 3, other: 1, frequency: 'each-night' }),
  character({ id: 'chambermaid', nameFr: 'Concierge', nameEn: 'Chambermaid', category: 'townsfolk', description: 'Chaque nuit, choisissez 2 autres joueurs en vie : vous apprenez combien se sont réveillés cette nuit grâce à leur pouvoir.', first: 4, other: 4, frequency: 'each-night', selection: 'two-players', targets: 2 }),
  character({ id: 'sage', nameFr: 'Sage', nameEn: 'Sage', category: 'townsfolk', description: 'Si le Démon vous tue, vous apprenez que le Démon est l’un de 2 joueurs.', frequency: 'on-death-trigger', rules: ['Le Sage ne se réveille que s’il est mort à cause du pouvoir du Démon. Montrez deux joueurs, dont le Démon vivant.'] }),
  character({ id: 'artist', nameFr: 'Artiste', nameEn: 'Artist', category: 'townsfolk', description: 'Une fois par partie, en journée, posez en privé au Conteur une question à laquelle il répond par oui ou non.', frequency: 'once-per-game', reminders: ['Question posée'] }),

  character({ id: 'drunk', nameFr: 'Ivrogne', nameEn: 'Drunk', category: 'outsider', description: 'Vous ne savez pas que vous êtes ivre. Vous pensez être un Villageois absent, mais son pouvoir ne fonctionne pas et vos informations peuvent être fausses.', setup: true }),
  character({ id: 'klutz', nameFr: 'Maladroit', nameEn: 'Klutz', category: 'outsider', description: 'Lorsque vous apprenez votre mort, choisissez publiquement un autre joueur en vie. Si vous choisissez un méchant, votre équipe perd.', frequency: 'on-death-trigger', selection: 'single-player', targets: 1, reminders: ['Choix effectué'] }),

  character({ id: 'baron', nameFr: 'Baron', nameEn: 'Baron', category: 'minion', description: 'À 6 joueurs, le nombre initial de Parias est modifié. [+1 Paria]', setup: true, setupModifier: { type: 'add-outsiders-remove-townsfolk', count: 2 }, rules: ['No Greater Joy contient seulement deux Parias : puisqu’un Paria est déjà prévu à 6 joueurs, le Baron n’en ajoute qu’un.'] }),
  character({ id: 'scarlet-woman', nameFr: 'Confidente', nameEn: 'Scarlet Woman', category: 'minion', description: 'Si le Démon meurt alors qu’il reste au moins 5 joueurs en vie, vous devenez le Démon.', frequency: 'on-death-trigger', reminders: ['Devient le Démon'] }),

  character({ id: 'imp', nameFr: 'Diablotin', nameEn: 'Imp', category: 'demon', description: 'Chaque nuit*, choisissez un joueur : il meurt. Si vous vous choisissez vous-même, un Sbire devient le Diablotin.', other: 2, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true }),
]
