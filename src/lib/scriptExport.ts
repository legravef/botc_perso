import type { ScriptId } from '@/types'
import { getCharactersForScript } from '@/data'

/**
 * Format JSON "script" devenu un standard de facto dans l'écosystème
 * communautaire Blood on the Clocktower (Script Tool officiel, townsquare,
 * Pocket Grimoire...) : un tableau d'objets personnage, précédé d'une entrée
 * de métadonnées "_meta". Exporter dans ce format permet de réutiliser la
 * composition d'une partie dans ces autres outils.
 */
export interface CommunityScriptMeta {
  id: '_meta'
  name: string
  author?: string
}

export interface CommunityScriptCharacter {
  id: string
  name: string
  team: 'townsfolk' | 'outsider' | 'minion' | 'demon'
  ability: string
  firstNight: number
  firstNightReminder: string
  otherNight: number
  otherNightReminder: string
  reminders: string[]
  setup: boolean
}

export type CommunityScriptEntry = CommunityScriptMeta | CommunityScriptCharacter

export function exportCompositionToScriptJson(
  characterIds: string[],
  scriptId: ScriptId,
  scriptName = 'Composition exportée — Assistant Conteur',
): CommunityScriptEntry[] {
  const characters = getCharactersForScript(scriptId)
  const meta: CommunityScriptMeta = { id: '_meta', name: scriptName, author: 'Assistant Conteur (non officiel)' }

  const entries: CommunityScriptCharacter[] = characterIds.flatMap((id) => {
    const character = characters.find((c) => c.id === id)
    if (!character) return []
    return [
      {
        id: character.id,
        name: character.nameEn,
        team: character.category,
        ability: character.shortDescription,
        firstNight: character.firstNightOrder ?? 0,
        firstNightReminder: '',
        otherNight: character.otherNightOrder ?? 0,
        otherNightReminder: '',
        reminders: character.reminders,
        setup: character.setupModifier !== null,
      },
    ]
  })

  return [meta, ...entries]
}
