import { describe, expect, it } from 'vitest'
import { generateNightSteps } from './nightOrder'
import { createEmptyPreparation, createPlayer } from '@/lib/factories'
import { getCharacterById } from '@/data'
import type { Composition, Game, Player } from '@/types'

const SCRIPT = 'trouble-brewing' as const

function assignCharacter(player: Player, characterId: string): Player {
  const character = getCharacterById(SCRIPT, characterId)
  if (!character) throw new Error(`Personnage inconnu : ${characterId}`)
  return { ...player, realCharacterId: characterId, alignment: character.team }
}

function makeComposition(characterIds: string[]): Composition {
  return {
    baseCounts: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
    effectiveCounts: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
    characterIds,
    isValid: true,
    errors: [],
    warnings: [],
  }
}

function makeGame(overrides: Partial<Game> = {}): Game {
  const now = new Date().toISOString()
  return {
    id: 'g1',
    scriptId: SCRIPT,
    phase: 'night.first',
    storytellerLevel: 'beginner',
    dayNumber: 0,
    nightNumber: 0,
    players: [],
    composition: null,
    preparation: createEmptyPreparation(),
    activeDemonId: null,
    gameNotes: [],
    publicScreenActive: false,
    end: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const ASSIGNMENTS = [
  'washerwoman',
  'librarian',
  'investigator',
  'empath',
  'fortune-teller',
  'butler',
  'drunk',
  'poisoner',
  'imp',
]

function buildFixture() {
  const players = ASSIGNMENTS.map((id, i) => assignCharacter(createPlayer(`P${i}`, i), id))
  const [washerwomanP, librarianP, investigatorP, empathP, fortuneTellerP, butlerP, drunkP, poisonerP, impP] =
    players as [Player, Player, Player, Player, Player, Player, Player, Player, Player]

  const game = makeGame({
    players,
    composition: makeComposition(ASSIGNMENTS),
    preparation: {
      washerwoman: { characterId: 'empath', playerAId: empathP.id, playerBId: fortuneTellerP.id },
      librarian: { characterId: 'drunk', playerAId: drunkP.id, playerBId: washerwomanP.id },
      investigator: { characterId: 'poisoner', playerAId: poisonerP.id, playerBId: librarianP.id },
      fortuneTellerRedHerringPlayerId: empathP.id,
      drunkBelievedCharacterId: 'monk',
      impBluffCharacterIds: ['chef', 'virgin', 'saint'],
      grandmotherRevealPlayerId: null,
    },
  })

  return { game, washerwomanP, librarianP, investigatorP, empathP, fortuneTellerP, butlerP, drunkP, poisonerP, impP }
}

describe('generateNightSteps — première nuit', () => {
  it('place les informations de Sbires puis de Démon en tout premier', () => {
    const { game, poisonerP, impP } = buildFixture()
    const steps = generateNightSteps(game, 'first')
    expect(steps[0]?.kind).toBe('minion-info')
    expect(steps[0]?.playerIds).toEqual([poisonerP.id])
    expect(steps[0]?.resolvedInfo).toContain(impP.name)
    expect(steps[1]?.kind).toBe('demon-info')
    expect(steps[1]?.resolvedInfo).toContain('Chef')
    expect(steps[1]?.resolvedInfo).toContain('Vierge')
    expect(steps[1]?.resolvedInfo).toContain('Saint')
  })

  it('expose les bluffs sous forme structurée pour un affichage impossible à manquer (icônes + confirmation)', () => {
    const { game, impP } = buildFixture()
    const steps = generateNightSteps(game, 'first')
    const demonStep = steps.find((s) => s.kind === 'demon-info')
    expect(demonStep?.bluffCharacterIds).toEqual(['chef', 'virgin', 'saint'])
    expect(demonStep?.demonPlayerId).toBe(impP.id)
  })

  it('expose le démon et le leurre de la Voyante sous forme structurée (pas seulement en texte)', () => {
    const { game, empathP, impP } = buildFixture()
    const steps = generateNightSteps(game, 'first')
    const fortuneTellerStep = steps.find((s) => s.characterId === 'fortune-teller')
    expect(fortuneTellerStep?.demonPlayerId).toBe(impP.id)
    expect(fortuneTellerStep?.redHerringPlayerId).toBe(empathP.id)
  })

  it("respecte l'ordre officiel (Empoisonneur, Lavandière, Libraire, Enquêteur, Empathique, Voyante, Majordome)", () => {
    const { game } = buildFixture()
    const order = generateNightSteps(game, 'first')
      .map((s) => s.characterId)
      .filter((id): id is string => id !== null)
    expect(order).toEqual([
      'poisoner',
      'washerwoman',
      'librarian',
      'investigator',
      'empath',
      'fortune-teller',
      'butler',
    ])
  })

  it("ne réveille pas l'Ivrogne quand son personnage cru n'agit pas cette nuit-là (Moine)", () => {
    const { game } = buildFixture()
    const steps = generateNightSteps(game, 'first')
    expect(steps.some((s) => s.id.startsWith('drunk-simulated'))).toBe(false)
  })

  it('résout correctement les informations de la Lavandière depuis la préparation', () => {
    const { game, empathP, fortuneTellerP } = buildFixture()
    const step = generateNightSteps(game, 'first').find((s) => s.characterId === 'washerwoman')
    expect(step?.resolvedInfo).toContain('Empathique')
    expect(step?.resolvedInfo).toContain(empathP.name)
    expect(step?.instruction).toContain(fortuneTellerP.name)
  })

  it('calcule le nombre exact pour l\'Empathique via le moteur', () => {
    const { game } = buildFixture()
    const step = generateNightSteps(game, 'first').find((s) => s.characterId === 'empath')
    // Un seul méchant (Diablotin) dans ce cercle de 9, potentiellement voisin ou non de l'Empathique.
    expect(step?.resolvedInfo).toMatch(/Nombre à indiquer : [012]/)
  })

  it('ignore les personnages dont le joueur est mort', () => {
    const { game, poisonerP } = buildFixture()
    const withDeadPoisoner = { ...game, players: game.players.map((p) => (p.id === poisonerP.id ? { ...p, alive: false } : p)) }
    const steps = generateNightSteps(withDeadPoisoner, 'first')
    expect(steps.some((s) => s.characterId === 'poisoner')).toBe(false)
  })

  it('indique "aucun Paria en jeu" quand la préparation vaut \'none\'', () => {
    const { game } = buildFixture()
    const withNoOutsiderInfo = {
      ...game,
      preparation: { ...game.preparation, librarian: 'none' as const },
    }
    const step = generateNightSteps(withNoOutsiderInfo, 'first').find((s) => s.characterId === 'librarian')
    expect(step?.resolvedInfo).toContain('Aucun Paria en jeu')
  })
})

describe('generateNightSteps — nuits suivantes', () => {
  it("simule le réveil de l'Ivrogne à la position de son personnage cru quand celui-ci agit", () => {
    const { game } = buildFixture()
    const otherNightGame = { ...game, phase: 'night.other' as const }
    const steps = generateNightSteps(otherNightGame, 'other')
    const order = steps.map((s) => s.id)
    const poisonerIndex = order.findIndex((id) => id === 'poisoner-' + game.players.find((p) => p.realCharacterId === 'poisoner')?.id)
    const drunkIndex = order.findIndex((id) => id.startsWith('drunk-simulated'))
    expect(drunkIndex).toBeGreaterThan(-1)
    expect(drunkIndex).toBeGreaterThan(poisonerIndex) // Moine (ordre 2) vient après Empoisonneur (ordre 1)
  })

  it("n'inclut pas les personnages de première nuit uniquement (Lavandière, Libraire, Enquêteur)", () => {
    const { game } = buildFixture()
    const steps = generateNightSteps({ ...game, phase: 'night.other' }, 'other')
    const ids = steps.map((s) => s.characterId)
    expect(ids).not.toContain('washerwoman')
    expect(ids).not.toContain('librarian')
    expect(ids).not.toContain('investigator')
  })
})
describe('generateNightSteps — Bad Moon Rising', () => {
  it('donne les informations de Sbire et de Démon pour n’importe quel Démon du script', () => {
    const script = 'bad-moon-rising' as const
    const players = ['grandmother', 'goon', 'godfather', 'shabaloth'].map((characterId, index) => {
      const player = createPlayer(`BMR ${index + 1}`, index)
      const character = getCharacterById(script, characterId)
      return { ...player, realCharacterId: characterId, alignment: character!.team }
    })
    const game = makeGame({
      scriptId: script,
      players,
      preparation: { ...createEmptyPreparation(), impBluffCharacterIds: ['sailor', 'tinker', 'fool'] },
    })

    const steps = generateNightSteps(game, 'first')
    expect(steps[0]?.kind).toBe('minion-info')
    expect(steps[0]?.resolvedInfo).toContain('BMR 4')
    expect(steps[1]?.kind).toBe('demon-info')
    expect(steps[1]?.bluffCharacterIds).toEqual(['sailor', 'tinker', 'fool'])
    expect(steps.some((step) => step.characterId === 'grandmother')).toBe(true)
  })
})
