import { useEffect, useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import { LAYOUT_PRESETS, generateLayoutPositions, getEffectivePosition, type LayoutPresetId } from '@/engine'
import { renderGrimoireToDataUrl } from '@/lib/exportGrimoireImage'
import { exportCompositionToScriptJson } from '@/lib/scriptExport'
import { getReminderVisual } from '@/lib/reminderStyles'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import type { Player } from '@/types'
import { SeatingLayout } from '../components/SeatingLayout'
import { Button } from '../components/Button'
import { PlayerDetailPanel } from '../components/PlayerDetailPanel'
import { RoleIcon } from '../components/RoleIcon'

const GRIMOIRE_STARS = [
  { top: 6, left: 5 },
  { top: 12, left: 18 },
  { top: 5, left: 30 },
  { top: 16, left: 46 },
  { top: 8, left: 62 },
  { top: 14, left: 76 },
  { top: 6, left: 90 },
  { top: 22, left: 10 },
  { top: 24, left: 55 },
  { top: 20, left: 96 },
]

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface LocalPosition {
  x: number
  y: number
}

interface GrimoireScreenProps {
  onGoHome: () => void
  /** Si fourni, le grimoire est affiché en superposition (accès rapide depuis la nuit/le jour) et propose un retour au flux guidé plutôt que de fermer la partie. */
  onBack?: () => void
}

export function GrimoireScreen({ onGoHome, onBack }: GrimoireScreenProps) {
  const game = useGameStore((s) => s.game)
  const undo = useGameStore((s) => s.undo)
  const canUndo = useGameStore((s) => s.canUndo)
  const historyLength = useGameStore((s) => s.history.length)
  const clearHistory = useGameStore((s) => s.clearHistory)
  const exportCurrentGame = useGameStore((s) => s.exportCurrentGame)
  const setAllPlayerPositions = useGameStore((s) => s.setAllPlayerPositions)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderPositions, setReorderPositions] = useState<Record<string, LocalPosition>>({})

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedPlayerId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!game) return null

  const selectedPlayer = selectedPlayerId ? game.players.find((p) => p.id === selectedPlayerId) : undefined

  function handleExport() {
    const json = exportCurrentGame()
    if (!json || !game) return
    downloadFile(json, `partie-botc-${game.id.slice(0, 8)}.json`, 'application/json')
  }

  function handleExportImage() {
    if (!game) return
    const dataUrl = renderGrimoireToDataUrl(game)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `grimoire-botc-${game.id.slice(0, 8)}.png`
    a.click()
  }

  function handleExportScript() {
    if (!game) return
    const characterIds = game.composition?.characterIds ?? []
    const script = exportCompositionToScriptJson(characterIds, game.scriptId)
    downloadFile(JSON.stringify(script, null, 2), `script-botc-${game.id.slice(0, 8)}.json`, 'application/json')
  }

  function handleClearHistory() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      return
    }
    clearHistory()
    setConfirmingClear(false)
  }

  function enterReorderMode() {
    if (!game) return
    const ordered = [...game.players].sort((a, b) => a.seat - b.seat)
    const initial: Record<string, LocalPosition> = {}
    for (const player of ordered) {
      const pos = getEffectivePosition(player, ordered.length)
      initial[player.id] = { x: pos.x, y: pos.y }
    }
    setReorderPositions(initial)
    setReorderMode(true)
    setSelectedPlayerId(null)
  }

  function confirmReorder() {
    setAllPlayerPositions(
      Object.entries(reorderPositions).map(([playerId, pos]) => ({ playerId, mapX: pos.x, mapY: pos.y })),
    )
    setReorderMode(false)
  }

  function handleDrop(playerId: string, mapX: number, mapY: number) {
    setReorderPositions((current) => ({ ...current, [playerId]: { x: mapX, y: mapY } }))
  }

  function handlePreset(presetId: LayoutPresetId) {
    if (!game) return
    const ordered = [...game.players].sort((a, b) => a.seat - b.seat)
    const generated = generateLayoutPositions(presetId, ordered.length)
    const next: Record<string, LocalPosition> = {}
    ordered.forEach((player, index) => {
      next[player.id] = { x: generated[index]!.x, y: generated[index]!.y }
    })
    setReorderPositions(next)
  }

  const displayPlayers: Player[] = reorderMode
    ? game.players.map((player) => {
        const pos = reorderPositions[player.id]
        return pos ? { ...player, mapX: pos.x, mapY: pos.y } : player
      })
    : game.players

  return (
    <div className="relative min-h-screen flex flex-col bg-surface-0 text-ink-0 overflow-hidden">
      {/* Ambiance de fond : légère brume violette + étoiles + filigrane du logo — purement
          décoratif (pointer-events-none), pour que le grimoire ne soit plus un simple écran
          noir avec des cartes dessus. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 15%, rgba(177,138,255,0.10), transparent 65%)',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {GRIMOIRE_STARS.map((star, i) => (
          <span
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-white/50 motion-safe:animate-[twinkle_3.4s_ease-in-out_infinite]"
            style={{ top: `${star.top}%`, left: `${star.left}%`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>
      <img
        src={logoTroubleBrewing}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 w-[560px] h-[560px] object-contain opacity-[0.04] -translate-x-1/2 -translate-y-1/2"
      />

      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={logoTroubleBrewing} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold">Grimoire du Conteur</h1>
            <p className="text-xs text-ink-2">
              {game.players.length} joueurs — {game.composition?.characterIds.length ?? 0} personnages en jeu
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              ← Retour
            </Button>
          )}
          <Button variant="ghost" disabled={!canUndo} onClick={undo}>
            Annuler
          </Button>
          <Button
            variant={confirmingClear ? 'danger' : 'ghost'}
            disabled={historyLength === 0}
            onClick={handleClearHistory}
            onBlur={() => setConfirmingClear(false)}
            title="Vide l'historique : vous ne pourrez plus annuler les actions passées. L'état actuel de la partie n'est pas modifié."
          >
            {confirmingClear ? 'Confirmer le vidage ?' : `Vider l'historique (${historyLength})`}
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            Exporter (JSON)
          </Button>
          <Button variant="ghost" onClick={handleExportImage}>
            Exporter (image)
          </Button>
          <Button
            variant="ghost"
            onClick={handleExportScript}
            title="Format JSON compatible avec les autres outils communautaires (Script Tool, townsquare...)"
          >
            Exporter le script
          </Button>
          <Button variant="ghost" onClick={onGoHome}>
            Accueil
          </Button>
        </div>
      </header>
      <div className="flex flex-col items-center gap-3 px-6 pt-4">
        <Button variant={reorderMode ? 'primary' : 'secondary'} onClick={reorderMode ? confirmReorder : enterReorderMode}>
          {reorderMode ? 'Valider la disposition' : 'Réorganiser les sièges'}
        </Button>
        {reorderMode && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-ink-2">Disposition rapide :</span>
            {LAYOUT_PRESETS.map((preset) => (
              <Button key={preset.id} variant="ghost" onClick={() => handlePreset(preset.id)}>
                {preset.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <SeatingLayout
          players={displayPlayers}
          reorderable={reorderMode}
          onDropPosition={handleDrop}
          renderSeat={(player, isDragging) => {
            const character = player.realCharacterId
              ? getCharacterById(game.scriptId, player.realCharacterId)
              : null
            const perceivedCharacter = player.perceivedCharacterId
              ? getCharacterById(game.scriptId, player.perceivedCharacterId)
              : null
            const teamClass =
              character?.team === 'evil' ? 'border-evil bg-evil-bg' : character ? 'border-good bg-good-bg' : ''
            return (
              <div
                onClick={() => !reorderMode && setSelectedPlayerId(player.id)}
                className={`relative w-28 rounded-xl border px-2 py-2 text-center select-none ${
                  reorderMode ? '' : 'transition hover:brightness-125 cursor-pointer'
                } ${
                  isDragging
                    ? 'border-accent ring-2 ring-accent bg-surface-2 shadow-xl'
                    : reorderMode
                      ? 'border-dashed border-accent/60'
                      : character
                        ? teamClass
                        : 'border-border bg-surface-1'
                }`}
              >
                {reorderMode && (
                  <span className="absolute -top-2 -right-2 text-xs bg-surface-3 rounded-full w-5 h-5 flex items-center justify-center">
                    ✥
                  </span>
                )}
                <RoleIcon characterId={character?.id} nameFr={character?.nameFr} size={36} className="mx-auto mb-1" />
                <div className="text-sm font-medium truncate">{player.name}</div>
                <div className="text-xs text-ink-2 truncate">{character?.nameFr ?? '—'}</div>
                {perceivedCharacter && perceivedCharacter.id !== character?.id && (
                  <div className="text-[10px] text-warn truncate" title="Personnage cru par le joueur (pouvoir inactif)">
                    croit être : {perceivedCharacter.nameFr}
                  </div>
                )}
                <div className="flex items-center justify-center gap-1 mt-1">
                  {!player.alive && <span className="text-[10px] text-danger">Mort</span>}
                  {!player.alive && player.ghostVoteAvailable && (
                    <span className="text-[10px] text-accent">👻</span>
                  )}
                </div>
                {player.reminders.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {player.reminders.map((reminder) => {
                      const recognized = getReminderVisual(reminder.sourceCharacterId)
                      return (
                        <span
                          key={reminder.id}
                          className={`text-[9px] leading-none rounded px-1 py-0.5 truncate max-w-full ${
                            recognized ? recognized.className : 'bg-warn/20 text-warn'
                          }`}
                          title={reminder.label}
                        >
                          {recognized && `${recognized.icon} `}
                          {reminder.label}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }}
        />
      </main>
      <p className="text-center text-xs text-ink-2 pb-4">
        {reorderMode
          ? "Glissez un joueur n'importe où sur la carte, ou utilisez une disposition rapide — rien n'est enregistré tant que vous n'avez pas cliqué sur \"Valider la disposition\"."
          : "Ce grimoire est privé — ne le montrez qu'à vous-même. Cliquez sur un joueur pour agir sur lui."}
      </p>

      {selectedPlayer && (
        <PlayerDetailPanel game={game} player={selectedPlayer} onClose={() => setSelectedPlayerId(null)} />
      )}
    </div>
  )
}
