import { nanoid } from 'nanoid'
import type { Character, Game, Player } from '@/types'
import { getCharacterById } from '@/data'
import { getLivingNeighbors } from './circle'

export type DeathCause = 'night' | 'execution'

export interface DeathResolution {
  player: Player
  outcome: 'dead' | 'prevented' | 'survived'
  reason: string
}

/** Un rappel "Ivre (...)" posé par l'une des capacités qui rendent quelqu'un ivre. */
function isDrunkFrom(player: Player, sourceCharacterId: string): boolean {
  return player.reminders.some((r) => r.sourceCharacterId === sourceCharacterId && r.label.startsWith('Ivre'))
}

export function isPlayerDrunk(player: Player): boolean {
  return ['courtier', 'sailor', 'innkeeper', 'goon', 'minstrel'].some((source) => isDrunkFrom(player, source))
    || player.reminders.some((reminder) => reminder.label.startsWith('Empoisonné'))
}

/**
 * Résout la mort d'un joueur en tenant compte de toutes les protections/immunités suivies par
 * l'application (Bad Moon Rising V3 — voir la feuille de référence de l'utilisateur) : Aubergiste/
 * Moine (nuit uniquement), Marin (nuit, seulement s'il est resté sobre), Herboriste (nuit ET
 * exécution, voisins vivants les plus proches, tant qu'ils sont gentils), Avocat du diable et
 * Pacifiste (exécution uniquement), puis les immunités à usage unique Bouffon et Zombuul.
 * `ignoreProtection` (Assassin) court-circuite tout : la mort est toujours appliquée.
 */
export function resolvePlayerDeathDetailed(
  player: Player,
  allPlayers: Player[],
  source: Character | undefined,
  cause: DeathCause,
  ignoreProtection: boolean,
): DeathResolution {
  if (!player.alive) return { player, outcome: 'prevented', reason: 'était déjà mort(e)' }
  if (ignoreProtection) return { player: { ...player, alive: false }, outcome: 'dead', reason: 'Assassin : les protections sont ignorées' }

  if (cause === 'night') {
    const protectedByInnkeeper = player.reminders.some(
      (r) => r.sourceCharacterId === 'innkeeper' && r.label.startsWith('Protégé'),
    )
    const protectedByMonk = source?.category === 'demon' && player.reminders.some((r) => r.sourceCharacterId === 'monk')
    const sailorImmune = player.realCharacterId === 'sailor' && !isPlayerDrunk(player)
    const soldierImmune = player.realCharacterId === 'soldier' && source?.category === 'demon' && !isPlayerDrunk(player)
    if (protectedByInnkeeper) return { player, outcome: 'prevented', reason: 'protégé(e) par l’Aubergiste' }
    if (protectedByMonk) return { player, outcome: 'prevented', reason: 'protégé(e) par le Moine' }
    if (sailorImmune) return { player, outcome: 'prevented', reason: 'Marin sobre : il est immortel cette nuit' }
    if (soldierImmune) return { player, outcome: 'prevented', reason: 'Soldat : immunisé contre le Démon' }
  }

  if (cause === 'execution') {
    const advocateProtected = player.reminders.some((r) => r.sourceCharacterId === 'devils-advocate')
    const pacifistProtected = player.reminders.some((r) => r.sourceCharacterId === 'pacifist')
    if (advocateProtected) return { player, outcome: 'prevented', reason: 'protégé(e) par l’Avocat du diable' }
    if (pacifistProtected) return { player, outcome: 'prevented', reason: 'sauvé(e) par le Pacifiste' }
  }

  const teaLady = allPlayers.find((p) => p.alive && p.realCharacterId === 'tea-lady' && !isPlayerDrunk(p))
  if (teaLady && player.alignment === 'good') {
    const neighbors = getLivingNeighbors(allPlayers, teaLady.id)
    const bothNeighborsAreGood = neighbors.left?.alignment === 'good' && neighbors.right?.alignment === 'good'
    if (bothNeighborsAreGood && (neighbors.left?.id === player.id || neighbors.right?.id === player.id)) {
      return { player, outcome: 'prevented', reason: 'protégé(e) par l’Herboriste (voisin gentil)' }
    }
  }

  const foolUsed = player.reminders.some((r) => r.sourceCharacterId === 'fool')
  if (player.realCharacterId === 'fool' && !foolUsed && !isPlayerDrunk(player)) {
    return {
      outcome: 'survived', reason: 'Bouffon : sa première vie est consommée', player: {
      ...player,
      reminders: [
        ...player.reminders,
        { id: nanoid(), label: 'Vie du Bouffon consommée', sourceCharacterId: 'fool', createdAt: new Date().toISOString() },
      ],
    }}
  }

  const zombuulUsed = player.reminders.some((r) => r.sourceCharacterId === 'zombuul')
  if (player.realCharacterId === 'zombuul' && !zombuulUsed) {
    return {
      outcome: 'survived', reason: 'Zombuul : paraît mort(e), mais reste vivant(e)', player: {
      ...player,
      reminders: [
        ...player.reminders,
        { id: nanoid(), label: 'Mort vivant', sourceCharacterId: 'zombuul', createdAt: new Date().toISOString() },
      ],
    }}
  }

  return { player: { ...player, alive: false }, outcome: 'dead', reason: source ? `tué(e) par ${source.nameFr}` : 'meurt' }
}

export function resolvePlayerDeath(
  player: Player,
  allPlayers: Player[],
  source: Character | undefined,
  cause: DeathCause,
  ignoreProtection: boolean,
): Player {
  return resolvePlayerDeathDetailed(player, allPlayers, source, cause, ignoreProtection).player
}

/**
 * Confidente (Trouble Brewing) : si le Démon vient de mourir (quelle qu'en soit la cause) et
 * qu'il reste au moins 5 joueurs vivants, la Confidente vivante devient immédiatement le nouveau
 * Démon — jamais annoncé publiquement. `beforePlayers`/`afterPlayers` doivent correspondre au
 * même instant (juste avant/après la résolution de la mort qui vient d'être appliquée).
 */
export function applyScarletWomanSuccession(
  scriptId: Game['scriptId'],
  beforePlayers: Player[],
  afterPlayers: Player[],
): Player[] {
  const diedDemon = beforePlayers.find((before) => {
    if (!before.alive) return false
    const after = afterPlayers.find((p) => p.id === before.id)
    if (!after || after.alive) return false
    const character = before.realCharacterId ? getCharacterById(scriptId, before.realCharacterId) : undefined
    return character?.category === 'demon'
  })
  if (!diedDemon?.realCharacterId) return afterPlayers

  const livingCount = afterPlayers.filter((p) => p.alive).length
  const scarletWoman = afterPlayers.find((p) => p.alive && p.realCharacterId === 'scarlet-woman')
  if (!scarletWoman || livingCount < 5) return afterPlayers

  return afterPlayers.map((p) =>
    p.id === scarletWoman.id
      ? {
          ...p,
          realCharacterId: diedDemon.realCharacterId,
          alignment: 'evil',
          notes: [
            ...p.notes,
            {
              id: nanoid(),
              text: `Confidente : devient le nouveau Démon (${diedDemon.realCharacterId}) après la mort de ${diedDemon.name}.`,
              category: 'information' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      : p,
  )
}
