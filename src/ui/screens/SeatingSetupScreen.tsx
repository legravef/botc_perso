import { useState } from 'react'
import { useGameStore } from '@/store'
import { LAYOUT_PRESETS, generateLayoutPositions, getEffectivePosition, type LayoutPresetId } from '@/engine'
import { getCharacterById } from '@/data'
import type { Player } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { SeatingLayout } from '../components/SeatingLayout'
import { RoleIcon } from '../components/RoleIcon'

interface LocalPosition {
  x: number
  y: number
}

/**
 * Étape dédiée, entre la préparation et la révélation des rôles : le
 * Conteur regarde la table réelle et ajuste la disposition du grimoire pour
 * qu'elle corresponde (glisser librement ou dispositions rapides), avant de
 * révéler les rôles en se basant sur ce plan.
 *
 * Le déplacement est entièrement local à cet écran (aucun aller-retour avec
 * le store à chaque glisser) : l'ordre logique des voisins n'est calculé et
 * enregistré qu'une seule fois, au clic sur "Valider la disposition". Ça
 * rend le geste fluide et évite tout effet de bord inattendu pendant qu'on
 * essaie encore un arrangement.
 */
export function SeatingSetupScreen() {
  const game = useGameStore((s) => s.game)
  const setPhase = useGameStore((s) => s.setPhase)
  const setAllPlayerPositions = useGameStore((s) => s.setAllPlayerPositions)

  const orderedPlayers = game ? [...game.players].sort((a, b) => a.seat - b.seat) : []

  const [positions, setPositions] = useState<Record<string, LocalPosition>>(() => {
    const initial: Record<string, LocalPosition> = {}
    for (const player of orderedPlayers) {
      const pos = getEffectivePosition(player, orderedPlayers.length)
      initial[player.id] = { x: pos.x, y: pos.y }
    }
    return initial
  })

  if (!game) return null

  const displayPlayers: Player[] = game.players.map((player) => {
    const pos = positions[player.id]
    return pos ? { ...player, mapX: pos.x, mapY: pos.y } : player
  })

  function handleDrop(playerId: string, mapX: number, mapY: number) {
    setPositions((current) => ({ ...current, [playerId]: { x: mapX, y: mapY } }))
  }

  function handlePreset(presetId: LayoutPresetId) {
    const generated = generateLayoutPositions(presetId, orderedPlayers.length)
    const next: Record<string, LocalPosition> = {}
    orderedPlayers.forEach((player, index) => {
      next[player.id] = { x: generated[index]!.x, y: generated[index]!.y }
    })
    setPositions(next)
  }

  function handleValidate() {
    setAllPlayerPositions(
      Object.entries(positions).map(([playerId, pos]) => ({ playerId, mapX: pos.x, mapY: pos.y })),
    )
    setPhase('setup.reveal')
  }

  return (
    <Screen
      title="Disposition des sièges"
      subtitle="Faites correspondre le plan à l'installation réelle autour de la table avant de révéler les rôles."
      onBack={() => setPhase('setup.preparation')}
      footer={
        <Button variant="primary" onClick={handleValidate}>
          Valider la disposition — passer à la révélation
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-xs text-ink-2">Disposition rapide :</span>
          {LAYOUT_PRESETS.map((preset) => (
            <Button key={preset.id} variant="ghost" onClick={() => handlePreset(preset.id)}>
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex justify-center py-6">
          <SeatingLayout
            players={displayPlayers}
            reorderable
            onDropPosition={handleDrop}
            renderSeat={(player) => {
              const character = player.realCharacterId
                ? getCharacterById(game.scriptId, player.realCharacterId)
                : null
              return (
                <div className="w-28 rounded-xl border border-dashed border-accent/60 px-2 py-2 text-center select-none cursor-grab">
                  <RoleIcon characterId={character?.id} nameFr={character?.nameFr} size={36} className="mx-auto mb-1" />
                  <div className="text-sm font-medium truncate">{player.name}</div>
                </div>
              )
            }}
          />
        </div>

        <p className="text-center text-xs text-ink-2">
          Glissez un joueur n'importe où sur la carte, ou utilisez une disposition rapide — rien n'est enregistré
          tant que vous n'avez pas validé, essayez librement.
        </p>
      </div>
    </Screen>
  )
}
