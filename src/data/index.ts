import type { Character, ScriptId } from '@/types'
import { TROUBLE_BREWING_CHARACTERS } from './characters/trouble-brewing'
import { BAD_MOON_RISING_CHARACTERS } from './characters/bad-moon-rising'
import { NO_GREATER_JOY_CHARACTERS } from './characters/no-greater-joy'

export { TROUBLE_BREWING_CHARACTERS } from './characters/trouble-brewing'
export { BAD_MOON_RISING_CHARACTERS } from './characters/bad-moon-rising'
export { NO_GREATER_JOY_CHARACTERS } from './characters/no-greater-joy'
export { BASE_DISTRIBUTION_TABLE, MIN_PLAYERS, MAX_PLAYERS } from './distribution-table'

/** Registre des scripts disponibles. Seul Trouble Brewing est fourni pour le MVP,
 * mais la structure permet d'ajouter d'autres scripts sans changer le moteur. */
export const CHARACTERS_BY_SCRIPT: Record<ScriptId, Character[]> = {
  'trouble-brewing': TROUBLE_BREWING_CHARACTERS,
  'bad-moon-rising': BAD_MOON_RISING_CHARACTERS,
  'no-greater-joy': NO_GREATER_JOY_CHARACTERS,
}

export function getCharactersForScript(scriptId: ScriptId): Character[] {
  return CHARACTERS_BY_SCRIPT[scriptId]
}

export function getCharacterById(scriptId: ScriptId, characterId: string): Character | undefined {
  return getCharactersForScript(scriptId).find((c) => c.id === characterId)
}
