# Architecture — Assistant Conteur Blood on the Clocktower (Trouble Brewing)

Outil communautaire non officiel, non affilié à The Pandemonium Institute / Steven Medway.

## 1. Architecture technique

- **Vite + React 19 + TypeScript strict** (`noUncheckedIndexedAccess`, aucun `any` implicite).
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`, thème sombre par défaut, `data-theme="light"` en override).
- **Zustand** pour l'état global de la partie (un store `useGameStore`), avec un middleware de persistance `localStorage`.
- **Vitest** (+ Testing Library) pour les tests unitaires du moteur de règles et des composants critiques.
- **Playwright** (ajouté à partir de l'Incrément 3) pour 2-3 parcours bout-en-bout.
- Pas de backend : tout l'état vit côté client. Architecture prête pour la transformation en PWA (service worker + manifest ajoutés en fin de projet, aucune dépendance réseau bloquante dès le départ).

### Principe directeur : séparation données / règles / UI

```
src/
  data/           # Personnages, scripts, tables de répartition — données pures, sérialisables
    characters/trouble-brewing.ts
    scripts/trouble-brewing.ts
    distribution-table.ts
  engine/         # Fonctions pures : aucune dépendance React, testables isolément
    composition.ts       # getBaseDistribution, applySetupModifiers, validateComposition
    circle.ts             # voisins circulaires, voisins vivants
    nightOrder.ts          # generateNightOrder (1ère nuit + nuits suivantes)
    votes.ts                # seuils, égalités, Majordome
    victory.ts               # checkVictoryConditions
    events.ts                 # applyEvent, undoLastEvent (sourcing d'événements)
    characters/*.ts             # résolveurs spécifiques (Chef, Diseuse, Empathe, Pourfendeur...)
  store/          # Zustand : orchestration, pas de logique métier (délègue à engine/)
    gameStore.ts
    persistence.ts   # sérialisation localStorage, multi-sauvegardes, import/export JSON
  state-machine/  # Machine à états des phases de partie
    phases.ts
  ui/
    screens/       # Un dossier par écran (accueil, setup, grimoire, nuit, jour, vote...)
    components/    # Composants réutilisables (Seat, CircleLayout, Modal, RevealScreen...)
    public/        # Écran public (séparé, protégé par confirmation)
  types/          # Types partagés (Player, Character, GameEvent, GameState...)
  test/
```

Règle stricte : **aucune règle de jeu n'est écrite dans un composant React**. Les composants appellent des fonctions de `engine/` et affichent leur résultat. Cela permet de tester le moteur sans monter d'UI, et de réutiliser la même logique pour le mode entraînement futur.

## 2. Modèle de données

Types TypeScript (`src/types/`), fidèles à la section « Modèle de données suggéré » du brief, avec quelques précisions :

- `Character` : données statiques importées de `data/characters/trouble-brewing.ts`. Inclut `firstNightOrder`/`otherNightOrder` (`number | null`), `actsFirstNight`/`actsOtherNights` (booléens dérivés), `reminders: string[]`, `setupModifier` (fonction déclarative décrite par un type discriminé, pas du code arbitraire — ex. `{ type: 'add-outsiders-remove-townsfolk', count: 2 }` pour le Baron).
- `Player` : ajoute `drunk`/`poisoned` comme *statuses* typés plutôt que des booléens isolés, pour permettre plusieurs états simultanés et leur origine (`{ type: 'poisoned', sourceCharacterId: 'poisoner', appliedNight: 2 }`).
- `GameEvent` : sourcing d'événements en pile append-only. Pour le MVP, `previousState`/`resultingState` stockent des **snapshots complets** de `Game` (plus simple et plus sûr à annuler correctement qu'un diff partiel, quitte à être plus verbeux en `localStorage` — une partie complète reste de l'ordre de quelques centaines de Ko, ce qui passe largement sous les quotas navigateur). `undoLastEvent` restaure simplement `previousState` du dernier événement. Une optimisation en patches pourra être introduite plus tard si la taille devient un problème réel.
- `Game.selectedCharacters` sépare la **composition théorique** (résultat de `validateComposition`) de l'**attribution réelle** (`Player.realCharacterId`), pour supporter le mode « verrouiller certains personnages avant de relancer le tirage ».

## 3. Machine à états (phases de partie)

```
setup.players → setup.composition → setup.assignment → setup.reveal
  → night.first → day.discussion → day.nomination → day.execution
  → night.other → day.discussion → ... (boucle) → game.ended
```

Modélisée comme une union discriminée `GamePhase` + une table de transitions pures (`canTransition(phase, event)` dans `state-machine/phases.ts`), plutôt qu'une librairie externe (XState) pour garder le MVP léger — mais l'interface est compatible avec une migration ultérieure si la complexité grandit (bluffs additionnels, scripts personnalisés).

Chaque sous-phase de nuit/jour est elle-même pilotée par une **file d'étapes** (`NightStep[]` généré par `generateNightOrder`), consommée une à une par l'écran « assistant de nuit », indépendamment de la machine à états globale.

## 4. Moteur de règles — structure

Fonctions pures listées dans le brief, regroupées par domaine (`engine/composition.ts`, `engine/circle.ts`, `engine/nightOrder.ts`, `engine/votes.ts`, `engine/victory.ts`, `engine/events.ts`), plus `engine/characters/` pour les résolveurs propres à un personnage (Chef, Diseuse de bonne aventure, Empathe, Pourfendeur, Vierge...). Toutes reçoivent un état immuable et retournent soit une nouvelle valeur, soit un `GameEvent` à appliquer via `applyEvent` — jamais de mutation directe.

Les cas d'apparence (Espion/Reclus) sont modélisés comme un paramètre explicite `appearanceChoices` passé aux fonctions concernées, jamais décidé automatiquement par le moteur : c'est toujours un choix que l'UI demande au Conteur puis transmet.

## 5. Écrans du MVP (vue d'ensemble)

Accueil · Création (joueurs → composition → aperçu) · Attribution · Révélation secrète · Préparation automatique · Grimoire privé · Assistant première nuit · Assistant nuits suivantes · Phase de jour · Nominations · Vote · Résolution d'exécution · Écran public · Fin de partie / victoire.

## 6. Découpage en incréments

Repris tel que spécifié par le brief (1 → configuration/grimoire de base, 2 → préparation & 1ère nuit, 3 → jour/votes/exécutions, 4 → nuits suivantes & tous pouvoirs & ivresse/poison & victoire, 5 → historique/undo/import-export/mode public/tests E2E/ergonomie). Chaque incrément se termine par : tests verts, `tsc` sans erreur, vérification tactile, note de décisions techniques.

---

*Ce document sera mis à jour si des écarts apparaissent entre le plan et l'implémentation réelle.*
