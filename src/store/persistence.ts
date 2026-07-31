import type { Game, GameEvent, GamePhase } from '@/types'

const INDEX_KEY = 'botc:index'
const GAME_KEY_PREFIX = 'botc:game:'

export interface SaveIndexEntry {
  id: string
  label: string
  createdAt: string
  updatedAt: string
  playerCount: number
  phase: GamePhase
}

export interface PersistedGame {
  game: Game
  history: GameEvent[]
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadIndex(): SaveIndexEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(INDEX_KEY)
    return raw ? (JSON.parse(raw) as SaveIndexEntry[]) : []
  } catch {
    return []
  }
}

function saveIndex(entries: SaveIndexEntry[]): void {
  if (!isBrowser()) return
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
}

function buildLabel(game: Game): string {
  const date = new Date(game.createdAt)
  const formatted = Number.isNaN(date.getTime())
    ? game.createdAt
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const scriptName = game.scriptId === 'bad-moon-rising' ? 'Bad Moon Rising' : 'Trouble Brewing'
  return `${scriptName} — ${formatted} — ${game.players.length} joueurs`
}

/** Sauvegarde la partie et son historique, et met à jour l'index des sauvegardes. */
export function saveGameToStorage(game: Game, history: GameEvent[]): void {
  if (!isBrowser()) return
  const payload: PersistedGame = { game, history }
  window.localStorage.setItem(`${GAME_KEY_PREFIX}${game.id}`, JSON.stringify(payload))

  const index = loadIndex()
  const entry: SaveIndexEntry = {
    id: game.id,
    label: buildLabel(game),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    playerCount: game.players.length,
    phase: game.phase,
  }
  const existingIndex = index.findIndex((e) => e.id === game.id)
  if (existingIndex >= 0) index[existingIndex] = entry
  else index.push(entry)
  saveIndex(index)
}

export function loadGameFromStorage(id: string): PersistedGame | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(`${GAME_KEY_PREFIX}${id}`)
    return raw ? (JSON.parse(raw) as PersistedGame) : null
  } catch {
    return null
  }
}

export function deleteGameFromStorage(id: string): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(`${GAME_KEY_PREFIX}${id}`)
  saveIndex(loadIndex().filter((e) => e.id !== id))
}

/** Identifiant de la partie la plus récemment mise à jour, pour "Reprendre une partie". */
export function getMostRecentGameId(): string | null {
  const index = loadIndex()
  if (index.length === 0) return null
  return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id ?? null
}

export function exportGameToJson(game: Game, history: GameEvent[]): string {
  return JSON.stringify({ game, history } satisfies PersistedGame, null, 2)
}

export function importGameFromJson(json: string): PersistedGame {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Fichier de sauvegarde invalide : JSON illisible.')
  }
  const candidate = parsed as Partial<PersistedGame>
  if (!candidate?.game?.id || !Array.isArray(candidate.history)) {
    throw new Error('Fichier de sauvegarde invalide : structure inattendue.')
  }
  return candidate as PersistedGame
}
