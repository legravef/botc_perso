import { useState } from 'react'
import { useGameStore } from '@/store'
import { getCharactersForScript } from '@/data'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'

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

  function usedElsewhere(characterId: string, exceptPlayerId: string) {
    return Object.entries(assignments).some(([pid, cid]) => pid !== exceptPlayerId && cid === characterId)
  }

  function setAssignment(playerId: string, characterId: string) {
    setAssignments((current) => ({ ...current, [playerId]: characterId || null }))
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
  const allDistinct = new Set(Object.values(assignments).filter(Boolean)).size === players.length

  function handleConfirm() {
    if (!allAssigned || !allDistinct) return
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
        <Button variant="primary" disabled={!allAssigned || !allDistinct} onClick={handleConfirm}>
          Terminer l'attribution
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <Button variant="secondary" onClick={randomize} className="self-start">
          Attribution aléatoire
        </Button>
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 bg-surface-1 border border-border rounded-lg px-3 py-2"
            >
              <RoleIcon characterId={assignments[player.id]} size={28} />
              <span className="flex-1 font-medium">{player.name}</span>
              <select
                value={assignments[player.id] ?? ''}
                onChange={(e) => setAssignment(player.id, e.target.value)}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-ink-0"
              >
                <option value="">— Choisir —</option>
                {characterIds.map((cid) => {
                  const character = characters.find((c) => c.id === cid)
                  const disabled = usedElsewhere(cid, player.id)
                  return (
                    <option key={cid} value={cid} disabled={disabled}>
                      {character?.nameFr ?? cid}
                      {disabled ? ' (déjà attribué)' : ''}
                    </option>
                  )
                })}
              </select>
            </li>
          ))}
        </ul>
        {!allDistinct && allAssigned && (
          <p className="text-sm text-danger">Chaque personnage ne peut être attribué qu'à un seul joueur.</p>
        )}
      </div>
    </Screen>
  )
}
