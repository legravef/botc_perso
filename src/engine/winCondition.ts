import { getCharacterById } from '@/data'
import type { Game, GameEndInfo } from '@/types'

/** Personnages dont l'exécution (spécifiquement, pas n'importe quelle mort) déclenche la
 * victoire immédiate du Mal. Dans Trouble Brewing, seul le Saint. */
const EXECUTION_TRIGGERS_EVIL_WIN = new Set(['saint'])

/**
 * Suggère une condition de victoire à partir de l'état courant — ne force jamais la fin de
 * partie, le Conteur reste seul juge final (cas particuliers non modélisés ici : Maire à 3
 * joueurs sans exécution, ambiguïtés d'alignement du Reclus/Espion, house rules...). Retourne
 * null si aucune condition évidente n'est remplie et que la partie continue normalement.
 *
 * `justExecutedPlayerId` doit être fourni juste après une exécution pour détecter le
 * déclencheur du Saint — un joueur qui meurt la nuit avec le rôle de Saint ne déclenche PAS
 * cette victoire, seule une exécution le fait.
 */
export function suggestWinCondition(game: Game, justExecutedPlayerId?: string | null): GameEndInfo | null {
  if (justExecutedPlayerId) {
    const executed = game.players.find((p) => p.id === justExecutedPlayerId)
    if (executed?.realCharacterId && EXECUTION_TRIGGERS_EVIL_WIN.has(executed.realCharacterId)) {
      const character = getCharacterById(game.scriptId, executed.realCharacterId)
      return {
        winner: 'evil',
        reason: `${executed.name} (${character?.nameFr ?? executed.realCharacterId}) a été exécuté(e) : le Mal gagne immédiatement.`,
        confirmedAt: new Date().toISOString(),
      }
    }
  }

  const living = game.players.filter((p) => p.alive)
  const demonAlive = living.some(
    (p) => p.realCharacterId && getCharacterById(game.scriptId, p.realCharacterId)?.category === 'demon',
  )

  if (!demonAlive) {
    return {
      winner: 'good',
      reason: 'Le Démon est mort : le Bien gagne.',
      confirmedAt: new Date().toISOString(),
    }
  }

  if (living.length <= 2) {
    return {
      winner: 'evil',
      reason: 'Il ne reste que 2 joueurs vivants (ou moins) avec le Démon en vie : le Mal gagne.',
      confirmedAt: new Date().toISOString(),
    }
  }

  return null
}
