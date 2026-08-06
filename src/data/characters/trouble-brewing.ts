import type { Character } from '@/types'

/**
 * Personnages du scénario Trouble Brewing.
 *
 * Sources utilisées pour la vérification des règles :
 * - Site/wiki officiel Blood on the Clocktower (wiki.bloodontheclocktower.com),
 *   utilisé comme référence de fond pour l'ordre de nuit, le vote fantôme,
 *   le seuil d'exécution et les mécaniques d'ivresse/empoisonnement.
 * - Documents fournis par l'utilisateur (texte officiel des pouvoirs FR,
 *   feuille d'ordre de nuit "Trouble Brewing") utilisés pour la traduction
 *   et la confirmation croisée de l'ordre de nuit.
 *
 * Les noms français retenus ici (Libraire, Empathique, Voyante, Gardien,
 * Mercenaire, Confidente, catégorie "Parias") suivent exactement la feuille
 * de rôles physique fournie par l'utilisateur ("trouble brewing rôle 3.0"),
 * qui sera imprimée et distribuée aux joueurs — l'application doit donc
 * employer la même terminologie qu'eux plutôt qu'une autre traduction
 * française possible (ex. Bibliothécaire, Diseuse de bonne aventure,
 * Gardien des corbeaux, Pourfendeur, Femme écarlate, Étrangers).
 */
export const TROUBLE_BREWING_CHARACTERS: Character[] = [
  // ---------------------------------------------------------------------
  // VILLAGEOIS (Townsfolk)
  // ---------------------------------------------------------------------
  {
    id: 'washerwoman',
    scriptId: 'trouble-brewing',
    nameFr: 'Lavandière',
    nameEn: 'Washerwoman',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "La première nuit, vous voyez 2 joueurs et un rôle de villageois. L'un des deux joueurs est ce rôle.",
    fullDescription:
      "Le Conteur choisit un Villageois réellement en jeu et un second joueur (n'importe qui d'autre). " +
      "La Lavandière voit ces deux joueurs et le rôle de Villageois indiqué, sans savoir lequel des deux " +
      "le possède réellement.",
    firstNightOrder: 2,
    otherNightOrder: null,
    actionFrequency: 'first-night-only',
    selectionType: 'none',
    targetCount: 0,
    reminders: ['Villageois', 'Faux'],
    specialRules: [
      "Le Conteur choisit librement quel Villageois et quel second joueur montrer, tant que le Villageois choisi est réellement en jeu.",
      "Si l'Espion ou le Reclus peuvent légalement apparaître comme ce Villageois, le Conteur peut les utiliser comme le \"vrai\" ou le \"faux\" joueur.",
    ],
    drunkPoisonedNotes:
      "Si la Lavandière est ivre ou empoisonnée, son pouvoir ne fonctionne pas : le Conteur peut lui montrer une paire de joueurs et un rôle sans lien avec la réalité.",
    setupModifier: null,
    requiresSetupStep: true,
  },
  {
    id: 'librarian',
    scriptId: 'trouble-brewing',
    nameFr: 'Libraire',
    nameEn: 'Librarian',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "La première nuit, vous voyez 2 joueurs et un rôle de Paria. L'un des deux joueurs est ce rôle. (Ou vous apprenez qu'aucun Paria n'est en jeu.)",
    fullDescription:
      "Comme la Lavandière, mais pour un Paria. Si aucun Paria n'est en jeu, le Conteur informe la " +
      "Libraire qu'aucun Paria ne fait partie de la partie.",
    firstNightOrder: 3,
    otherNightOrder: null,
    actionFrequency: 'first-night-only',
    selectionType: 'none',
    targetCount: 0,
    reminders: ['Paria', 'Faux'],
    specialRules: [
      "Si la composition ne comporte aucun Paria, préparer l'information \"aucun Paria en jeu\" plutôt qu'une paire de joueurs.",
      "Interactions possibles avec l'Espion (peut apparaître comme Paria) et le Reclus (peut apparaître comme Paria via son apparence de Villageois/Paria... en réalité le Reclus apparaît comme méchant, donc n'est pas concerné ici sauf choix du Conteur pour brouiller les pistes dans les limites des règles).",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonnée, le pouvoir ne fonctionne pas : information libre du Conteur, vraie ou fausse.",
    setupModifier: null,
    requiresSetupStep: true,
  },
  {
    id: 'investigator',
    scriptId: 'trouble-brewing',
    nameFr: 'Enquêteur',
    nameEn: 'Investigator',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "La première nuit, vous voyez 2 joueurs et un rôle de Sbire. L'un des deux est ce rôle.",
    fullDescription:
      "Le Conteur choisit un Sbire réellement en jeu et un second joueur. L'Enquêteur voit les deux joueurs " +
      "et le rôle de Sbire indiqué, sans savoir lequel des deux le possède réellement.",
    firstNightOrder: 4,
    otherNightOrder: null,
    actionFrequency: 'first-night-only',
    selectionType: 'none',
    targetCount: 0,
    reminders: ['Sbire', 'Faux'],
    specialRules: [
      "Le Reclus peut légalement apparaître comme le Sbire montré, si le Conteur le décide.",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonné, le pouvoir ne fonctionne pas : information libre du Conteur, vraie ou fausse.",
    setupModifier: null,
    requiresSetupStep: true,
  },
  {
    id: 'chef',
    scriptId: 'trouble-brewing',
    nameFr: 'Chef',
    nameEn: 'Chef',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "La première nuit, vous apprenez combien il y a de paires de joueurs méchants assis côte à côte.",
    fullDescription:
      "Le Conteur compte, autour du cercle, le nombre de paires de joueurs maléfiques adjacents (le premier " +
      "et le dernier joueur du cercle sont voisins). Chaque paire adjacente compte une fois ; trois méchants " +
      "d'affilée comptent pour deux paires.",
    firstNightOrder: 5,
    otherNightOrder: null,
    actionFrequency: 'first-night-only',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "Le premier et le dernier joueur du cercle sont voisins l'un de l'autre.",
      "L'Espion compte toujours comme méchant pour ce calcul.",
      "Le Reclus compte comme méchant uniquement si le Conteur choisit de le faire apparaître ainsi pour cette information.",
    ],
    drunkPoisonedNotes:
      "Si le Chef est ivre ou empoisonné, le nombre annoncé peut être arbitraire (vrai ou faux) au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'empath',
    scriptId: 'trouble-brewing',
    nameFr: 'Empathique',
    nameEn: 'Empath',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Chaque nuit, vous savez si 0, 1 ou 2 de vos deux voisins vivants les plus proches sont méchants.",
    fullDescription:
      "Le Conteur regarde les deux voisins vivants les plus proches de l'Empathique autour du cercle (en ignorant " +
      "les joueurs morts) et annonce combien d'entre eux sont maléfiques : 0, 1 ou 2.",
    firstNightOrder: 6,
    otherNightOrder: 6,
    actionFrequency: 'each-night',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "Les voisins pris en compte sont les plus proches joueurs VIVANTS de chaque côté, en sautant les morts.",
      "L'Espion et le Reclus peuvent influencer ce nombre selon l'apparence choisie par le Conteur.",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonnée, le nombre annoncé peut être faux, au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'fortune-teller',
    scriptId: 'trouble-brewing',
    nameFr: 'Voyante',
    nameEn: 'Fortune Teller',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Chaque nuit, choisissez 2 joueurs : vous apprenez si l'un d'eux est le Démon. Il existe un joueur bon qui déclenche toujours une réponse positive (le leurre).",
    fullDescription:
      "Chaque nuit, la Diseuse désigne deux joueurs. Le Conteur répond OUI si l'un des deux est le Démon " +
      "réel, ou si l'un des deux est le leurre désigné en préparation de partie (un joueur bon qui déclenche " +
      "toujours une réponse positive, pour brouiller la piste).",
    firstNightOrder: 7,
    otherNightOrder: 7,
    actionFrequency: 'each-night',
    selectionType: 'two-players',
    targetCount: 2,
    reminders: ['Leurre'],
    specialRules: [
      "Le leurre est choisi une seule fois, en préparation de partie, parmi les joueurs bons, et reste fixe toute la partie.",
      "Le Reclus peut déclencher une réponse positive s'il apparaît comme le Démon, selon la décision du Conteur.",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonnée, la réponse peut être fausse (y compris ignorer un vrai Démon ou le leurre), au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: true,
  },
  {
    id: 'undertaker',
    scriptId: 'trouble-brewing',
    nameFr: 'Croque-mort',
    nameEn: 'Undertaker',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Chaque nuit (sauf la première), vous apprenez le rôle du joueur exécuté le jour précédent.",
    fullDescription:
      "Si un joueur a été exécuté durant la journée qui vient de s'écouler, le Croque-mort apprend, la nuit " +
      "suivante, le personnage réel que possédait ce joueur au moment de son exécution (par exemple \"Ivrogne\" " +
      "si l'Ivrogne a été exécuté). Si personne n'a été exécuté, le Croque-mort n'est pas réveillé.",
    firstNightOrder: null,
    otherNightOrder: 8,
    actionFrequency: 'each-night-except-first',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "Ne se déclenche qu'après une exécution effective, jamais après une mort nocturne.",
      "Montre toujours le personnage réel, pas le personnage cru (sauf cas de l'Ivrogne, où le personnage réel EST \"Ivrogne\").",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonné, le rôle annoncé peut être faux, au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'monk',
    scriptId: 'trouble-brewing',
    nameFr: 'Moine',
    nameEn: 'Monk',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Chaque nuit (sauf la première), choisissez un joueur autre que vous. Il est protégé du pouvoir du Démon cette nuit.",
    fullDescription:
      "Le joueur protégé ne peut pas mourir cette nuit par le pouvoir du Démon. Le Moine ne peut pas se " +
      "protéger lui-même.",
    firstNightOrder: null,
    otherNightOrder: 2,
    actionFrequency: 'each-night-except-first',
    selectionType: 'single-player',
    targetCount: 1,
    reminders: ['Protégé'],
    specialRules: [
      "Le Moine ne peut pas se choisir lui-même.",
      "La protection ne couvre que le pouvoir du Démon, pas les autres causes de mort.",
    ],
    drunkPoisonedNotes:
      "Si le Moine est ivre ou empoisonné, la protection ne fonctionne pas réellement : si le Démon cible ce joueur, il meurt quand même. Le Conteur ne révèle jamais cet état publiquement.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'ravenkeeper',
    scriptId: 'trouble-brewing',
    nameFr: 'Gardien',
    nameEn: 'Ravenkeeper',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Si vous mourez pendant la nuit, choisissez un joueur : le Conteur vous révèle son rôle.",
    fullDescription:
      "Si le Gardien meurt pendant la nuit (typiquement tué par le Démon), il est immédiatement " +
      "réveillé pour choisir un joueur et apprendre son personnage réel avant la fin de la nuit.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'on-death-trigger',
    selectionType: 'single-player',
    targetCount: 1,
    reminders: [],
    specialRules: [
      "Ne se déclenche que s'il meurt pendant la nuit, jamais s'il meurt par exécution ou une autre cause diurne.",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonné, le rôle révélé peut être faux, au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'virgin',
    scriptId: 'trouble-brewing',
    nameFr: 'Vierge',
    nameEn: 'Virgin',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "La première fois que vous êtes nominée, si le nominant est un Villageois, il est immédiatement exécuté.",
    fullDescription:
      "Si la première nomination de la Vierge est faite par un Villageois vivant (ou un joueur apparaissant " +
      "légalement comme tel), ce nominant est immédiatement exécuté et la journée se termine sur-le-champ. " +
      "Le pouvoir n'est utilisable qu'une seule fois.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'on-nomination-trigger',
    selectionType: 'none',
    targetCount: 0,
    reminders: ['Pouvoir utilisé', 'Pas de pouvoir'],
    specialRules: [
      "Seule la toute première nomination de la Vierge peut déclencher le pouvoir.",
      "Le nominant doit être un Villageois vivant, ou un joueur apparaissant légalement comme Villageois (Espion, Ivrogne se croyant Villageois).",
      "Si la Vierge est ivre ou empoisonnée, le Conteur décide si le pouvoir se déclenche ou non.",
    ],
    drunkPoisonedNotes:
      "Si ivre ou empoisonnée, le pouvoir peut simplement ne pas se déclencher : le nominant n'est pas exécuté, au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'slayer',
    scriptId: 'trouble-brewing',
    nameFr: 'Mercenaire',
    nameEn: 'Slayer',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "Une fois par partie, en journée, désignez publiquement un joueur : si c'est le Démon, il meurt.",
    fullDescription:
      "Le Mercenaire peut, à n'importe quel moment du jour, déclarer publiquement utiliser son pouvoir sur " +
      "un joueur. Si la cible est le Démon réel (ou apparaît légalement comme tel), elle meurt immédiatement. " +
      "Sinon, il ne se passe rien de visible. Le pouvoir n'est utilisable qu'une seule fois par partie, qu'il " +
      "fonctionne ou non.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'once-per-game',
    selectionType: 'single-player',
    targetCount: 1,
    reminders: ['Pouvoir utilisé'],
    specialRules: [
      "Le pouvoir est consommé dès son utilisation, que la cible soit le Démon ou non.",
      "Le Reclus peut apparaître comme le Démon et donc \"mourir\" au Mercenaire selon la décision du Conteur.",
    ],
    drunkPoisonedNotes:
      "Si le Mercenaire est ivre ou empoisonné, son pouvoir ne fonctionne pas réellement, même sur le vrai Démon : il ne meurt pas. Le Conteur ne révèle jamais cet état.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'soldier',
    scriptId: 'trouble-brewing',
    nameFr: 'Soldat',
    nameEn: 'Soldier',
    category: 'townsfolk',
    team: 'good',
    shortDescription: 'Vous êtes invulnérable au pouvoir du Démon.',
    fullDescription:
      'Le Soldat ne peut pas être tué par le pouvoir du Démon, tant que son propre pouvoir fonctionne ' +
      "normalement (c'est-à-dire tant qu'il n'est ni ivre ni empoisonné).",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'passive',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "L'immunité ne protège que contre le pouvoir du Démon, pas contre l'exécution ni d'autres effets.",
    ],
    drunkPoisonedNotes:
      "Si le Soldat est ivre ou empoisonné, son immunité ne fonctionne pas réellement : le Démon peut le tuer normalement.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'mayor',
    scriptId: 'trouble-brewing',
    nameFr: 'Maire',
    nameEn: 'Mayor',
    category: 'townsfolk',
    team: 'good',
    shortDescription:
      "S'il ne reste que 3 joueurs vivants et qu'aucune exécution n'a lieu, votre équipe gagne. Si vous devez mourir la nuit, un autre joueur peut mourir à votre place.",
    fullDescription:
      "Deux effets distincts. (1) Fin de partie : si, à un moment où il ne reste que trois joueurs vivants, " +
      "une journée se termine sans exécution, le Bien gagne immédiatement. (2) Substitution nocturne : si le " +
      "Démon choisit le Maire comme victime, le Conteur peut choisir de faire mourir un autre joueur à sa " +
      "place à la place du Maire — ce n'est jamais automatique, c'est une décision du Conteur à chaque fois.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'passive',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      'La substitution nocturne est une option laissée au Conteur, jamais une obligation.',
      "La victoire à 3 joueurs sans exécution s'applique même si le Maire est mort.",
    ],
    drunkPoisonedNotes:
      "Si le Maire est ivre ou empoisonné, les deux effets peuvent être ignorés par le Conteur (le pouvoir ne fonctionne pas réellement).",
    setupModifier: null,
    requiresSetupStep: false,
  },

  // ---------------------------------------------------------------------
  // ÉTRANGERS (Outsiders)
  // ---------------------------------------------------------------------
  {
    id: 'butler',
    scriptId: 'trouble-brewing',
    nameFr: 'Majordome',
    nameEn: 'Butler',
    category: 'outsider',
    team: 'good',
    shortDescription:
      'Chaque nuit, choisissez un joueur autre que vous. Le lendemain, vous ne pouvez voter que si ce joueur vote aussi (en même temps ou juste avant vous).',
    fullDescription:
      "Le maître choisi change chaque nuit. Le jour suivant, le vote du Majordome n'est valide que si son " +
      "maître a également voté sur la même nomination.",
    firstNightOrder: 8,
    otherNightOrder: 9,
    actionFrequency: 'each-night',
    selectionType: 'choose-master',
    targetCount: 1,
    reminders: ['Maître'],
    specialRules: [
      "L'identité du maître reste privée : elle n'est jamais révélée publiquement.",
      'Le Conteur peut accepter ou annuler un vote du Majordome fait sans son maître.',
    ],
    drunkPoisonedNotes:
      'Si le Majordome est ivre ou empoisonné, la contrainte peut ne pas fonctionner réellement : le Conteur peut laisser passer un vote sans le maître.',
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'drunk',
    scriptId: 'trouble-brewing',
    nameFr: 'Ivrogne',
    nameEn: 'Drunk',
    category: 'outsider',
    team: 'good',
    shortDescription:
      "Vous ne savez pas que vous êtes ivre. Vous pensez avoir le rôle d'un Villageois qui n'est pas réellement en jeu. Votre pouvoir ne fonctionne pas et vos informations peuvent être fausses.",
    fullDescription:
      "L'Ivrogne reçoit un jeton de Villageois (choisi parmi les Villageois absents de cette partie) et croit " +
      "sincèrement posséder ce personnage et son pouvoir. En réalité, il est en permanence sous l'effet de " +
      "l'ivresse : son pouvoir ne fonctionne jamais, et le Conteur peut lui donner des informations vraies ou " +
      "fausses comme pour n'importe quel joueur ivre.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'passive',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "Le personnage cru doit être un Villageois qui n'est pas réellement distribué à un autre joueur.",
      "L'Ivrogne est simulé pendant les phases de nuit correspondant à son personnage cru, pour ne pas le trahir aux autres joueurs.",
    ],
    drunkPoisonedNotes:
      "L'Ivrogne est fonctionnellement toujours \"ivre\" en plus de son statut de Paria : son pouvoir cru ne fonctionne jamais, et un empoisonnement additionnel ne change rien de visible.",
    setupModifier: null,
    requiresSetupStep: true,
  },
  {
    id: 'recluse',
    scriptId: 'trouble-brewing',
    nameFr: 'Reclus',
    nameEn: 'Recluse',
    category: 'outsider',
    team: 'good',
    shortDescription:
      'Vous pouvez apparaître comme un méchant (Sbire ou Démon) aux yeux des autres pouvoirs, même une fois mort.',
    fullDescription:
      "Chaque fois qu'un pouvoir d'un autre personnage identifie ou compte les joueurs maléfiques (Enquêteur, " +
      "Chef, Empathique, Voyante...), le Conteur peut choisir de faire apparaître le Reclus " +
      "comme un Sbire ou comme le Démon. C'est une option, jamais une obligation, et l'apparence peut varier " +
      "d'une interaction à l'autre.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'passive',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      'Le Reclus reste réellement bon : son apparence méchante ne change jamais son alignement réel ni les conditions de victoire.',
      "L'apparence méchante fonctionne même après sa mort.",
      'Le Conteur choisit librement, à chaque interaction, si le Reclus apparaît méchant ou non.',
    ],
    drunkPoisonedNotes:
      "L'ivresse ou l'empoisonnement du Reclus n'affecte pas cette faculté d'apparence, qui reste à la discrétion du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'saint',
    scriptId: 'trouble-brewing',
    nameFr: 'Saint',
    nameEn: 'Saint',
    category: 'outsider',
    team: 'good',
    shortDescription: 'Si vous êtes exécuté, votre équipe perd immédiatement.',
    fullDescription:
      "Si le Saint est exécuté durant la journée et que son pouvoir fonctionne normalement, le Mal gagne " +
      'immédiatement. Ce déclencheur ne concerne que l\'exécution, pas les autres causes de mort.',
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'on-execution-trigger',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      'Ne se déclenche que sur exécution, jamais sur une mort nocturne ou une autre cause.',
      'Le Conteur doit confirmer la victoire avant de la révéler publiquement.',
    ],
    drunkPoisonedNotes:
      "Si le Saint est ivre ou empoisonné au moment de son exécution, le Conteur peut décider que le pouvoir ne se déclenche pas.",
    setupModifier: null,
    requiresSetupStep: false,
  },

  // ---------------------------------------------------------------------
  // SBIRES (Minions)
  // ---------------------------------------------------------------------
  {
    id: 'poisoner',
    scriptId: 'trouble-brewing',
    nameFr: 'Empoisonneur',
    nameEn: 'Poisoner',
    category: 'minion',
    team: 'evil',
    shortDescription:
      'Chaque nuit, choisissez un joueur : il est empoisonné cette nuit et le jour suivant. Son pouvoir ne fonctionne pas et ses informations peuvent être fausses.',
    fullDescription:
      "Le joueur empoisonné garde l'apparence d'agir normalement, mais son pouvoir ne produit aucun effet " +
      "réel jusqu'à la fin du lendemain. Le Conteur peut lui donner des informations vraies ou fausses.",
    firstNightOrder: 1,
    otherNightOrder: 1,
    actionFrequency: 'each-night',
    selectionType: 'single-player',
    targetCount: 1,
    reminders: ['Empoisonné'],
    specialRules: [
      "L'effet dure de la nuit du choix jusqu'à la fin du jour suivant.",
      "L'Empoisonneur agit en tout premier dans l'ordre de nuit, avant que la cible n'utilise potentiellement son propre pouvoir la même nuit.",
    ],
    drunkPoisonedNotes:
      "L'Empoisonneur lui-même peut être empoisonné ou ivre par un autre effet ; dans ce cas son propre choix peut ne pas empoisonner réellement la cible, au choix du Conteur.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'spy',
    scriptId: 'trouble-brewing',
    nameFr: 'Espion',
    nameEn: 'Spy',
    category: 'minion',
    team: 'evil',
    shortDescription:
      'Chaque nuit, vous consultez le grimoire. Vous pouvez apparaître comme un gentil (Villageois ou Paria) aux yeux des autres pouvoirs, même une fois mort.',
    fullDescription:
      'L\'Espion voit à chaque nuit l\'intégralité du grimoire (tous les rôles réels, vivants et morts). ' +
      "Comme le Reclus en miroir, le Conteur peut choisir de le faire apparaître comme un Villageois ou un " +
      "Paria pour n'importe quel pouvoir qui identifie ou compte les joueurs bons.",
    firstNightOrder: 9,
    otherNightOrder: 10,
    actionFrequency: 'each-night',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "L'apparence bonne fonctionne même après sa mort.",
      'Le Conteur choisit librement, à chaque interaction, si et comment l\'Espion apparaît bon.',
      "L'Espion agit en dernier dans l'ordre de nuit, pour consulter le grimoire le plus à jour possible.",
    ],
    drunkPoisonedNotes:
      "Si l'Espion est ivre ou empoisonné, le Conteur peut refuser de lui montrer le grimoire à jour ou lui montrer des informations altérées.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'scarlet-woman',
    scriptId: 'trouble-brewing',
    nameFr: 'Confidente',
    nameEn: 'Scarlet Woman',
    category: 'minion',
    team: 'evil',
    shortDescription:
      'Si le Démon meurt alors que 5 joueurs ou plus sont vivants, vous devenez le Démon.',
    fullDescription:
      "Dès que le Démon meurt (quelle qu'en soit la cause) et qu'il reste au moins cinq joueurs vivants à ce " +
      "moment (Confidente incluse), celle-ci devient immédiatement le nouveau Démon, avec le même " +
      "pouvoir. Le changement n'est jamais annoncé publiquement.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'on-death-trigger',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      "Le seuil de cinq joueurs vivants s'évalue au moment précis de la mort du Démon, Confidente comprise dans le décompte.",
      'La transformation ne se produit pas si la Confidente est elle-même déjà morte.',
      "Le changement de personnage est appliqué dans le grimoire sans être révélé, l'historique conserve l'ancien rôle.",
    ],
    drunkPoisonedNotes:
      "Le statut d'ivresse ou de poison de la Confidente au moment du déclenchement n'empêche pas la transformation dans les règles de base ; c'est un déclencheur passif, pas un pouvoir actif qu'elle exerce.",
    setupModifier: null,
    requiresSetupStep: false,
  },
  {
    id: 'baron',
    scriptId: 'trouble-brewing',
    nameFr: 'Baron',
    nameEn: 'Baron',
    category: 'minion',
    team: 'evil',
    shortDescription: 'Le nombre de Parias initial est modifié : +2 Parias (et -2 Villageois).',
    fullDescription:
      "Dès que le Baron est inclus dans la composition, deux emplacements supplémentaires de Paria sont " +
      "créés et deux emplacements de Villageois sont retirés, tout en conservant le même nombre total de " +
      "joueurs.",
    firstNightOrder: null,
    otherNightOrder: null,
    actionFrequency: 'passive',
    selectionType: 'none',
    targetCount: 0,
    reminders: [],
    specialRules: [
      'Le modificateur s\'applique dès la composition, avant toute distribution des rôles.',
      'Le nombre de Sbires et de Démons ne change jamais.',
    ],
    drunkPoisonedNotes:
      "Sans objet : le pouvoir du Baron s'applique uniquement à la composition initiale, avant toute possibilité d'ivresse ou d'empoisonnement en cours de partie.",
    setupModifier: { type: 'add-outsiders-remove-townsfolk', count: 2 },
    requiresSetupStep: false,
  },

  // ---------------------------------------------------------------------
  // DÉMON (Demon)
  // ---------------------------------------------------------------------
  {
    id: 'imp',
    scriptId: 'trouble-brewing',
    nameFr: 'Diablotin',
    nameEn: 'Imp',
    category: 'demon',
    team: 'evil',
    shortDescription:
      'Chaque nuit (sauf la première), choisissez un joueur : il meurt. Si vous vous choisissez vous-même, un de vos Sbires devient le nouveau Diablotin.',
    fullDescription:
      "Le Diablotin ne tue pas la première nuit (il reçoit uniquement ses informations). Les nuits suivantes, " +
      "il choisit une victime qui meurt, sauf protection ou immunité applicable. S'il se choisit lui-même, il " +
      "meurt et un Sbire vivant devient le nouveau Diablotin, choisi par le Conteur s'il y a plusieurs " +
      "candidats possibles ; la partie continue avec ce nouveau Démon.",
    firstNightOrder: null,
    otherNightOrder: 4,
    actionFrequency: 'each-night-except-first',
    selectionType: 'single-player',
    targetCount: 1,
    reminders: ['A tué cette nuit'],
    specialRules: [
      "N'agit pas la première nuit : il reçoit uniquement ses informations (Sbires + 3 bluffs).",
      "S'il n'existe aucun Sbire vivant pouvant devenir le nouveau Diablotin après un passage de pouvoir, vérifier immédiatement la victoire du Bien.",
      'Le Reclus peut apparaître comme le Démon aux yeux de certains pouvoirs, mais cela ne fait jamais de lui le vrai Diablotin.',
    ],
    drunkPoisonedNotes:
      "Si le Diablotin est ivre ou empoisonné, sa cible ne meurt pas réellement cette nuit-là, au choix du Conteur, sans que cela soit révélé.",
    setupModifier: null,
    requiresSetupStep: true,
  },
]
