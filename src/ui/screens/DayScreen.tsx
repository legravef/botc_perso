import { useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import { suggestWinCondition } from '@/engine'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { SkyBanner } from '../components/SkyBanner'
import { RoleIcon } from '../components/RoleIcon'
import { DayBriefing } from '../components/DayTools'
import { PlayerChoiceGrid } from '../components/PlayerChoiceGrid'

const NO_EXECUTION = ''

export function DayScreen({ onOpenGrimoire }: { onOpenGrimoire: () => void }) {
  const game = useGameStore((s) => s.game)
  const startNextNight = useGameStore((s) => s.startNextNight)
  const resolveExecution = useGameStore((s) => s.resolveExecution)
  const endGame = useGameStore((s) => s.endGame)
  const addReminder = useGameStore((s) => s.addReminder)
  const setGossipKillDue = useGameStore((s) => s.setGossipKillDue)
  const setMoonchildTarget = useGameStore((s) => s.setMoonchildTarget)
  const history = useGameStore((s) => s.history)

  const [executedPlayerId, setExecutedPlayerId] = useState(NO_EXECUTION)
  const [pacifistSaves, setPacifistSaves] = useState(false)
  const [winSuggestion, setWinSuggestion] = useState<ReturnType<typeof suggestWinCondition>>(null)
  const [showManualEnd, setShowManualEnd] = useState(false)
  const [manualWinner, setManualWinner] = useState<'good' | 'evil'>('good')
  const [manualReason, setManualReason] = useState('')
  const [showNoExecutionConfirm, setShowNoExecutionConfirm] = useState(false)
  const [gossipWasTrue, setGossipWasTrue] = useState(false)
  const [moonchildTargetId, setMoonchildTargetId] = useState('')

  if (!game) return null

  const deadPlayers = game.players.filter((p) => !p.alive)
  const livingPlayers = game.players.filter((p) => p.alive)
  const minstrelActive = game.players.some((player) => player.reminders.some((reminder) => reminder.sourceCharacterId === 'minstrel'))
  const executedCandidate = executedPlayerId ? game.players.find((p) => p.id === executedPlayerId) : undefined
  const pacifistAlive = game.players.some((p) => p.alive && p.realCharacterId === 'pacifist')
  const showPacifistChoice = game.scriptId === 'bad-moon-rising' && pacifistAlive && executedCandidate?.alignment === 'good'
  const gossipPlayer = game.scriptId === 'bad-moon-rising'
    ? game.players.find((player) => player.alive && player.realCharacterId === 'gossip' && !player.reminders.some((reminder) =>
      (['courtier', 'sailor', 'innkeeper', 'goon', 'minstrel'].includes(reminder.sourceCharacterId) && reminder.label.startsWith('Ivre'))
      || reminder.label.startsWith('Empoisonné'),
    ))
    : undefined
  const moonchildDeadPlayer = deadPlayers.find((player) => player.realCharacterId === 'moonchild')
  // Le Moonchild peut apprendre sa mort par exécution (ci-dessous) OU par une mort de nuit
  // (démon, Pipelette...) — dans ce second cas, on le détecte via le journal de la nuit passée,
  // qui n'est effacé qu'au démarrage de la nuit suivante : ce déclencheur ne reste donc actif
  // que le jour qui suit immédiatement sa mort.
  const moonchildNightDeath = game.scriptId === 'bad-moon-rising' && !!moonchildDeadPlayer
    && (game.nightLog ?? []).some((entry) => entry.outcome === 'dead' && entry.targetName === moonchildDeadPlayer.name)
  const showMoonchildChoice = game.scriptId === 'bad-moon-rising' && (executedCandidate?.realCharacterId === 'moonchild' || moonchildNightDeath)

  function handleConfirm() {
    if (!executedPlayerId) {
      setShowNoExecutionConfirm(true)
      return
    }
    finishDay()
  }

  function finishDay() {
    if (executedPlayerId && showPacifistChoice && pacifistSaves) {
      addReminder(executedPlayerId, 'Protégé (Pacifiste)', 'pacifist')
    }
    resolveExecution(executedPlayerId || null)
    const updatedGame = useGameStore.getState().game
    if (!updatedGame) return
    if (gossipWasTrue && gossipPlayer) setGossipKillDue(true)
    if (showMoonchildChoice && moonchildTargetId) {
      const executedMoonchildDied = executedCandidate?.realCharacterId === 'moonchild'
        && updatedGame.players.find((player) => player.id === executedPlayerId)?.alive === false
      if (executedMoonchildDied || moonchildNightDeath) {
        setMoonchildTarget(moonchildTargetId, updatedGame.players.find((player) => player.id === moonchildTargetId)?.alignment === 'good')
      }
    }
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
      headerActions={
        <Button variant="danger" onClick={() => setShowManualEnd(true)}>
          Terminer la partie
        </Button>
      }
      footer={
        <Button variant="primary" onClick={handleConfirm}>
          Confirmer et passer à la nuit suivante
        </Button>
      }
    >
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <SkyBanner variant="sunrise" className="h-56" />
        <DayBriefing history={history} game={game} />
        {minstrelActive && (
          <section className="bg-warn/10 border border-warn/40 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-warn mb-1">Ménestrel actif</p>
            <p className="text-sm">Un Sbire a été exécuté : tous les autres joueurs restent ivres pendant ce jour.</p>
          </section>
        )}
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
            className="hidden"
          >
            <option value={NO_EXECUTION}>Personne n'a été exécuté</option>
            {livingPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button variant={executedPlayerId ? 'secondary' : 'primary'} className="self-start px-3 py-2 text-sm" onClick={() => { setExecutedPlayerId(NO_EXECUTION); setPacifistSaves(false) }}>
            Personne n'a été exécuté
          </Button>
          <PlayerChoiceGrid players={livingPlayers} selectedIds={executedPlayerId ? [executedPlayerId] : []} onSelect={(id) => { setExecutedPlayerId(id); setPacifistSaves(false) }} />
          {showPacifistChoice && (
            <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-warn mb-1">Décision du Conteur — Pacifiste</p>
                <p className="text-sm">{executedCandidate?.name} est gentil(le) : le Pacifiste peut le/la sauver.</p>
              </div>
              <Button variant={pacifistSaves ? 'primary' : 'secondary'} onClick={() => setPacifistSaves((v) => !v)}>
                {pacifistSaves ? 'Sauvé par le Pacifiste' : 'Le sauver'}
              </Button>
            </div>
          )}
          {gossipPlayer && (
            <div className="bg-accent/10 border border-accent/35 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-wide text-accent mb-1">Pipelette</p><p className="text-sm">Une déclaration publique de {gossipPlayer.name} était-elle vraie ?</p></div>
              <Button variant={gossipWasTrue ? 'primary' : 'secondary'} onClick={() => setGossipWasTrue((value) => !value)}>{gossipWasTrue ? 'Vraie : mort prévue cette nuit' : 'Marquer comme vraie'}</Button>
            </div>
          )}
          {showMoonchildChoice && (
            <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-warn mb-1">Moonchild — choix public si sa mort est annoncée</p>
              <p className="text-sm mb-2">Choisissez le joueur vivant ciblé. Il mourra la nuit suivante uniquement s’il est gentil au moment de ce choix.</p>
              <PlayerChoiceGrid players={livingPlayers.filter((player) => player.id !== executedCandidate?.id)} selectedIds={moonchildTargetId ? [moonchildTargetId] : []} onSelect={setMoonchildTargetId} />
            </div>
          )}
        </section>

        <Button variant="secondary" onClick={onOpenGrimoire} className="self-start">
          Ouvrir le grimoire
        </Button>
        <section className="border-t border-border pt-5 mt-2">
          {showManualEnd && (
            <div className="bg-surface-1 border border-danger/40 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm font-medium">Confirmer la fin de partie</p>
              <div className="flex gap-2">
                <Button variant={manualWinner === 'good' ? 'primary' : 'secondary'} onClick={() => setManualWinner('good')}>Le Bien gagne</Button>
                <Button variant={manualWinner === 'evil' ? 'danger' : 'secondary'} onClick={() => setManualWinner('evil')}>Le Mal gagne</Button>
              </div>
              <input value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Raison (facultative)" className="bg-surface-2 border border-border rounded px-3 py-2" />
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => endGame({ winner: manualWinner, reason: manualReason.trim() || 'Fin de partie décidée par le Conteur.' })}>Terminer</Button>
                <Button variant="ghost" onClick={() => setShowManualEnd(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </section>
        {showNoExecutionConfirm && (
          <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="no-execution-title">
            <div className="w-full max-w-md bg-surface-1 border border-warn/45 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
              <div>
                <p className="text-xs text-warn uppercase tracking-[0.16em] mb-2">Attention</p>
                <h2 id="no-execution-title" className="text-xl font-semibold">Aucun joueur n’a été exécuté aujourd’hui</h2>
              </div>
              <p className="text-sm text-ink-1">Voulez-vous vraiment terminer le jour et passer à la nuit suivante sans exécution ?</p>
              <div className="flex justify-end gap-3 mt-1">
                <Button variant="ghost" onClick={() => setShowNoExecutionConfirm(false)}>Revenir au jour</Button>
                <Button variant="primary" onClick={() => { setShowNoExecutionConfirm(false); finishDay() }}>Passer à la nuit</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Screen>
  )
}
