import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoNoGreaterJoy from '@/assets/logo-no-greater-joy.svg'
import logoBadMoonRising from '../../bad_moon/Logo BDM.png'
import type { ScriptId } from '@/types'

export function getScriptName(scriptId: ScriptId): string {
  if (scriptId === 'bad-moon-rising') return 'Bad Moon Rising'
  if (scriptId === 'no-greater-joy') return 'No Greater Joy'
  return 'Trouble Brewing'
}

export function getScriptLogo(scriptId: ScriptId | undefined): string {
  if (scriptId === 'bad-moon-rising') return logoBadMoonRising
  if (scriptId === 'no-greater-joy') return logoNoGreaterJoy
  return logoTroubleBrewing
}

export { logoTroubleBrewing, logoBadMoonRising, logoNoGreaterJoy }
