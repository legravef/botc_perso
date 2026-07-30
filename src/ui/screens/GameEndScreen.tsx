import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'

export function GameEndScreen({ onGoHome }: { onGoHome: () => void }) {
  const game = useGameStore((s) => s.game)

  if (!game || !game.end) return null

  const isGood = game.end.winner === 'good'
  const players = [...game.players].sort((a, b) => a.seat - b.seat)

  return (
    <div className="relative min-h-screen flex flex-col items-center bg-surface-0 text-ink-0 overflow-hidden px-6 py-10 gap-8">
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
        <img src={logoTroubleBrewing} alt="" className="w-20 h-20 object-contain opacity-90" aria-hidden="true" />
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

      <Button variant="primary" onClick={onGoHome} className="relative">
        Retour à l'accueil
      </Button>
    </div>
  )
}
