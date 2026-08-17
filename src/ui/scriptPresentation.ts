import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoNoGreaterJoy from '@/assets/logo-no-greater-joy.svg'
import logoOverTheRiver from '@/assets/logo-over-the-river.svg'
import logoBadMoonRising from '@/assets/logo-bad-moon-rising.png'
import type { ScriptId } from '@/types'

export function getScriptName(scriptId: ScriptId): string {
  if (scriptId === 'bad-moon-rising') return 'Bad Moon Rising'
  if (scriptId === 'no-greater-joy') return 'No Greater Joy'
  if (scriptId === 'over-the-river') return 'Over the River'
  return 'Trouble Brewing'
}

export function getScriptLogo(scriptId: ScriptId | undefined): string {
  if (scriptId === 'bad-moon-rising') return logoBadMoonRising
  if (scriptId === 'no-greater-joy') return logoNoGreaterJoy
  if (scriptId === 'over-the-river') return logoOverTheRiver
  return logoTroubleBrewing
}

export { logoTroubleBrewing, logoBadMoonRising, logoNoGreaterJoy, logoOverTheRiver }
