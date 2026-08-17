import { useState } from 'react'
import { getCharacterById } from '@/data'
import type { Game } from '@/types'
import { Button } from '../../components/Button'
import { RoleIcon } from '../../components/RoleIcon'

export interface ReactiveRevealRequest {
  actorId: string
  title: string
}

/**
 * Réveil réactif du Gardien : il meurt en pleine nuit et apprend aussitôt le rôle réel d'un
 * joueur de son choix. Le Conteur désigne d'abord ce joueur, puis l'écran bascule sur la carte
 * à montrer. L'état de sélection reste interne : le parent ne pilote que l'ouverture
 * (`request`) et la fermeture (`onClose`).
 */
export function ReactiveRoleRevealOverlay({
  request,
  game,
  onAddNote,
  onClose,
}: {
  request: ReactiveRevealRequest
  game: Game
  onAddNote: (playerId: string, text: string, category: 'information') => void
  onClose: () => void
}) {
  const [targetId, setTargetId] = useState('')

  const target = targetId ? game.players.find((player) => player.id === targetId) : undefined
  const targetCharacter = target?.realCharacterId
    ? getCharacterById(game.scriptId, target.realCharacterId)
    : undefined

  if (!target) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <p className="text-xs text-accent uppercase tracking-[0.18em] mb-3">Réveil réactif</p>
          <h2 className="text-2xl font-semibold">{request.title}</h2>
          <p className="text-ink-2 mt-3">Sélectionnez le joueur dont le rôle doit être montré.</p>
        </div>
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {game.players.map((player) => (
            <Button
              key={player.id}
              variant="secondary"
              className="min-h-20 text-xl"
              onClick={() => {
                setTargetId(player.id)
                onAddNote(request.actorId, `Gardien : rôle de ${player.name} révélé.`, 'information')
              }}
            >
              {player.name}
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={onClose}>Passer ce réveil</Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-ink-2 text-sm">Montrez ceci à {request.title.replace('Gardien — ', '')}</p>
      <div className="bg-accent/10 border border-accent/50 rounded-3xl px-12 py-10 flex flex-col items-center gap-4 min-w-72">
        <p className="text-lg text-ink-1">{target.name}</p>
        <RoleIcon characterId={targetCharacter?.id} nameFr={targetCharacter?.nameFr} size={92} />
        <p className="text-3xl font-semibold">{targetCharacter?.nameFr ?? '?'}</p>
      </div>
      <Button variant="primary" onClick={onClose}>J’ai montré ce rôle</Button>
    </div>
  )
}
