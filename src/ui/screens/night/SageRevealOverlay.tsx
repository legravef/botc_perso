import { useState } from 'react'
import type { Game, Player } from '@/types'
import { Button } from '../../components/Button'
import { PlayerChoiceGrid } from '../../components/PlayerChoiceGrid'
import type { ReactiveRevealRequest } from './ReactiveRoleRevealOverlay'

/**
 * Réveil réactif du Sage (No Greater Joy) : tué par le Démon, il apprend deux joueurs dont l'un
 * est le Démon. Le Conteur compose la paire — l'app exige que le vrai Démon en fasse partie —
 * puis la montre. Sélection et bascule vers l'affichage restent internes au composant.
 */
export function SageRevealOverlay({
  request,
  game,
  activeDemon,
  onAddNote,
  onClose,
}: {
  request: ReactiveRevealRequest
  game: Game
  activeDemon: Player | undefined
  onAddNote: (playerId: string, text: string, category: 'information') => void
  onClose: () => void
}) {
  const [candidateIds, setCandidateIds] = useState<string[]>([])
  const [shown, setShown] = useState(false)

  function toggleCandidate(playerId: string) {
    setCandidateIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= 2) return [current[1] as string, playerId]
      return [...current, playerId]
    })
  }

  const pairIncludesDemon = !!activeDemon && candidateIds.includes(activeDemon.id)

  if (!shown) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-6 px-8">
        <div className="text-center">
          <p className="text-xs text-accent uppercase tracking-[0.18em] mb-3">Réveil réactif</p>
          <h2 className="text-2xl font-semibold">{request.title}</h2>
          <p className="text-ink-2 mt-3">Choisissez exactement deux joueurs, dont le Démon vivant.</p>
        </div>
        <PlayerChoiceGrid
          players={game.players.filter((player) => player.id !== request.actorId)}
          selectedIds={candidateIds}
          onSelect={toggleCandidate}
        />
        {candidateIds.length === 2 && !pairIncludesDemon && (
          <p className="text-sm text-danger">L’un des deux joueurs montrés doit être le Démon.</p>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>Passer ce réveil</Button>
          <Button
            variant="primary"
            disabled={candidateIds.length !== 2 || !pairIncludesDemon}
            onClick={() => {
              const names = candidateIds
                .map((id) => game.players.find((player) => player.id === id)?.name)
                .filter(Boolean)
                .join(' ou ')
              onAddNote(request.actorId, `[NGJ:sage:${game.nightNumber}] Sage : voit ${names}.`, 'information')
              setShown(true)
            }}
          >
            Montrer ces deux joueurs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-ink-2 text-sm">Le Démon est l’un de ces deux joueurs</p>
      <div className="flex flex-wrap justify-center gap-5">
        {candidateIds.map((id) => (
          <div key={id} className="min-w-48 rounded-2xl border border-accent/50 bg-accent/10 px-8 py-7">
            <p className="text-3xl font-semibold">{game.players.find((player) => player.id === id)?.name ?? '?'}</p>
          </div>
        ))}
      </div>
      <Button variant="primary" onClick={onClose}>Information montrée</Button>
    </div>
  )
}
