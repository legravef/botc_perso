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
    scriptId: 'over-the-river',
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

/** Over the River, scénario Teensyville officiel d’Andrew Nathenson. */
export const OVER_THE_RIVER_CHARACTERS: Character[] = [
  character({ id: 'grandmother', nameFr: 'Grand-mère', nameEn: 'Grandmother', category: 'townsfolk', description: 'La première nuit, vous apprenez un joueur bon et son personnage. Si le Démon le tue, vous mourez aussi.', first: 4, frequency: 'first-night-only', setup: true, reminders: ['Petit-enfant'] }),
  character({ id: 'clockmaker', nameFr: 'Horloger', nameEn: 'Clockmaker', category: 'townsfolk', description: 'La première nuit, vous apprenez le nombre de pas séparant le Démon de son Sbire le plus proche.', first: 5, frequency: 'first-night-only', rules: ['Deux joueurs voisins sont à 1 pas l’un de l’autre. Comptez dans les deux sens et donnez la plus petite distance.'] }),
  character({ id: 'innkeeper', nameFr: 'Aubergiste', nameEn: 'Innkeeper', category: 'townsfolk', description: 'Chaque nuit*, choisissez 2 joueurs : ils ne peuvent pas mourir cette nuit, mais l’un des deux est ivre jusqu’au crépuscule.', other: 1, frequency: 'each-night-except-first', selection: 'two-players', targets: 2, reminders: ['Protégé', 'Ivre'] }),
  character({ id: 'snakecharmer', nameFr: 'Charmeur de serpents', nameEn: 'Snake Charmer', category: 'townsfolk', description: 'Chaque nuit, choisissez un joueur en vie : si c’est un Démon, il échange de personnage et d’alignement avec vous, puis devient empoisonné.', first: 2, other: 2, frequency: 'each-night', selection: 'single-player', targets: 1, reminders: ['Empoisonné'], rules: ['Le joueur devenu Charmeur de serpents reste empoisonné de façon permanente. Le Charmeur peut se choisir lui-même.'] }),
  character({ id: 'professor', nameFr: 'Professeur', nameEn: 'Professor', category: 'townsfolk', description: 'Une fois par partie, la nuit*, choisissez un joueur mort : s’il est Villageois, il revient à la vie.', other: 6, frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['Ressuscité'] }),
  character({ id: 'slayer', nameFr: 'Pourfendeuse', nameEn: 'Slayer', category: 'townsfolk', description: 'Une fois par partie, en journée, choisissez publiquement un joueur : s’il est le Démon, il meurt.', frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['Pouvoir utilisé'] }),

  character({ id: 'lunatic', nameFr: 'Lunatique', nameEn: 'Lunatic', category: 'outsider', description: 'Vous pensez être un Démon, mais vous ne l’êtes pas. Le Démon sait qui vous êtes et qui vous choisissez la nuit.', first: 1, other: 3, frequency: 'each-night', selection: 'single-player', targets: 1, setup: true, reminders: ['Lunatique'] }),
  character({ id: 'recluse', nameFr: 'Reclus', nameEn: 'Recluse', category: 'outsider', description: 'Vous pouvez être enregistré comme méchant et comme Sbire ou Démon, même mort.', rules: ['Le Conteur peut décider séparément, pour chaque interaction, si le Reclus est enregistré comme méchant, Sbire ou Démon.'] }),

  character({ id: 'godfather', nameFr: 'Parrain', nameEn: 'Godfather', category: 'minion', description: 'Vous commencez en connaissant les Parias en jeu. Si l’un d’eux meurt aujourd’hui, choisissez un joueur cette nuit : il meurt. [−1 ou +1 Paria]', first: 3, other: 5, frequency: 'each-night', selection: 'single-player', targets: 1, setup: true, setupModifier: { type: 'choose-outsider-delta', choices: [-1, 1] }, reminders: ['A tué'] }),
  character({ id: 'spy', nameFr: 'Espionne', nameEn: 'Spy', category: 'minion', description: 'Chaque nuit, vous voyez le Grimoire. Vous pouvez être enregistrée comme bonne et comme Villageoise ou Paria, même morte.', first: 6, other: 8, frequency: 'each-night', rules: ['Le Conteur peut décider séparément, pour chaque interaction, si l’Espionne est enregistrée comme bonne, Villageoise ou Paria.'] }),

  character({ id: 'imp', nameFr: 'Diablotin', nameEn: 'Imp', category: 'demon', description: 'Chaque nuit*, choisissez un joueur : il meurt. Si vous vous choisissez vous-même ainsi, un Sbire devient le Diablotin.', other: 4, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true }),
]
