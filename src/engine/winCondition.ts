import { getCharacterById } from '@/data'
import type { Game, GameEndInfo } from '@/types'

/** Personnages dont l'exécution (spécifiquement, pas n'importe quelle mort) déclenche la
 * victoire immédiate du Mal. Dans Trouble Brewing, seul le Saint. */
const EXECUTION_TRIGGERS_EVIL_WIN = new Set(['saint'])

/**
 * Suggère une condition de victoire à partir de l'état courant — ne force jamais la fin de
 * partie, le Conteur reste seul juge final (cas particuliers non modélisés ici : ambiguïtés
 * d'alignement du Reclus/Espion, house rules...). Retourne null si aucune condition évidente
 * n'est remplie et que la partie continue normalement.
 *
 * `justExecutedPlayerId` doit être fourni juste après une exécution pour détecter le
 * déclencheur du Saint — un joueur qui meurt la nuit avec le rôle de Saint ne déclenche PAS
 * cette victoire, seule une exécution le fait.
 */
export function suggestWinCondition(game: Game, justExecutedPlayerId?: string | null): GameEndInfo | null {
  const mastermindDueToday = game.mastermindExtraDayDueOnDay === game.dayNumber

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

    // Cerveau (Mastermind) : le Démon a été exécuté un jour précédent alors qu'un Cerveau était
    // vivant — cette exécution-ci, le jour supplémentaire, tranche la partie. L'équipe du joueur
    // exécuté aujourd'hui perd.
    if (mastermindDueToday && executed) {
      const winner = executed.alignment === 'good' ? 'evil' : 'good'
      return {
        winner,
        reason: `Cerveau : jour supplémentaire après l'exécution du Démon. ${executed.name} (${executed.alignment === 'good' ? 'gentil' : 'méchant'}) a été exécuté(e) aujourd'hui : son équipe perd.`,
        confirmedAt: new Date().toISOString(),
      }
    }
  } else if (mastermindDueToday) {
    return {
      winner: 'good',
      reason: "Cerveau : jour supplémentaire après l'exécution du Démon. Personne n'a été exécuté aujourd'hui : le Bien gagne.",
      confirmedAt: new Date().toISOString(),
    }
  }

  const living = game.players.filter((p) => p.alive)
  const demonAlive = living.some(
    (p) => p.realCharacterId && getCharacterById(game.scriptId, p.realCharacterId)?.category === 'demon',
  )

  if (!demonAlive) {
    // Un Cerveau vivant vient de transformer cette exécution du Démon en jour supplémentaire
    // (voir resolveExecution) : ne pas terminer la partie tout de suite, elle se réglera au jour
    // suivant via la branche mastermindDueToday ci-dessus.
    if (game.mastermindExtraDayDueOnDay === game.dayNumber + 1) {
      return null
    }
    return {
      winner: 'good',
      reason: 'Le Démon est mort : le Bien gagne.',
      confirmedAt: new Date().toISOString(),
    }
  }

  if (living.length === 3 && !justExecutedPlayerId && living.some((p) => p.realCharacterId === 'mayor')) {
    return {
      winner: 'good',
      reason: 'Maire : il ne reste que 3 joueurs vivants et personne n’a été exécuté aujourd’hui : le Bien gagne.',
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
