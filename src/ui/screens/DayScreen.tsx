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

type Opening = { title: string; text: string; cue: string }

const OPENINGS: Record<'trouble-brewing' | 'bad-moon-rising', Opening[]> = {
  'trouble-brewing': [
    { title: 'Ouverture — Trouble Brewing', text: 'À Ravenswood Bluff, l’horloge sonne mais personne ne se souvient de l’avoir remontée. Cette nuit, le mal a trouvé une porte entrouverte. Regardez vos voisins : l’un d’eux a peut-être déjà appris à mentir.', cue: 'Marquez une courte pause après « porte entrouverte ».' },
    { title: 'Ouverture — Trouble Brewing', text: 'Le brouillard s’accroche aux pavés et les corbeaux se taisent trop vite. Au matin, chacun aura une histoire à raconter. La difficulté sera de savoir lesquelles méritent d’être crues.', cue: 'Lisez la dernière phrase plus lentement, puis invitez les regards à se croiser.' },
    { title: 'Ouverture — Trouble Brewing', text: 'La cloche du village a sonné treize coups. Personne ne l’a entendue, sauf vous tous. Quelque chose rôde dans les ruelles de Ravenswood Bluff, et il compte sur votre certitude pour vous égarer.', cue: 'Donnez un ton conspirateur à « sauf vous tous ».' },
    { title: 'Ouverture — Trouble Brewing', text: 'Cette nuit, une fenêtre est restée allumée au sommet de la tour. À son pied, les habitants se réveillent avec une question simple : qui protège le village… et qui le regarde brûler ?', cue: 'Laissez deux secondes de silence avant la question finale.' },
    { title: 'Ouverture — Trouble Brewing', text: 'Les tavernes ouvrent leurs volets, les rumeurs aussi. Un sourire trop assuré, une information trop parfaite ou un silence trop long peuvent être votre meilleur indice. Ou votre pire erreur.', cue: 'Vous pouvez désigner théâtralement la table sur « votre pire erreur ».' },
    { title: 'Ouverture — Trouble Brewing', text: 'Ravenswood Bluff s’éveille, mais la nuit n’est jamais tout à fait partie. Le Bien cherche la vérité ; le Mal cherche une voix convaincante. Aujourd’hui, les deux parleront avec le même visage.', cue: 'Adoptez un ton calme : l’ouverture doit lancer la discussion, pas expliquer les règles.' },
  ],
  'bad-moon-rising': [
    { title: 'Ouverture — Bad Moon Rising', text: 'La lune pâle ne quitte plus Ravenswood Bluff. Ici, les morts ont parfois de mauvaises habitudes : ils reviennent, ils se taisent, ils observent. Ne comptez pas trop vite les chaises vides.', cue: 'Insistez doucement sur « ils reviennent ».' },
    { title: 'Ouverture — Bad Moon Rising', text: 'Le gel dessine des griffes sur les fenêtres et les cloches ont cessé de sonner. Cette nuit, la mort a parcouru le village ; au matin, elle laissera des indices, mais rarement des certitudes.', cue: 'Faites une pause après « le village ».' },
    { title: 'Ouverture — Bad Moon Rising', text: 'Dans les ruelles, on raconte qu’un défunt a frappé à sa propre porte. À Ravenswood Bluff, survivre ne prouve rien, mourir ne termine rien, et la lune ne donne jamais d’explication.', cue: 'Lisez les trois dernières propositions avec un rythme régulier.' },
    { title: 'Ouverture — Bad Moon Rising', text: 'Les lanternes vacillent sous un vent sans chaleur. Le village devra choisir qui croire, alors que protections, poisons et miracles se disputent déjà la nuit.', cue: 'Un ton grave convient mieux que l’humour pour cette variante.' },
    { title: 'Ouverture — Bad Moon Rising', text: 'La nuit a laissé des traces dans la neige, mais elles s’arrêtent toutes au même endroit : la place du village. Certains secrets meurent avec leurs porteurs. D’autres refusent obstinément de le faire.', cue: 'Marquez un arrêt net entre les deux dernières phrases.' },
    { title: 'Ouverture — Bad Moon Rising', text: 'Une mauvaise lune se lève sur Ravenswood Bluff. Gardez les yeux ouverts, même devant les tombeaux : cette partie ne récompensera pas ceux qui prennent les apparences pour des preuves.', cue: 'Terminez avec un léger sourire, puis laissez les joueurs commencer à parler.' },
  ],
}

function openingForGame(scriptId: 'trouble-brewing' | 'bad-moon-rising', gameId: string): Opening {
  const hash = [...gameId].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0)
  const openings = OPENINGS[scriptId]
  return openings[hash % openings.length]!
}

export function DayScreen({ onOpenGrimoire }: { onOpenGrimoire: () => void }) {
  const game = useGameStore((s) => s.game)
  const startNextNight = useGameStore((s) => s.startNextNight)
  const resolveExecution = useGameStore((s) => s.resolveExecution)
  const endGame = useGameStore((s) => s.endGame)
  const history = useGameStore((s) => s.history)

  const [executedPlayerId, setExecutedPlayerId] = useState(NO_EXECUTION)
  const [winSuggestion, setWinSuggestion] = useState<ReturnType<typeof suggestWinCondition>>(null)
  const [showManualEnd, setShowManualEnd] = useState(false)
  const [manualWinner, setManualWinner] = useState<'good' | 'evil'>('good')
  const [manualReason, setManualReason] = useState('')
  const [showNoExecutionConfirm, setShowNoExecutionConfirm] = useState(false)

  if (!game) return null

  const deadPlayers = game.players.filter((p) => !p.alive)
  const livingPlayers = game.players.filter((p) => p.alive)
  const opening = openingForGame(game.scriptId, game.id)

  function handleConfirm() {
    if (!executedPlayerId) {
      setShowNoExecutionConfirm(true)
      return
    }
    finishDay()
  }

  function finishDay() {
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
        {game.dayNumber === 1 && (
          <section className="bg-accent/10 border border-accent/35 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2">{opening.title}</p>
            <p className="text-sm leading-relaxed text-ink-1">{opening.text}</p>
            <p className="text-xs text-ink-2 mt-3 border-t border-accent/20 pt-3">Conseil MJ : {opening.cue}</p>
          </section>
        )}
        <DayBriefing history={history} />
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
          <Button variant={executedPlayerId ? 'secondary' : 'primary'} className="self-start px-3 py-2 text-sm" onClick={() => setExecutedPlayerId(NO_EXECUTION)}>
            Personne n'a été exécuté
          </Button>
          <PlayerChoiceGrid players={livingPlayers} selectedIds={executedPlayerId ? [executedPlayerId] : []} onSelect={setExecutedPlayerId} />
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
