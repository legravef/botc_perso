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
    setupModifier: null,
    requiresSetupStep: definition.setup ?? false,
  }
}

/** Personnages officiels de Bad Moon Rising. Les textes suivent les capacités
 * de référence ; l'assistant de nuit affiche chaque rôle selon son ordre. */
export const BAD_MOON_RISING_CHARACTERS: Character[] = [
  character({ id: 'grandmother', nameFr: 'Grand-mère', nameEn: 'Grandmother', category: 'townsfolk', description: 'Vous commencez en connaissant un Villageois et son rôle. Si le Démon tue ce joueur, vous mourrez aussi.', first: 1, frequency: 'first-night-only', setup: true, reminders: ['Petit-fils'] }),
  character({ id: 'sailor', nameFr: 'Marin', nameEn: 'Sailor', category: 'townsfolk', description: 'Chaque nuit, choisissez un joueur : vous ou lui êtes ivre, mais vous ne pouvez pas mourir cette nuit.', other: 2, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Ivre'] }),
  character({ id: 'chambermaid', nameFr: 'Concierge', nameEn: 'Chambermaid', category: 'townsfolk', description: 'Chaque nuit, choisissez deux joueurs : vous apprenez combien se sont réveillés à cause de leur capacité cette nuit.', other: 3, frequency: 'each-night-except-first', selection: 'two-players', targets: 2 }),
  character({ id: 'exorcist', nameFr: 'Exorciste', nameEn: 'Exorcist', category: 'townsfolk', description: 'Chaque nuit, choisissez un joueur : s’il est le Démon, il apprend qui vous êtes mais ne se réveille pas ce soir.', other: 4, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Exorcisé'] }),
  character({ id: 'innkeeper', nameFr: 'Aubergiste', nameEn: 'Innkeeper', category: 'townsfolk', description: 'Chaque nuit, choisissez deux joueurs : ils ne peuvent pas mourir cette nuit, mais l’un des deux est ivre jusqu’au prochain jour.', other: 5, frequency: 'each-night-except-first', selection: 'two-players', targets: 2, reminders: ['Protégé', 'Ivre'] }),
  character({ id: 'gambler', nameFr: 'Parieur', nameEn: 'Gambler', category: 'townsfolk', description: 'Chaque nuit, choisissez un joueur et devinez son rôle. Si vous avez tort, vous mourrez.', other: 6, frequency: 'each-night-except-first', selection: 'single-player', targets: 1 }),
  character({ id: 'gossip', nameFr: 'Commère', nameEn: 'Gossip', category: 'townsfolk', description: 'Chaque jour, vous pouvez faire publiquement une déclaration. Si elle est vraie, un joueur meurt cette nuit.', frequency: 'passive', reminders: ['A bavardé'] }),
  character({ id: 'courtier', nameFr: 'Courtisan', nameEn: 'Courtier', category: 'townsfolk', description: 'Une fois par partie, la nuit, choisissez un personnage : s’il est en jeu, il est ivre pendant 3 jours et 3 nuits.', other: 7, frequency: 'once-per-game', selection: 'none', reminders: ['Ivre x3'] }),
  character({ id: 'professor', nameFr: 'Professeur', nameEn: 'Professor', category: 'townsfolk', description: 'Une fois par partie, la nuit, choisissez un joueur mort : s’il est Villageois, il est ressuscité.', other: 8, frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['Ressuscité'] }),
  character({ id: 'minstrel', nameFr: 'Ménestrel', nameEn: 'Minstrel', category: 'townsfolk', description: 'Si un Sbire meurt par exécution, tous les joueurs (sauf les morts) sont ivres jusqu’au prochain crépuscule.', frequency: 'passive', reminders: ['Tout le monde ivre'] }),
  character({ id: 'tea-lady', nameFr: 'Dame de thé', nameEn: 'Tea Lady', category: 'townsfolk', description: 'Si vos deux voisins vivants sont bons, ils ne peuvent pas mourir.', frequency: 'passive', reminders: ['Protégé'] }),
  character({ id: 'pacifist', nameFr: 'Pacifiste', nameEn: 'Pacifist', category: 'townsfolk', description: 'Les joueurs bons que vous avez nommés ne peuvent pas mourir par exécution.', frequency: 'passive', reminders: ['Protégé'] }),
  character({ id: 'fool', nameFr: 'Fou', nameEn: 'Fool', category: 'townsfolk', description: 'La première fois que vous mourriez, vous ne mourez pas.', frequency: 'passive', reminders: ['A encore sa vie'] }),

  character({ id: 'goon', nameFr: 'Brute', nameEn: 'Goon', category: 'outsider', description: 'Chaque nuit, le premier joueur à vous choisir avec sa capacité devient votre alignement.', first: 9, other: 9, frequency: 'each-night', reminders: ['A changé d’équipe'] }),
  character({ id: 'lunatic', nameFr: 'Lunatique', nameEn: 'Lunatic', category: 'outsider', description: 'Vous pensez être un Démon, mais vous ne l’êtes pas. Le Démon sait qui vous êtes et quelles cibles vous choisissez la nuit.', first: 10, other: 10, frequency: 'each-night', selection: 'two-players', targets: 2, setup: true, reminders: ['Lunatique'] }),
  character({ id: 'tinker', nameFr: 'Bricoleur', nameEn: 'Tinker', category: 'outsider', description: 'Vous pouvez mourir à n’importe quel moment.', frequency: 'passive' }),
  character({ id: 'moonchild', nameFr: 'Enfant de la lune', nameEn: 'Moonchild', category: 'outsider', description: 'Si vous apprenez que vous êtes mort, choisissez publiquement un joueur : il meurt cette nuit.', frequency: 'on-death-trigger', selection: 'single-player', targets: 1, reminders: ['Cible'] }),

  character({ id: 'godfather', nameFr: 'Parrain', nameEn: 'Godfather', category: 'minion', description: 'Vous commencez en connaissant les Parias en jeu. Si un Paria meurt, vous choisissez un joueur : il meurt cette nuit.', first: 11, other: 11, frequency: 'each-night', selection: 'single-player', targets: 1, setup: true, reminders: ['A tué'] }),
  character({ id: 'devils-advocate', nameFr: 'Avocat du diable', nameEn: "Devil's Advocate", category: 'minion', description: 'Chaque nuit, choisissez un joueur vivant (différent de la dernière cible) : s’il est exécuté demain, il ne meurt pas.', other: 12, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, reminders: ['Protégé'] }),
  character({ id: 'assassin', nameFr: 'Assassin', nameEn: 'Assassin', category: 'minion', description: 'Une fois par partie, la nuit, choisissez un joueur : il meurt, même s’il est protégé.', other: 13, frequency: 'once-per-game', selection: 'single-player', targets: 1, reminders: ['A utilisé'] }),
  character({ id: 'mastermind', nameFr: 'Cerveau', nameEn: 'Mastermind', category: 'minion', description: 'Si le Démon est exécuté, le jeu continue pendant un jour supplémentaire. Si personne n’est exécuté ce jour-là, le Mal gagne.', frequency: 'passive', reminders: ['Jour supplémentaire'] }),

  character({ id: 'zombuul', nameFr: 'Zombuul', nameEn: 'Zombuul', category: 'demon', description: 'Chaque nuit*, choisissez un joueur : il meurt. La première fois que vous mourriez, vous êtes seulement mort aux yeux des autres et continuez à agir.', other: 14, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['Mort vivant'] }),
  character({ id: 'pukka', nameFr: 'Pukka', nameEn: 'Pukka', category: 'demon', description: 'Chaque nuit, choisissez un joueur : il est empoisonné. La cible précédente meurt puis n’est plus empoisonnée.', other: 15, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['Empoisonné'] }),
  character({ id: 'shabaloth', nameFr: 'Shabaloth', nameEn: 'Shabaloth', category: 'demon', description: 'Chaque nuit*, choisissez deux joueurs : ils meurent. Une cible précédente peut ressusciter.', other: 16, frequency: 'each-night-except-first', selection: 'two-players', targets: 2, setup: true, reminders: ['A tué'] }),
  character({ id: 'po', nameFr: 'Po', nameEn: 'Po', category: 'demon', description: 'Chaque nuit*, choisissez un joueur : il meurt. Si vous n’avez tué personne la nuit précédente, choisissez trois joueurs : ils meurent.', other: 17, frequency: 'each-night-except-first', selection: 'single-player', targets: 1, setup: true, reminders: ['A chargé'] }),
]

const pukka = BAD_MOON_RISING_CHARACTERS.find((character) => character.id === 'pukka')
if (pukka) {
  pukka.firstNightOrder = 15
  pukka.actionFrequency = 'each-night'
}
