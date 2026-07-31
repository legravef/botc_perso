import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoBadMoonRising from '../../../bad_moon/Logo BDM.png'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'

export function GameEndScreen({ onGoHome }: { onGoHome: () => void }) {
  const game = useGameStore((s) => s.game)
  const history = useGameStore((s) => s.history)
  const restartWithSamePlayers = useGameStore((s) => s.restartWithSamePlayers)

  if (!game || !game.end) return null

  const isGood = game.end.winner === 'good'
  const scriptLogo = game.scriptId === 'bad-moon-rising' ? logoBadMoonRising : logoTroubleBrewing
  const players = [...game.players].sort((a, b) => a.seat - b.seat)
  const survivors = game.players.filter((player) => player.alive).length
  const deaths = game.players.length - survivors
  const powersUsed = history.filter((event) => event.type === 'player.updated').length
  const storyBeats = [...history]
    .reverse()
    .map((event) => {
      if (event.type === 'execution.resolved') {
        const target = event.targetIds?.[0]
        const player = target ? event.resultingState.players.find((candidate) => candidate.id === target) : undefined
        return player ? `Exécution de ${player.name}` : 'Aucune exécution'
      }
      if (event.type !== 'player.updated') return null
      const target = event.targetIds?.[0]
      const before = target ? event.previousState.players.find((candidate) => candidate.id === target) : undefined
      const after = target ? event.resultingState.players.find((candidate) => candidate.id === target) : undefined
      if (!before || !after) return null
      if (before.alive !== after.alive) return after.alive ? `${after.name} revient à la vie` : `${after.name} meurt`
      const note = after.notes.find((candidate) => !before.notes.some((old) => old.id === candidate.id) && candidate.category === 'power-used')
      return note ? note.text : null
    })
    .filter((beat): beat is string => Boolean(beat))
    .slice(0, 6)

  return (
    <div className="relative min-h-screen flex flex-col items-center bg-surface-0 text-ink-0 overflow-hidden px-6 py-10 gap-8 screen-enter">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isGood
            ? 'radial-gradient(ellipse 65% 50% at 50% 10%, rgba(216,184,102,0.16), transparent 65%)'
            : 'radial-gradient(ellipse 65% 50% at 50% 10%, rgba(224,71,63,0.16), transparent 65%)',
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-4 text-center pt-6">
        <img src={scriptLogo} alt="" className="w-20 h-20 object-contain opacity-90" aria-hidden="true" />
        <p className="text-xs text-ink-2 uppercase tracking-[0.2em]">Partie terminée</p>
        <h1
          className="text-4xl font-semibold tracking-wide"
          style={{
            backgroundImage: isGood ? 'linear-gradient(180deg, #f3e3ad, #d8b866)' : 'linear-gradient(180deg, #f5a3a0, #e0473f)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {isGood ? 'Le Bien gagne' : 'Le Mal gagne'}
        </h1>
        <p className="text-ink-1 max-w-md">{game.end.reason}</p>
      </div>

      <div className="relative w-full max-w-2xl bg-surface-1 border border-border rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-semibold">{game.dayNumber}</p><p className="text-xs text-ink-2">jour(s)</p></div>
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-semibold">{survivors}/{game.players.length}</p><p className="text-xs text-ink-2">survivants</p></div>
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-semibold">{powersUsed}</p><p className="text-xs text-ink-2">actions</p></div>
        </div>
        {deaths > 0 && <p className="text-xs text-ink-2 text-center mb-4">{deaths} mort{deaths > 1 ? 's' : ''} au terme de la partie.</p>}
        <h2 className="text-sm text-ink-2 mb-4">Récapitulatif des rôles</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {players.map((p) => {
            const character = p.realCharacterId ? getCharacterById(game.scriptId, p.realCharacterId) : null
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  !p.alive ? 'border-border bg-surface-2/60 opacity-70' : 'border-border bg-surface-2'
                }`}
              >
                <RoleIcon characterId={character?.id} nameFr={character?.nameFr} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.name} {!p.alive && <span className="text-xs text-danger">(mort)</span>}
                  </p>
                  <p className="text-xs text-ink-2 truncate">{character?.nameFr ?? '—'}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {storyBeats.length > 0 && (
        <section className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface-1/80 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-accent">Chronique de Ravenswood Bluff</p>
          <h2 className="text-lg font-semibold mt-1 mb-4">Les moments marquants</h2>
          <ol className="relative flex flex-col gap-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {storyBeats.map((beat, index) => (
              <li key={`${beat}-${index}`} className="relative pl-6 text-sm">
                <span className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-surface-1 ${index === 0 ? 'bg-accent' : 'bg-ink-2'}`} />
                {beat}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="relative flex gap-3">
        <Button variant="ghost" onClick={onGoHome}>
          Retour à l'accueil
        </Button>
        <Button
          variant="primary"
          onClick={restartWithSamePlayers}
          title="Reprend les mêmes joueurs, aux mêmes places sur le grimoire — seule la composition est à refaire."
        >
          Rejouer avec les mêmes joueurs
        </Button>
      </div>
    </div>
  )
}
