import { useState } from 'react'
import { useGameStore } from '@/store'
import { getCharactersForScript } from '@/data'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { CharacterPickerOverlay } from '../components/CharacterPickerOverlay'

export function AssignmentScreen() {
  const game = useGameStore((s) => s.game)
  const assignCharacters = useGameStore((s) => s.assignCharacters)
  const setPhase = useGameStore((s) => s.setPhase)

  const players = game ? [...game.players].sort((a, b) => a.seat - b.seat) : []
  const characterIds = game?.composition?.characterIds ?? []
  const characters = game ? getCharactersForScript(game.scriptId) : []

  const [assignments, setAssignments] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.realCharacterId])),
  )
  const [pickingForPlayerId, setPickingForPlayerId] = useState<string | null>(null)

  function setAssignment(playerId: string, characterId: string) {
    setAssignments((current) => {
      const next = { ...current }
      if (characterId) {
        // Un rôle ne peut être détenu que par un seul joueur à la fois : le retirer de son
        // éventuel détenteur précédent avant de l'attribuer ici permet de le réassigner en un
        // seul geste, sans devoir d'abord aller le désélectionner ailleurs.
        for (const [pid, cid] of Object.entries(next)) {
          if (pid !== playerId && cid === characterId) next[pid] = null
        }
      }
      next[playerId] = characterId || null
      return next
    })
  }

  function randomize() {
    const shuffled = [...characterIds]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const a = shuffled[i] as string
      const b = shuffled[j] as string
      shuffled[i] = b
      shuffled[j] = a
    }
    setAssignments(Object.fromEntries(players.map((p, index) => [p.id, shuffled[index] ?? null])))
  }

  const allAssigned = players.length > 0 && players.every((p) => assignments[p.id])

  function handleConfirm() {
    if (!allAssigned) return
    const final: Record<string, string> = {}
    for (const [pid, cid] of Object.entries(assignments)) if (cid) final[pid] = cid
    assignCharacters(final)
    setPhase('setup.preparation')
  }

  return (
    <Screen
      title="Nouvelle partie — Attribution des personnages"
      subtitle="Attribution manuelle ou aléatoire, puis vérification avant de commencer."
      onBack={() => setPhase('setup.composition')}
      footer={
        <Button variant="primary" disabled={!allAssigned} onClick={handleConfirm}>
          Terminer l'attribution
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <Button variant="secondary" onClick={randomize} className="self-start">
          Attribution aléatoire
        </Button>
        <ul className="flex flex-col gap-2">
          {players.map((player) => {
            const character = assignments[player.id] ? characters.find((c) => c.id === assignments[player.id]) : undefined
            return (
              <li
                key={player.id}
                className="flex items-center gap-3 bg-surface-1 border border-border rounded-lg px-3 py-2"
              >
                <RoleIcon characterId={assignments[player.id]} size={28} />
                <span className="flex-1 font-medium">{player.name}</span>
                <Button variant="secondary" className="px-3 py-2 text-sm" onClick={() => setPickingForPlayerId(player.id)}>
                  {character?.nameFr ?? '— Choisir —'}
                </Button>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-ink-2">
          Choisir un rôle déjà attribué à quelqu'un d'autre le lui retire automatiquement pour le donner à ce
          joueur.
        </p>
      </div>
      {pickingForPlayerId && (
        <CharacterPickerOverlay
          title="Attribution des personnages"
          subtitle={`Choisissez le rôle de ${players.find((p) => p.id === pickingForPlayerId)?.name ?? ''}`}
          characters={characterIds.map((cid) => characters.find((c) => c.id === cid)).filter((c): c is NonNullable<typeof c> => Boolean(c))}
          getBadge={(candidate) => {
            const holder = players.find((p) => p.id !== pickingForPlayerId && assignments[p.id] === candidate.id)
            return holder ? `actuellement : ${holder.name}` : undefined
          }}
          onSelect={(characterId) => {
            if (pickingForPlayerId) setAssignment(pickingForPlayerId, characterId)
            setPickingForPlayerId(null)
          }}
          onClose={() => setPickingForPlayerId(null)}
        />
      )}
    </Screen>
  )
}
