import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { useGameStore } from '@/store'
import { getBaseDistribution } from '@/engine'
import { MAX_PLAYERS, MIN_PLAYERS } from '@/data'
import { createPlayer } from '@/lib/factories'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'

interface NameSlot {
  id: string
  name: string
}

export function PlayersSetupScreen() {
  const game = useGameStore((s) => s.game)
  const setPlayers = useGameStore((s) => s.setPlayers)
  const setPhase = useGameStore((s) => s.setPhase)

  const fixedPlayerCount = game?.scriptId === 'no-greater-joy' ? 6 : null
  const scriptMinimum = game?.scriptId === 'over-the-river' ? 5 : MIN_PLAYERS
  const scriptMaximum = game?.scriptId === 'over-the-river' ? 6 : MAX_PLAYERS
  const [playerCount, setPlayerCount] = useState(() =>
    fixedPlayerCount ?? (game?.scriptId === 'over-the-river'
      ? 6
      : Math.min(Math.max(game?.players.length || 7, MIN_PLAYERS), MAX_PLAYERS)),
  )
  const [slots, setSlots] = useState<NameSlot[]>(() => {
    if (game && game.players.length > 0) {
      return [...game.players].sort((a, b) => a.seat - b.seat).map((p) => ({ id: p.id, name: p.name }))
    }
    return Array.from({ length: playerCount }, () => ({ id: nanoid(), name: '' }))
  })

  useEffect(() => {
    setSlots((current) => {
      if (current.length === playerCount) return current
      if (current.length < playerCount) {
        return [
          ...current,
          ...Array.from({ length: playerCount - current.length }, () => ({ id: nanoid(), name: '' })),
        ]
      }
      return current.slice(0, playerCount)
    })
  }, [playerCount])

  const distribution =
    playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS ? getBaseDistribution(playerCount) : null

  function updateName(id: string, name: string) {
    setSlots((current) => current.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  function move(index: number, direction: -1 | 1) {
    setSlots((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const item = next[index] as NameSlot
      next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  function reverseOrder() {
    setSlots((current) => [...current].reverse())
  }

  function randomizeOrder() {
    setSlots((current) => {
      const next = [...current]
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const a = next[i] as NameSlot
        const b = next[j] as NameSlot
        next[i] = b
        next[j] = a
      }
      return next
    })
  }

  const trimmedNames = slots.map((s) => s.name.trim())
  const hasEmptyName = trimmedNames.some((n) => n.length === 0)
  const hasDuplicateName = new Set(trimmedNames.map((n) => n.toLowerCase())).size !== trimmedNames.length
  const canProceed = !!distribution && !hasEmptyName && !hasDuplicateName

  function handleNext() {
    if (!canProceed) return
    const players = slots.map((s, index) => {
      const existing = game?.players.find((p) => p.id === s.id)
      return existing
        ? { ...existing, name: s.name.trim(), seat: index }
        : createPlayer(s.name.trim(), index, s.id)
    })
    setPlayers(players)
    setPhase('setup.composition')
  }

  return (
    <Screen
      title="Nouvelle partie — Joueurs"
      subtitle="Le Conteur n'est pas compté parmi les joueurs."
      footer={
        <Button variant="primary" disabled={!canProceed} onClick={handleNext}>
          Étape suivante
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <section>
          <label className="block text-sm text-ink-2 mb-2">Nombre de joueurs</label>
          <div className="flex items-center gap-3">
              <Button variant="secondary" disabled={fixedPlayerCount !== null || playerCount <= scriptMinimum} onClick={() => setPlayerCount((n) => Math.max(scriptMinimum, n - 1))}>
              −
            </Button>
            <span className="text-2xl font-semibold w-12 text-center">{playerCount}</span>
              <Button variant="secondary" disabled={fixedPlayerCount !== null || playerCount >= scriptMaximum} onClick={() => setPlayerCount((n) => Math.min(scriptMaximum, n + 1))}>
              +
            </Button>
          </div>
          {distribution && (
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <DistributionTile label="Villageois" value={distribution.townsfolk} />
              <DistributionTile label="Parias" value={distribution.outsider} />
              <DistributionTile label="Sbires" value={distribution.minion} />
              <DistributionTile label="Démon" value={distribution.demon} />
            </div>
          )}
          {fixedPlayerCount !== null && (
            <p className="mt-3 text-sm text-accent">No Greater Joy est un scénario Teensyville conçu spécialement pour 6 joueurs.</p>
          )}
          {game?.scriptId === 'over-the-river' && (
            <p className="mt-3 text-sm text-accent">Over the River est un scénario Teensyville conçu pour 5 ou 6 joueurs.</p>
          )}
          {(['trouble-brewing', 'no-greater-joy', 'over-the-river'].includes(game?.scriptId ?? '')) && playerCount <= 6 && (
            <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
              <p className="font-medium">Format Teensyville</p>
              <p className="mt-1 text-ink-2">
                À 5 ou 6 joueurs, le Démon et le Sbire ne se connaissent pas, et le Démon ne reçoit
                pas les 3 bluffs habituels.
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm text-ink-2">Joueurs autour de la table (dans l'ordre réel)</h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reverseOrder}>
                Inverser le sens
              </Button>
              <Button variant="ghost" onClick={randomizeOrder}>
                Randomiser l'ordre
              </Button>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {slots.map((slot, index) => (
              <li
                key={slot.id}
                className="flex items-center gap-2 bg-surface-1 border border-border rounded-lg px-3 py-2"
              >
                <span className="text-ink-2 text-sm w-6 text-center">{index + 1}</span>
                <input
                  value={slot.name}
                  onChange={(e) => updateName(slot.id, e.target.value)}
                  placeholder={`Joueur ${index + 1}`}
                  className="flex-1 bg-transparent outline-none text-ink-0 placeholder:text-ink-2"
                />
                <Button
                  variant="ghost"
                  className="px-2 py-1"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Déplacer vers le haut"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1"
                  disabled={index === slots.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Déplacer vers le bas"
                >
                  ↓
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-2 mt-3">
            Le premier et le dernier joueur de la liste sont voisins autour du cercle.
          </p>
          {hasEmptyName && <p className="text-sm text-warn mt-2">Tous les joueurs doivent avoir un prénom.</p>}
          {hasDuplicateName && (
            <p className="text-sm text-warn mt-2">Deux joueurs ne peuvent pas avoir le même prénom.</p>
          )}
        </section>
      </div>
    </Screen>
  )
}

function DistributionTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-1 border border-border rounded-lg py-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  )
}
