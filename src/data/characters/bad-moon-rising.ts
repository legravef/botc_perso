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
}

function character(definition: Definition): Character {
  return {
    id: definition.id,
    scriptId: 'bad-moon-rising',
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
    specialRules: [],
    drunkPoisonedNotes: "Si ce personnage est ivre ou empoisonné, son pouvoir peut ne pas fonctionner correctement ; le Conteur applique les règles du rôle.",
    setupModifier: definition.setupModifier ?? null,
    requiresSetupStep: definition.setup ?? false,
  }
}

/** Personnages officiels de Bad Moon Rising. Les textes suivent les capacités
 * de référence ; l'assistant de nuit affiche chaque rôle selon son ordre. */
export const BAD_MOON_RISING_CHARACTERS: Character[] = [
  character({ id: 'grandmother', nameFr: 'Grand-mère', nameEn: 'Grandmother', category: 'townsfolk', description: 'La première nuit, vous voyez 1 joueur gentil et son rôle. Si le Démon le tue, vous mourrez aussi.', first: 1, frequency: 'first-night-only', setup: true, reminders: ['Petit-fils'] }),
  character({ id: 'sailor', nameFr: 'Marin', nameEn: 'Sailor', category: 'townsfolk', description: 'Chaque nuit, choisissez un joueur en vie : lui ou vous serez ivre cette nuit. Vous êtes immortel si vous êtes celui resté sobre.', other: 2, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Ivre'] }),
  character({ id: 'chambermaid', nameFr: 'Concierge', nameEn: 'Chambermaid', category: 'townsfolk', description: 'Chaque nuit, choisissez 2 joueurs en vie autre que vous. Vous apprenez combien se sont réveillés cette nuit grâce à leur pouvoir.', other: 20, frequency: 'each-night-except-first', selection: 'two-players', targets: 2 }),
  character({ id: 'exorcist', nameFr: 'Exorciste', nameEn: 'Exorcist', category: 'townsfolk', description: 'Chaque nuit* (différent de la nuit précédente), choisissez 1 joueur : si c’est le Démon, il saura qui vous êtes mais ne pourra pas utiliser son pouvoir cette nuit.', other: 8, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Exorcisé'] }),
  character({ id: 'innkeeper', nameFr: 'Aubergiste', nameEn: 'Innkeeper', category: 'townsfolk', description: 'Chaque nuit*, choisissez 2 joueurs : ils ne peuvent pas mourir cette nuit, mais l’un des 2 sera ivre cette nuit et le jour suivant.', other: 3, frequency: 'each-night-except-first', selection: 'two-players', targets: 2, reminders: ['Protégé', 'Ivre'] }),
  character({ id: 'gambler', nameFr: 'Parieur', nameEn: 'Gambler', category: 'townsfolk', description: 'Chaque nuit*, choisissez un joueur et devinez son rôle. Si vous avez tort, vous mourrez.', other: 5, frequency: 'each-night-except-first', selection: 'single-player', targets: 1 }),
  character({ id: 'gossip', nameFr: 'Pipelette', nameEn: 'Gossip', category: 'townsfolk', description: 'Chaque jour, vous avez le droit de faire une déclaration publique. Si cette déclaration est vraie, un joueur mourra la prochaine nuit.', frequency: 'passive', reminders: ['A bavardé'] }),
  character({ id: 'courtier', nameFr: 'Courtisane', nameEn: 'Courtier', category: 'townsfolk', description: 'Une fois pendant la partie, la nuit, choisissez un rôle. S’il est en jeu, il sera ivre pendant 3 jours et 3 nuits.', other: 4, frequency: 'once-per-game', selection: 'none', reminders: ['Ivre x3'] }),
  character({ id: 'professor', nameFr: 'Professeur', nameEn: 'Professor', category: 'townsfolk', description: 'Une fois par partie, la nuit*, choisissez un mort. Il est ressuscité si c’est un villageois.', other: 15, frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['Ressuscité'] }),
  character({ id: 'minstrel', nameFr: 'Ménestrel', nameEn: 'Minstrel', category: 'townsfolk', description: 'Si un Sbire est exécuté, tous les autres joueurs sont ivres cette nuit et le jour suivant.', frequency: 'passive', reminders: ['Tout le monde ivre'] }),
  character({ id: 'tea-lady', nameFr: 'Herboriste', nameEn: 'Tea Lady', category: 'townsfolk', description: 'Si vos deux voisins vivants les plus proches sont gentils, ils sont immortels (nuit et exécution).', frequency: 'passive', reminders: ['Protégé'] }),
  character({ id: 'pacifist', nameFr: 'Pacifiste', nameEn: 'Pacifist', category: 'townsfolk', description: 'Les gentils peuvent survivre à leurs exécutions.', frequency: 'passive', reminders: ['Protégé'] }),
  character({ id: 'fool', nameFr: 'Bouffon', nameEn: 'Fool', category: 'townsfolk', description: 'La première fois que vous êtes censé mourir, vous survivez.', frequency: 'passive', reminders: ['A encore sa vie'] }),

  character({ id: 'goon', nameFr: 'Bras droit', nameEn: 'Goon', category: 'outsider', description: 'Chaque nuit, le 1er joueur qui vous cible grâce à son pouvoir est ivre jusqu’à la prochaine nuit. Votre alignement s’aligne au sien (gentil/méchant).', frequency: 'passive', reminders: ['A changé d’équipe'] }),
  character({ id: 'lunatic', nameFr: 'Lunatique', nameEn: 'Lunatic', category: 'outsider', description: 'Vous pensez être le démon, mais vous ne l’êtes pas. Le démon sait qui vous êtes et qui vous tuez la nuit.', first: 10, other: 7, frequency: 'each-night', selection: 'two-players', targets: 2, setup: true, reminders: ['Lunatique'] }),
  character({ id: 'tinker', nameFr: 'Inventeur', nameEn: 'Tinker', category: 'outsider', description: 'Vous pouvez mourir à n’importe quel moment.', frequency: 'passive' }),
  character({ id: 'moonchild', nameFr: 'Moonchild', nameEn: 'Moonchild', category: 'outsider', description: 'Lorsque vous apprenez votre mort, choisissez publiquement 1 joueur en vie. La nuit suivante, si c’était un gentil, il meurt.', frequency: 'on-death-trigger', selection: 'single-player', targets: 1, reminders: ['Cible'] }),

  character({ id: 'godfather', nameFr: 'Parrain', nameEn: 'Godfather', category: 'minion', description: 'La première nuit, vous savez quels parias sont en jeu. Si l’un d’eux meurt en journée, la nuit d’après, tuez quelqu’un [+1 ou -1 parias].', first: 11, other: 14, frequency: 'each-night', selection: 'single-player', targets: 1, setup: true, setupModifier: { type: 'choose-outsider-delta', choices: [-1, 1] }, reminders: ['A tué'] }),
  character({ id: 'devils-advocate', nameFr: 'Avocat du diable', nameEn: "Devil's Advocate", category: 'minion', description: 'Chaque nuit, choisissez un joueur en vie (différent de la nuit précédente). Si exécuté le lendemain, ce joueur ne meurt pas.', other: 6, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Protégé'] }),
  character({ id: 'assassin', nameFr: 'Assassin', nameEn: 'Assassin', category: 'minion', description: 'Une fois par partie, la nuit* : choisissez un joueur, il meurt, même si pour n’importe quelle raison, il est censé survivre.', other: 13, frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['A utilisé'] }),
  character({ id: 'mastermind', nameFr: 'Cerveau', nameEn: 'Mastermind', category: 'minion', description: 'Si le démon meurt par exécution (clôturant le jeu), jouez une journée de plus. Si un joueur est exécuté, son équipe perd (si personne n’est exécuté, les gentils gagnent).', frequency: 'passive', reminders: ['Jour supplémentaire'] }),

  character({ id: 'zombuul', nameFr: 'Zombuul', nameEn: 'Zombuul', category: 'demon', description: 'Chaque nuit*, si personne n’est mort pendant la journée, tuez quelqu’un. La première fois que vous mourrez, vous apparaissez comme mort mais restez en vie.', other: 9, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['Mort vivant'] }),
  character({ id: 'pukka', nameFr: 'Pukka', nameEn: 'Pukka', category: 'demon', description: 'Chaque nuit, choisissez un joueur. Il est empoisonné, puis meurt la nuit suivante (et n’est plus empoisonné).', other: 10, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['Empoisonné'] }),
  character({ id: 'shabaloth', nameFr: 'Shabaloth', category: 'demon', nameEn: 'Shabaloth', description: 'Chaque nuit*, choisissez 2 joueurs : ils meurent. L’une de vos victimes de la nuit précédente peut être « régurgitée » : elle ressuscite.', other: 11, frequency: 'each-night-except-first', selection: 'two-players', targets: 2, setup: true, reminders: ['A tué'] }),
  character({ id: 'po', nameFr: 'Po', nameEn: 'Po', category: 'demon', description: 'Chaque nuit*, vous pouvez choisir un joueur : il meurt. Si la nuit précédente vous n’avez choisi personne, vous êtes obligé de tuer 3 joueurs cette nuit-là.', other: 12, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['A chargé'] }),
]

const pukka = BAD_MOON_RISING_CHARACTERS.find((character) => character.id === 'pukka')
if (pukka) {
  pukka.firstNightOrder = 15
  pukka.actionFrequency = 'each-night'
}
