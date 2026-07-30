import { useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import { suggestWinCondition } from '@/engine'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { SkyBanner } from '../components/SkyBanner'
import { RoleIcon } from '../components/RoleIcon'

const NO_EXECUTION = ''

export function DayScreen({ onOpenGrimoire }: { onOpenGrimoire: () => void }) {
  const game = useGameStore((s) => s.game)
  const startNextNight = useGameStore((s) => s.startNextNight)
  const resolveExecution = useGameStore((s) => s.resolveExecution)
  const endGame = useGameStore((s) => s.endGame)

  const [executedPlayerId, setExecutedPlayerId] = useState(NO_EXECUTION)
  const [winSuggestion, setWinSuggestion] = useState<ReturnType<typeof suggestWinCondition>>(null)

  if (!game) return null

  const deadPlayers = game.players.filter((p) => !p.alive)
  const livingPlayers = game.players.filter((p) => p.alive)

  function handleConfirm() {
    resolveExecution(executedPlayerId || null)
    const updatedGame = useGameStore.getState().game
    if (!updatedGame) return
    const suggestion = suggestWinCondition(updatedGame, executedPlayerId || null)
    if (suggestion) {
      setWinSuggestion(suggestion)
    } else {
      startNextNight()
    }
  }

  if (winSuggestion) {
    const executed = executedPlayerId ? game.players.find((p) => p.id === executedPlayerId) : undefined
    const executedCharacter = executed?.realCharacterId
      ? getCharacterById(game.scriptId, executed.realCharacterId)
      : undefined

    return (
      <Screen title={`Jour ${game.dayNumber} — Résultat`} subtitle="Exécution résolue.">
        <div className="max-w-xl mx-auto flex flex-col gap-6">
          {executed && (
            <div className="bg-surface-1 border border-border rounded-2xl p-6 flex flex-col gap-3 items-center text-center">
              <RoleIcon characterId={executedCharacter?.id} nameFr={executedCharacter?.nameFr} size={56} />
              <p className="text-lg">
                <span className="font-semibold">{executed.name}</span> a été exécuté(e).
              </p>
              <p className="text-sm text-ink-2">Rôle révélé : {executedCharacter?.nameFr ?? '—'}</p>
            </div>
          )}
          <div className="bg-accent/10 border border-accent/40 rounded-2xl p-6 flex flex-col gap-3 text-center">
            <p className="text-sm text-ink-2">Condition de victoire détectée</p>
            <p className="text-xl font-semibold">
              {winSuggestion.winner === 'good' ? 'Le Bien semble avoir gagné' : 'Le Mal semble avoir gagné'}
            </p>
            <p className="text-sm text-ink-1">{winSuggestion.reason}</p>
            <div className="flex gap-3 justify-center mt-2">
              <Button variant="ghost" onClick={() => startNextNight()}>
                Continuer la partie
              </Button>
              <Button
                variant="primary"
                onClick={() => endGame({ winner: winSuggestion.winner, reason: winSuggestion.reason })}
              >
                Confirmer la fin de partie
              </Button>
            </div>
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      title={`Jour ${game.dayNumber}`}
      subtitle="Menez les nominations et le vote à table comme d'habitude — l'app n'a besoin de savoir que le résultat."
      footer={
        <Button variant="primary" onClick={handleConfirm}>
          Confirmer et passer à la nuit suivante
        </Button>
      }
    >
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <SkyBanner variant="sunrise" className="h-56" />
        <p className="text-lg">Le jour se lève.</p>

        <section>
          <h2 className="text-sm text-ink-2 mb-2">Joueurs morts</h2>
          {deadPlayers.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {deadPlayers.map((p) => (
                <li key={p.id} className="bg-surface-1 border border-border rounded-lg px-3 py-2 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-xs text-ink-2">
                    Vote fantôme {p.ghostVoteAvailable ? 'disponible' : 'utilisé'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2 text-sm">Aucun joueur mort pour le moment.</p>
          )}
        </section>

        <section className="bg-surface-1 border border-border rounded-2xl p-5 flex flex-col gap-2">
          <h2 className="text-sm text-ink-2">Un joueur a-t-il été exécuté aujourd'hui ?</h2>
          <select
            value={executedPlayerId}
            onChange={(e) => setExecutedPlayerId(e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-2"
          >
            <option value={NO_EXECUTION}>Personne n'a été exécuté</option>
            {livingPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </section>

        <Button variant="secondary" onClick={onOpenGrimoire} className="self-start">
          Ouvrir le grimoire
        </Button>
      </div>
    </Screen>
  )
}
