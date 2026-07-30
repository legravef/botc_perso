# Assistant Conteur — Blood on the Clocktower (Trouble Brewing)

Outil communautaire non officiel, non affilié à The Pandemonium Institute ni à
l'éditeur du jeu. Application web locale, sans backend, destinée à assister le
Conteur pendant une partie en présentiel de Blood on the Clocktower — scénario
Trouble Brewing.

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour l'architecture technique, le
modèle de données, la machine à états, le moteur de règles et le découpage en
incréments.

## Lancer le projet

```bash
npm install
npm run dev       # serveur de développement (http://localhost:5173)
npm run build     # build de production (tsc -b && vite build)
npm run preview   # sert le build de production localement
npm run test      # tests unitaires (Vitest)
npm run lint      # oxlint
```

## État d'avancement

- **Incrément 1 (fait)** : création de partie, saisie des joueurs (ordre,
  inversion, randomisation), répartition officielle par nombre de joueurs,
  composition manuelle ou aléatoire (avec verrouillage) sur les 22 personnages
  de Trouble Brewing, validation de composition (Baron, doublons, comptes par
  catégorie), attribution manuelle ou aléatoire des rôles, grimoire circulaire
  privé et **interactif** (clic sur un joueur pour : changer son personnage,
  le tuer/ressusciter, activer/restaurer son vote fantôme, voir ses voisins
  vivants, ajouter/retirer des rappels — visibles sur le jeton — et des notes
  catégorisées), sauvegarde automatique en localStorage, sauvegardes
  multiples, import/export JSON, annulation (undo) événement par événement,
  écran de référence des personnages.
- **Incrément 2 (fait, en avance sur le plan initial)** : préparation
  automatique (Lavandière, Libraire, Enquêteur, Voyante, Ivrogne, Diablotin),
  écran de révélation secrète des rôles (parcours neutre → confirmation →
  révélation → masquage immédiat par Espace/Échap), assistant de nuit unique
  réutilisé pour la première nuit et les nuits suivantes (ordre officiel
  calculé dynamiquement, informations de Sbires/Démon, Chef et Empathique
  calculés automatiquement), écran de jour minimal reliant les nuits entre
  elles.
- **Fonctionnalités bonus ajoutées suite à une revue d'applications
  similaires** (voir ARCHITECTURE.md pour le détail) : partage du rôle d'un
  joueur par QR code vers son propre téléphone (route autonome `#/role/...`,
  sans backend, entièrement décodée côté client), export du grimoire en
  image PNG, export de la composition au format JSON communautaire (compatible
  Script Tool officiel / townsquare / Pocket Grimoire), icônes de personnages
  (fournies par l'utilisateur) affichées partout : grimoire, sélection de
  composition, attribution, révélation, assistant de nuit, référence.
- **Composition conseillée par niveau** : reproduit la composition "TPI TB1"
  documentée par Ben Burns (Storyteller salarié de The Pandemonium Institute)
  comme réglage par défaut de toute première partie — Diablotin / Confidente
  (filet de sécurité) / Reclus / un détecteur de paire / Empathique / Voyante
  / Croque-mort / Moine, en excluant Mercenaire et Saint (fin de partie trop
  abrupte pour découvrir le jeu). Trois niveaux (Débutants / Intermédiaires /
  Expérimentés) pilotent un tirage pondéré qui reste toujours 100% conforme
  à la répartition officielle, même dans les cas limites (ex. Baron forçant
  l'usage de tous les Parias). Sources détaillées dans
  `src/engine/recommendation.ts`.
- **Reste à faire** : nominations, votes, exécutions, ivresse/empoisonnement
  en jeu, conditions de victoire, historique complet avec interface dédiée,
  mode public, tests Playwright de parcours complet — voir ARCHITECTURE.md §6.

## Sources utilisées pour les règles

Le fond des règles s'appuie sur le site/wiki officiel de Blood on the
Clocktower (ordre de nuit, vote fantôme, seuil d'exécution, mécaniques
d'ivresse et d'empoisonnement). Les documents complémentaires fournis dans ce
dépôt (Almanach FR, glossaire, feuille d'ordre de nuit, textes des pouvoirs)
ont servi à la traduction française et à la vérification croisée.
