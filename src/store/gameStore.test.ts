import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { loadGameFromStorage } from './persistence'
import { suggestWinCondition, validateComposition } from '@/engine'
import { createPlayer } from '@/lib/factories'
import type { Player } from '@/types'

const SCRIPT = 'trouble-brewing' as const

function sevenPlayers() {
  return Array.from({ length: 7 }, (_, i) => createPlayer(`Joueur ${i + 1}`, i))
}

beforeEach(() => {
  window.localStorage.clear()
  useGameStore.setState({ game: null, history: [], savedGames: [], canUndo: false })
})

describe('useGameStore — parcours de configuration (Incrément 1)', () => {
  it('crée une partie, configure les joueurs, la composition et l\'attribution, avec sauvegarde automatique', () => {
    useGameStore.getState().createGame()
    const gameId = useGameStore.getState().game?.id
    expect(gameId).toBeTruthy()
    expect(useGameStore.getState().game?.phase).toBe('setup.players')

    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    expect(useGameStore.getState().game?.players).toHaveLength(7)

    const composition = validateComposition(
      ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'poisoner', 'imp'],
      7,
      SCRIPT,
    )
    expect(composition.isValid).toBe(true)
    useGameStore.getState().setComposition(composition)
    useGameStore.getState().setPhase('setup.assignment')

    const assignments = Object.fromEntries(
      players.map((p, i) => [p.id, composition.characterIds[i] as string]),
    )
    useGameStore.getState().assignCharacters(assignments)

    const demonPlayer = useGameStore.getState().game?.players.find((p) => p.realCharacterId === 'imp')
    expect(demonPlayer?.alignment).toBe('evil')

    const townsfolkPlayer = useGameStore.getState().game?.players.find((p) => p.realCharacterId === 'chef')
    expect(townsfolkPlayer?.alignment).toBe('good')

    // La sauvegarde automatique doit refléter le dernier état.
    const persisted = loadGameFromStorage(gameId as string)
    expect(persisted?.game.players.find((p) => p.realCharacterId === 'imp')?.alignment).toBe('evil')
  })

  it('annule la dernière action et restaure l\'état précédent', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPlayers(sevenPlayers())
    expect(useGameStore.getState().canUndo).toBe(true)

    const beforeUndo = useGameStore.getState().game?.players.length
    useGameStore.getState().undo()

    expect(beforeUndo).toBe(7)
    expect(useGameStore.getState().game?.players).toHaveLength(0)
    expect(useGameStore.getState().canUndo).toBe(false)
  })

  it('exporte puis réimporte une partie fidèlement', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPlayers(sevenPlayers().slice(0, 5))
    const json = useGameStore.getState().exportCurrentGame()
    expect(json).toBeTruthy()

    useGameStore.setState({ game: null, history: [], canUndo: false })
    useGameStore.getState().importGame(json as string)

    expect(useGameStore.getState().game?.players).toHaveLength(5)
  })

  it('closeGame revient à l\'accueil sans supprimer la sauvegarde', () => {
    useGameStore.getState().createGame()
    const gameId = useGameStore.getState().game?.id as string
    useGameStore.getState().closeGame()

    expect(useGameStore.getState().game).toBeNull()
    expect(loadGameFromStorage(gameId)).not.toBeNull()

    useGameStore.getState().loadGame(gameId)
    expect(useGameStore.getState().game?.id).toBe(gameId)
  })
})

describe('useGameStore — actions du grimoire', () => {
  function setupGameWithPlayers() {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const composition = validateComposition(
      ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'poisoner', 'imp'],
      7,
      SCRIPT,
    )
    useGameStore.getState().setComposition(composition)
    const assignments = Object.fromEntries(players.map((p, i) => [p.id, composition.characterIds[i] as string]))
    useGameStore.getState().assignCharacters(assignments)
    return useGameStore.getState().game?.players[0] as Player
  }

  it('tue puis ressuscite un joueur', () => {
    const player = setupGameWithPlayers()
    useGameStore.getState().killPlayer(player.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.alive).toBe(false)

    useGameStore.getState().revivePlayer(player.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.alive).toBe(true)
  })

  it('bascule la disponibilité du vote fantôme', () => {
    const player = setupGameWithPlayers()
    expect(player.ghostVoteAvailable).toBe(true)

    useGameStore.getState().toggleGhostVote(player.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.ghostVoteAvailable).toBe(false)

    useGameStore.getState().toggleGhostVote(player.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.ghostVoteAvailable).toBe(true)
  })

  it('change le personnage réel d\'un joueur et recalcule son alignement', () => {
    const player = setupGameWithPlayers() // assigné à 'washerwoman' (bon)
    useGameStore.getState().setPlayerCharacter(player.id, 'imp')

    const updated = useGameStore.getState().game?.players.find((p) => p.id === player.id)
    expect(updated?.realCharacterId).toBe('imp')
    expect(updated?.alignment).toBe('evil')
  })

  it('ajoute et retire un rappel', () => {
    const player = setupGameWithPlayers()
    useGameStore.getState().addReminder(player.id, 'Empoisonné', 'poisoner')

    const withReminder = useGameStore.getState().game?.players.find((p) => p.id === player.id)
    expect(withReminder?.reminders).toHaveLength(1)
    expect(withReminder?.reminders[0]?.label).toBe('Empoisonné')

    const reminderId = withReminder?.reminders[0]?.id as string
    useGameStore.getState().removeReminder(player.id, reminderId)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.reminders).toHaveLength(0)
  })

  it('ajoute et retire une note', () => {
    const player = setupGameWithPlayers()
    useGameStore.getState().addNote(player.id, 'A revendiqué la Diseuse', 'bluff')

    const withNote = useGameStore.getState().game?.players.find((p) => p.id === player.id)
    expect(withNote?.notes).toHaveLength(1)
    expect(withNote?.notes[0]?.category).toBe('bluff')

    const noteId = withNote?.notes[0]?.id as string
    useGameStore.getState().removeNote(player.id, noteId)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.notes).toHaveLength(0)
  })

  it('chaque action de grimoire est annulable individuellement', () => {
    const player = setupGameWithPlayers()
    useGameStore.getState().killPlayer(player.id)
    useGameStore.getState().addNote(player.id, 'Suspect', 'suspected')

    useGameStore.getState().undo() // retire la note
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.notes).toHaveLength(0)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.alive).toBe(false)

    useGameStore.getState().undo() // ressuscite (annule le kill)
    expect(useGameStore.getState().game?.players.find((p) => p.id === player.id)?.alive).toBe(true)
  })
})

describe('useGameStore — préparation et transitions nuit/jour', () => {
  it('fusionne les mises à jour partielles de préparation sans écraser les autres champs', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPreparation({ drunkBelievedCharacterId: 'monk' })
    useGameStore.getState().setPreparation({ fortuneTellerRedHerringPlayerId: 'p1' })

    const prep = useGameStore.getState().game?.preparation
    expect(prep?.drunkBelievedCharacterId).toBe('monk')
    expect(prep?.fortuneTellerRedHerringPlayerId).toBe('p1')
  })

  it('completeNight depuis night.first fixe le jour 1 et la nuit 1', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPhase('night.first')
    useGameStore.getState().completeNight()

    const game = useGameStore.getState().game
    expect(game?.phase).toBe('day.discussion')
    expect(game?.dayNumber).toBe(1)
    expect(game?.nightNumber).toBe(1)
  })

  it('startNextNight puis completeNight incrémentent nuit et jour', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPhase('night.first')
    useGameStore.getState().completeNight() // jour 1 / nuit 1

    useGameStore.getState().startNextNight()
    expect(useGameStore.getState().game?.phase).toBe('night.other')
    expect(useGameStore.getState().game?.nightNumber).toBe(2)

    useGameStore.getState().completeNight()
    const game = useGameStore.getState().game
    expect(game?.phase).toBe('day.discussion')
    expect(game?.dayNumber).toBe(2)
    expect(game?.nightNumber).toBe(2)
  })

  it('cancelNight annule toute la nuit en cours (même après plusieurs actions) et revient au jour précédent', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPhase('night.first')
    useGameStore.getState().completeNight() // jour 1 / nuit 1
    useGameStore.getState().startNextNight() // nuit 2 (night.other)

    useGameStore.getState().addNote('joueur-inexistant', 'Diablotin : se choisit lui-même.', 'power-used')
    useGameStore.getState().killPlayer('joueur-inexistant')

    useGameStore.getState().cancelNight()

    const game = useGameStore.getState().game
    expect(game?.phase).toBe('day.discussion')
    expect(game?.dayNumber).toBe(1)
    expect(game?.nightNumber).toBe(1)
  })

  it('cancelNight depuis la première nuit revient à la phase précédant son déclenchement', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPhase('night.first')
    useGameStore.getState().cancelNight()

    expect(useGameStore.getState().game?.phase).toBe('setup.players')
  })

  it('cancelNight ne fait rien hors phase de nuit', () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPhase('night.first')
    useGameStore.getState().completeNight()
    const before = useGameStore.getState().game

    useGameStore.getState().cancelNight()

    expect(useGameStore.getState().game).toBe(before)
  })

  it("met à jour perceivedCharacterId de l'Ivrogne quand son personnage cru est choisi en préparation", () => {
    useGameStore.getState().createGame()
    const players = Array.from({ length: 9 }, (_, i) => createPlayer(`Joueur ${i + 1}`, i))
    useGameStore.getState().setPlayers(players)
    const composition = validateComposition(
      ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'drunk', 'butler', 'poisoner', 'imp'],
      9,
      SCRIPT,
    )
    expect(composition.isValid).toBe(true)
    useGameStore.getState().setComposition(composition)
    const assignments = Object.fromEntries(players.map((p, i) => [p.id, composition.characterIds[i] as string]))
    useGameStore.getState().assignCharacters(assignments)

    const drunkPlayer = useGameStore.getState().game?.players.find((p) => p.realCharacterId === 'drunk')
    expect(drunkPlayer?.perceivedCharacterId).toBeNull()

    useGameStore.getState().setPreparation({ drunkBelievedCharacterId: 'soldier' })
    const updatedDrunk = useGameStore.getState().game?.players.find((p) => p.realCharacterId === 'drunk')
    expect(updatedDrunk?.perceivedCharacterId).toBe('soldier')

    // Les autres joueurs ne sont pas affectés.
    const others = useGameStore.getState().game?.players.filter((p) => p.realCharacterId !== 'drunk')
    expect(others?.every((p) => p.perceivedCharacterId === null)).toBe(true)
  })
})

describe('useGameStore — applyNightlyReminder et clearHistory', () => {
  it("pose un rappel sur la cible et le retire d'un précédent porteur la nuit suivante", () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1, p2] = players as [Player, Player]

    useGameStore.getState().applyNightlyReminder('poisoner', 'Empoisonné', p1.id)
    expect(
      useGameStore.getState().game?.players.find((p) => p.id === p1.id)?.reminders.map((r) => r.label),
    ).toEqual(['Empoisonné'])

    // La nuit suivante, l'Empoisonneur change de cible : l'ancien rappel doit disparaître.
    useGameStore.getState().applyNightlyReminder('poisoner', 'Empoisonné', p2.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === p1.id)?.reminders).toHaveLength(0)
    expect(
      useGameStore.getState().game?.players.find((p) => p.id === p2.id)?.reminders.map((r) => r.label),
    ).toEqual(['Empoisonné'])
  })

  it("ne touche pas aux rappels posés par d'autres personnages", () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1] = players as [Player]

    useGameStore.getState().addReminder(p1.id, 'Note libre', 'custom')
    useGameStore.getState().applyNightlyReminder('monk', 'Protégé', p1.id)

    const labels = useGameStore.getState().game?.players.find((p) => p.id === p1.id)?.reminders.map((r) => r.label)
    expect(labels).toEqual(['Note libre', 'Protégé'])
  })

  it("clearHistory vide l'historique sans modifier l'état actuel de la partie", () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPlayers(sevenPlayers())
    expect(useGameStore.getState().history.length).toBeGreaterThan(0)

    const playersBefore = useGameStore.getState().game?.players
    useGameStore.getState().clearHistory()

    expect(useGameStore.getState().history).toHaveLength(0)
    expect(useGameStore.getState().canUndo).toBe(false)
    expect(useGameStore.getState().game?.players).toEqual(playersBefore)
  })
})

describe('useGameStore — setAllPlayerPositions (validation groupée du placement libre)', () => {
  it('déplace un joueur et recalcule les sièges de tout le monde à partir des positions réelles', () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1] = players as [Player]

    // p1 était au siège 0 (haut de la disposition par défaut). On le déplace tout en bas.
    useGameStore.getState().setAllPlayerPositions([{ playerId: p1.id, mapX: 0, mapY: 1 }])

    const updatedP1 = useGameStore.getState().game?.players.find((p) => p.id === p1.id)
    expect(updatedP1?.mapX).toBe(0)
    expect(updatedP1?.mapY).toBe(1)
    expect(updatedP1?.seat).not.toBe(0)
  })

  it("ne modifie pas mapX/mapY des joueurs absents de la liste, seulement leur siège logique", () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1, p2] = players as [Player, Player]

    useGameStore.getState().setAllPlayerPositions([{ playerId: p1.id, mapX: 0, mapY: 1 }])

    const updatedP2 = useGameStore.getState().game?.players.find((p) => p.id === p2.id)
    expect(updatedP2?.mapX).toBeNull()
    expect(updatedP2?.mapY).toBeNull()
  })

  it('positionne plusieurs joueurs en un seul commit (validation groupée après un glisser 100% local)', () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const historyBefore = useGameStore.getState().history.length

    useGameStore.getState().setAllPlayerPositions(
      players.map((p, i) => ({ playerId: p.id, mapX: i % 2 === 0 ? -1 : 1, mapY: i < 4 ? -0.5 : 0.5 })),
    )

    // Un seul événement d'historique pour tout le monde, pas un par joueur déplacé.
    expect(useGameStore.getState().history.length).toBe(historyBefore + 1)
    const updated = useGameStore.getState().game?.players ?? []
    expect(updated.every((p) => p.mapX !== null && p.mapY !== null)).toBe(true)
  })

  it('conserve un ordre circulaire complet (0..n-1) après un déplacement', () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1] = players as [Player]

    useGameStore.getState().setAllPlayerPositions([{ playerId: p1.id, mapX: 0.3, mapY: 0.9 }])

    const seats = useGameStore
      .getState()
      .game?.players.map((p) => p.seat)
      .sort((a, b) => a - b)
    expect(seats).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("est annulable comme n'importe quelle autre action", () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const [p1] = players as [Player]

    useGameStore.getState().setAllPlayerPositions([{ playerId: p1.id, mapX: 0, mapY: 1 }])
    useGameStore.getState().undo()

    const restored = useGameStore.getState().game?.players.find((p) => p.id === p1.id)
    expect(restored?.mapX).toBeNull()
    expect(restored?.seat).toBe(p1.seat)
  })
})

describe('useGameStore — applyLayoutPreset', () => {
  it('positionne tous les joueurs en un seul commit, sans laisser mapX/mapY à null', () => {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)

    useGameStore.getState().applyLayoutPreset('two-rows')

    const updated = useGameStore.getState().game?.players ?? []
    expect(updated).toHaveLength(7)
    for (const player of updated) {
      expect(player.mapX).not.toBeNull()
      expect(player.mapY).not.toBeNull()
    }
  })

  it("est annulable en une seule fois (un seul événement d'historique)", () => {
    useGameStore.getState().createGame()
    useGameStore.getState().setPlayers(sevenPlayers())
    const historyBefore = useGameStore.getState().history.length

    useGameStore.getState().applyLayoutPreset('circle')
    expect(useGameStore.getState().history.length).toBe(historyBefore + 1)

    useGameStore.getState().undo()
    const restored = useGameStore.getState().game?.players ?? []
    expect(restored.every((p) => p.mapX === null && p.mapY === null)).toBe(true)
  })
})

describe('useGameStore — exécution du jour et fin de partie', () => {
  /** Met en place une partie à 7 joueurs, personnages assignés (Imp = Démon sur le dernier
   * joueur, Saint sur le premier), directement en phase de jour. Les nominations/votes se
   * déroulent verbalement à table : l'app ne retient que le résultat (voir resolveExecution). */
  function setupDayGame() {
    useGameStore.getState().createGame()
    const players = sevenPlayers()
    useGameStore.getState().setPlayers(players)
    const composition = validateComposition(
      ['saint', 'librarian', 'investigator', 'chef', 'empath', 'poisoner', 'imp'],
      7,
      SCRIPT,
    )
    useGameStore.getState().setComposition(composition)
    useGameStore.getState().setPhase('setup.assignment')
    const assignments = Object.fromEntries(players.map((p, i) => [p.id, composition.characterIds[i] as string]))
    useGameStore.getState().assignCharacters(assignments)
    useGameStore.getState().setPhase('day.discussion')
    return useGameStore.getState().game!.players
  }

  it("resolveExecution tue le joueur donné", () => {
    const players = setupDayGame()
    useGameStore.getState().resolveExecution(players[1]!.id)
    const game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === players[1]!.id)?.alive).toBe(false)
  })

  it("resolveExecution(null) ne tue personne", () => {
    setupDayGame()
    useGameStore.getState().resolveExecution(null)
    const game = useGameStore.getState().game!
    expect(game.players.every((p) => p.alive)).toBe(true)
  })

  it('endGame fixe la phase sur game.ended avec le vainqueur retenu', () => {
    setupDayGame()
    useGameStore.getState().endGame({ winner: 'good', reason: 'Le Démon est mort.' })
    const game = useGameStore.getState().game!
    expect(game.phase).toBe('game.ended')
    expect(game.end?.winner).toBe('good')
    expect(game.end?.reason).toBe('Le Démon est mort.')
  })

  it('restartWithSamePlayers réutilise noms et disposition mais repart de zéro sur le reste', () => {
    const players = setupDayGame()
    useGameStore.getState().killPlayer(players[0]!.id)
    useGameStore.getState().setAllPlayerPositions([{ playerId: players[1]!.id, mapX: 0.4, mapY: -0.2 }])
    useGameStore.getState().endGame({ winner: 'good', reason: 'Le Démon est mort.' })

    useGameStore.getState().restartWithSamePlayers()
    const game = useGameStore.getState().game!

    expect(game.phase).toBe('setup.composition')
    expect(game.end).toBeNull()
    expect(game.composition).toBeNull()
    expect(game.players).toHaveLength(players.length)
    expect(new Set(game.players.map((p) => p.name))).toEqual(new Set(players.map((p) => p.name)))
    expect(game.players.every((p) => p.realCharacterId === null && p.alive)).toBe(true)
    const movedPlayer = game.players.find((p) => p.name === players[1]!.name)
    expect(movedPlayer?.mapX).toBe(0.4)
    expect(movedPlayer?.mapY).toBe(-0.2)
    expect(useGameStore.getState().history).toHaveLength(0)
  })
})
describe('useGameStore — résolution centralisée des morts nocturnes', () => {
  it('respecte une protection nocturne sauf pour un Assassin', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [target] = sevenPlayers() as [Player]
    useGameStore.getState().setPlayers([target])
    useGameStore.getState().addReminder(target.id, 'Protégé (Aubergiste)', 'innkeeper')

    useGameStore.getState().resolveNightDeaths([target.id], 'zombuul')
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(true)

    useGameStore.getState().resolveNightDeaths([target.id], 'assassin', true)
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(false)
  })

  it('consomme la première vie du Fou sans le tuer', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [target] = sevenPlayers() as [Player]
    useGameStore.getState().setPlayers([{ ...target, realCharacterId: 'fool' }])

    useGameStore.getState().resolveNightDeaths([target.id], 'zombuul')
    const afterFirst = useGameStore.getState().game?.players[0]
    expect(afterFirst?.alive).toBe(true)
    expect(afterFirst?.reminders.some((reminder) => reminder.sourceCharacterId === 'fool')).toBe(true)

    useGameStore.getState().resolveNightDeaths([target.id], 'zombuul')
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(false)
  })

  it('l\'Herboriste protège ses voisins vivants les plus proches, la nuit et à l\'exécution, tant qu\'ils sont bons', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [p0, p1, p2] = Array.from({ length: 3 }, (_, i) => createPlayer(`J${i}`, i)) as [Player, Player, Player]
    useGameStore.getState().setPlayers([p0, { ...p1, realCharacterId: 'tea-lady' }, p2])

    useGameStore.getState().resolveNightDeaths([p0.id], 'shabaloth')
    expect(useGameStore.getState().game?.players.find((p) => p.id === p0.id)?.alive).toBe(true)

    useGameStore.getState().resolveExecution(p2.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === p2.id)?.alive).toBe(true)
  })

  it('l\'Herboriste ne protège aucun voisin si ses deux voisins vivants ne sont pas gentils', () => {
    const teaLady = createPlayer('Hélène', 0)
    const goodNeighbor = createPlayer('Gabin', 1)
    const evilNeighbor = createPlayer('Éric', 2)
    useGameStore.getState().createGame('bad-moon-rising')
    useGameStore.getState().setPlayers([teaLady, goodNeighbor, evilNeighbor])
    useGameStore.getState().setPlayerCharacter(teaLady.id, 'tea-lady')
    useGameStore.getState().setPlayerCharacter(goodNeighbor.id, 'pacifist')
    useGameStore.getState().setPlayerCharacter(evilNeighbor.id, 'zombuul')

    useGameStore.getState().resolveNightDeaths([goodNeighbor.id], 'zombuul')
    expect(useGameStore.getState().game?.players.find((player) => player.id === goodNeighbor.id)?.alive).toBe(false)
  })

  it('le Marin n\'est immunisé la nuit que s\'il reste sobre', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [sailor] = sevenPlayers() as [Player]
    useGameStore.getState().setPlayers([{ ...sailor, realCharacterId: 'sailor' }])

    useGameStore.getState().resolveNightDeaths([sailor.id], 'shabaloth')
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(true)

    useGameStore.getState().addReminder(sailor.id, 'Ivre (Marin)', 'sailor')
    useGameStore.getState().resolveNightDeaths([sailor.id], 'shabaloth')
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(false)
  })

  it('le Bouffon et le Zombuul survivent aussi à leur première mort par exécution, pas seulement la nuit', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [p0, p1] = Array.from({ length: 2 }, (_, i) => createPlayer(`J${i}`, i)) as [Player, Player]
    useGameStore.getState().setPlayers([{ ...p0, realCharacterId: 'fool' }, { ...p1, realCharacterId: 'zombuul' }])

    useGameStore.getState().resolveExecution(p0.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === p0.id)?.alive).toBe(true)

    useGameStore.getState().resolveExecution(p1.id)
    expect(useGameStore.getState().game?.players.find((p) => p.id === p1.id)?.alive).toBe(true)
  })

  it('la Grand-mère meurt si le Démon tue le joueur qu\'elle a vu la première nuit', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [p0, p1, p2] = Array.from({ length: 3 }, (_, i) => createPlayer(`J${i}`, i)) as [Player, Player, Player]
    useGameStore.getState().setPlayers([{ ...p0, realCharacterId: 'grandmother' }, p1, p2])
    useGameStore.getState().setPreparation({ grandmotherRevealPlayerId: p1.id })

    useGameStore.getState().resolveNightDeaths([p1.id], 'shabaloth')
    const game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === p1.id)?.alive).toBe(false)
    expect(game.players.find((p) => p.id === p0.id)?.alive).toBe(false)
  })

  it('la Grand-mère ne meurt pas si le joueur lié est protégé (donc ne meurt pas vraiment)', () => {
    useGameStore.getState().createGame('bad-moon-rising')
    const [p0, p1, p2] = Array.from({ length: 3 }, (_, i) => createPlayer(`J${i}`, i)) as [Player, Player, Player]
    useGameStore.getState().setPlayers([{ ...p0, realCharacterId: 'grandmother' }, p1, p2])
    useGameStore.getState().setPreparation({ grandmotherRevealPlayerId: p1.id })
    useGameStore.getState().addReminder(p1.id, 'Protégé (Aubergiste)', 'innkeeper')

    useGameStore.getState().resolveNightDeaths([p1.id], 'shabaloth')
    const game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === p1.id)?.alive).toBe(true)
    expect(game.players.find((p) => p.id === p0.id)?.alive).toBe(true)
  })
})

describe('useGameStore/winCondition — Cerveau (Mastermind)', () => {
  function setupMastermindGame() {
    useGameStore.getState().createGame('bad-moon-rising')
    const players = Array.from({ length: 5 }, (_, i) => createPlayer(`J${i}`, i))
    useGameStore.getState().setPlayers(players)
    useGameStore.getState().setPlayerCharacter(players[0]!.id, 'shabaloth')
    useGameStore.getState().setPlayerCharacter(players[1]!.id, 'mastermind')
    useGameStore.getState().setPhase('day.discussion')
    return players
  }

  it('rejoue un jour supplémentaire quand le Démon est exécuté avec un Cerveau vivant, puis tranche sur l\'exécution suivante', () => {
    const players = setupMastermindGame()

    useGameStore.getState().resolveExecution(players[0]!.id)
    let game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === players[0]!.id)?.alive).toBe(false)
    expect(game.mastermindExtraDayDueOnDay).toBe(game.dayNumber + 1)
    expect(suggestWinCondition(game, players[0]!.id)).toBeNull()

    useGameStore.getState().startNextNight()
    useGameStore.getState().completeNight()

    useGameStore.getState().resolveExecution(players[1]!.id)
    game = useGameStore.getState().game!
    const suggestion = suggestWinCondition(game, players[1]!.id)
    expect(suggestion?.winner).toBe('good')
  })

  it('si personne n\'est exécuté le jour supplémentaire, le Bien gagne', () => {
    setupMastermindGame()
    const players = useGameStore.getState().game!.players

    useGameStore.getState().resolveExecution(players[0]!.id)
    useGameStore.getState().startNextNight()
    useGameStore.getState().completeNight()

    const game = useGameStore.getState().game!
    const suggestion = suggestWinCondition(game, null)
    expect(suggestion?.winner).toBe('good')
  })
})

describe('useGameStore — Trouble Brewing : Soldat et Confidente', () => {
  it('le Soldat sobre est immunisé contre le Démon, mais reste vulnérable à l\'exécution', () => {
    useGameStore.getState().createGame('trouble-brewing')
    const [target] = sevenPlayers() as [Player]
    useGameStore.getState().setPlayers([{ ...target, realCharacterId: 'soldier' }])

    useGameStore.getState().resolveNightDeaths([target.id], 'imp')
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(true)

    useGameStore.getState().resolveExecution(target.id)
    expect(useGameStore.getState().game?.players[0]?.alive).toBe(false)
  })

  it('la Confidente devient le nouveau Démon si celui-ci meurt avec 5 joueurs ou plus vivants', () => {
    useGameStore.getState().createGame('trouble-brewing')
    // 6 joueurs, le Démon meurt -> il en reste 5 vivants : le seuil "5 joueurs ou plus" est atteint.
    const players = Array.from({ length: 6 }, (_, i) => createPlayer(`J${i}`, i))
    useGameStore.getState().setPlayers(players)
    useGameStore.getState().setPlayerCharacter(players[0]!.id, 'imp')
    useGameStore.getState().setPlayerCharacter(players[1]!.id, 'scarlet-woman')

    useGameStore.getState().resolveExecution(players[0]!.id)

    const game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === players[0]!.id)?.alive).toBe(false)
    const scarletWoman = game.players.find((p) => p.id === players[1]!.id)
    expect(scarletWoman?.realCharacterId).toBe('imp')
    expect(scarletWoman?.alignment).toBe('evil')
  })

  it('declareDeath applique aussi la succession de la Confidente (mort du Démon hors des flux guidés, ex. tir du Mercenaire)', () => {
    useGameStore.getState().createGame('trouble-brewing')
    const players = Array.from({ length: 6 }, (_, i) => createPlayer(`J${i}`, i))
    useGameStore.getState().setPlayers(players)
    useGameStore.getState().setPlayerCharacter(players[0]!.id, 'imp')
    useGameStore.getState().setPlayerCharacter(players[1]!.id, 'scarlet-woman')

    useGameStore.getState().declareDeath(players[0]!.id)

    const game = useGameStore.getState().game!
    expect(game.players.find((p) => p.id === players[0]!.id)?.alive).toBe(false)
    const scarletWoman = game.players.find((p) => p.id === players[1]!.id)
    expect(scarletWoman?.realCharacterId).toBe('imp')
    expect(scarletWoman?.alignment).toBe('evil')
  })

  it('la Confidente ne devient pas Démon si moins de 5 joueurs restent vivants', () => {
    useGameStore.getState().createGame('trouble-brewing')
    const players = Array.from({ length: 4 }, (_, i) => createPlayer(`J${i}`, i))
    useGameStore.getState().setPlayers(players)
    useGameStore.getState().setPlayerCharacter(players[0]!.id, 'imp')
    useGameStore.getState().setPlayerCharacter(players[1]!.id, 'scarlet-woman')

    useGameStore.getState().resolveExecution(players[0]!.id)

    const scarletWoman = useGameStore.getState().game?.players.find((p) => p.id === players[1]!.id)
    expect(scarletWoman?.realCharacterId).toBe('scarlet-woman')
  })
})
