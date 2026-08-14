import { useEffect, useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import { LAYOUT_PRESETS, generateLayoutPositions, getEffectivePosition, getLivingNeighbors, type LayoutPresetId } from '@/engine'
import { getReminderVisual } from '@/lib/reminderStyles'
import { getScriptLogo } from '../scriptPresentation'
import type { Player } from '@/types'
import { SeatingLayout } from '../components/SeatingLayout'
import { Button } from '../components/Button'
import { PlayerDetailPanel } from '../components/PlayerDetailPanel'
import { RoleIcon } from '../components/RoleIcon'

function displayReminderLabel(label: string) {
  return label === 'Leurre (Voyante)' ? 'Leurre de la Voyante' : label
}

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
  const history = useGameStore((s) => s.history)
  const restartWithSamePlayers = useGameStore((s) => s.restartWithSamePlayers)
  const setAllPlayerPositions = useGameStore((s) => s.setAllPlayerPositions)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [confirmingRestart, setConfirmingRestart] = useState(false)
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

  const isBadMoonRising = game.scriptId === 'bad-moon-rising'
  const scriptLogo = getScriptLogo(game.scriptId)
  const selectedPlayer = selectedPlayerId ? game.players.find((p) => p.id === selectedPlayerId) : undefined
  function describeUsefulEvent(event: (typeof history)[number]): string | null {
    if (event.type === 'execution.resolved') {
      const executed = event.targetIds?.[0]
      const player = executed ? event.resultingState.players.find((p) => p.id === executed) : undefined
      return player ? `Exécution : ${player.name} est mort.` : 'Aucune exécution aujourd’hui.'
    }
    if (event.type === 'game.ended') return 'Fin de partie confirmée.'
    if (event.type !== 'player.updated') return null

    const playerId = event.targetIds?.[0]
    const before = playerId ? event.previousState.players.find((p) => p.id === playerId) : undefined
    const after = playerId ? event.resultingState.players.find((p) => p.id === playerId) : undefined
    if (!before || !after) return null
    if (before.alive !== after.alive) return after.alive ? `${after.name} est ressuscité.` : `${after.name} est mort.`

    const addedReminders = after.reminders.filter((reminder) => !before.reminders.some((old) => old.id === reminder.id))
    if (addedReminders.length > 0) return `${after.name} : ${addedReminders.map((reminder) => reminder.label).join(', ')}.`

    const addedNotes = after.notes.filter((note) => !before.notes.some((old) => old.id === note.id))
    const powerNote = addedNotes.find((note) => note.category === 'power-used')
    return powerNote ? `${after.name} — ${powerNote.text}` : null
  }

  const recentActivities = [...history]
    .reverse()
    .map((event) => ({ event, description: describeUsefulEvent(event) }))
    .filter((activity): activity is { event: (typeof history)[number]; description: string } => Boolean(activity.description))
    .slice(0, 5)

  const activeEffects = game.players.flatMap((target) =>
    target.reminders.map((reminder) => {
      const source = game.players.find((player) => player.realCharacterId === reminder.sourceCharacterId)
      const visual = getReminderVisual(reminder.sourceCharacterId)
      return { id: reminder.id, target, source, reminder, visual }
    }),
  )
  const bmrStateAlerts: { title: string; detail: string; tone: 'accent' | 'warn' | 'evil' | 'good' }[] = []
  if (isBadMoonRising) {
    const characterPlayer = (characterId: string) => game.players.find((player) => player.realCharacterId === characterId)
    const isImpaired = (player: Player) => player.reminders.some((reminder) => reminder.label.startsWith('Ivre') || reminder.label.startsWith('Empoisonné'))
    const po = characterPlayer('po')
    if (game.poMustKillThree && po?.alive) bmrStateAlerts.push({ title: 'Po chargé', detail: `${po.name} doit choisir 3 victimes cette nuit.`, tone: 'evil' })
    const godfather = characterPlayer('godfather')
    if (game.godfatherKillDue && godfather?.alive) bmrStateAlerts.push({ title: 'Parrain déclenché', detail: `${godfather.name} peut tuer un joueur cette nuit.`, tone: 'evil' })
    const shabalothVictims = game.players.filter((player) => game.shabalothVictimIds?.includes(player.id))
    if (shabalothVictims.length > 0) bmrStateAlerts.push({ title: 'Shabaloth', detail: `Régurgitation possible : ${shabalothVictims.map((player) => player.name).join(', ')}.`, tone: 'accent' })
    if (game.gossipKillDue) bmrStateAlerts.push({ title: 'Pipelette', detail: 'Une déclaration vraie impose une mort cette nuit.', tone: 'warn' })
    const moonchildTarget = game.players.find((player) => player.id === game.moonchildTargetId)
    if (moonchildTarget) bmrStateAlerts.push({ title: 'Moonchild', detail: `${moonchildTarget.name} doit mourir cette nuit s’il ou elle était gentil(le) au choix.`, tone: 'warn' })
    const teaLady = characterPlayer('tea-lady')
    if (teaLady?.alive && !isImpaired(teaLady)) {
      const { left, right } = getLivingNeighbors(game.players, teaLady.id)
      if (left?.alignment === 'good' && right?.alignment === 'good') {
        bmrStateAlerts.push({ title: 'Herboriste', detail: `${left.name} et ${right.name} sont immortels tant qu’ils restent les voisins gentils les plus proches.`, tone: 'good' })
      }
    }
  }

  function handleRestart() {
    if (!confirmingRestart) {
      setConfirmingRestart(true)
      return
    }
    restartWithSamePlayers()
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
    <div className="relative min-h-screen flex flex-col bg-surface-0 text-ink-0 overflow-hidden screen-enter">
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
        src={scriptLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 w-[560px] h-[560px] object-contain opacity-[0.04] -translate-x-1/2 -translate-y-1/2"
      />

      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={scriptLogo} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden="true" />
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
            variant={confirmingRestart ? 'danger' : 'ghost'}
            onClick={handleRestart}
            onBlur={() => setConfirmingRestart(false)}
            title="Crée une nouvelle partie avec les mêmes joueurs aux mêmes places. Les rôles et le déroulement de la partie actuelle restent dans sa sauvegarde."
          >
            {confirmingRestart ? 'Confirmer la nouvelle partie ?' : 'Nouvelle partie, mêmes joueurs'}
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
      <main className={`flex-1 grid grid-cols-1 ${recentActivities.length > 0 ? '2xl:grid-cols-[minmax(0,1fr)_18rem]' : ''} items-center gap-6 py-8 px-4 max-w-[110rem] w-full mx-auto`}>
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
                className={`relative w-28 rounded-xl border px-2 py-2 text-center select-none shadow-[0_8px_22px_rgba(0,0,0,0.22)] ${
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
                  {!player.alive && <span className="text-[10px] rounded-full bg-danger/20 px-1.5 py-0.5 text-danger">✦ Mort</span>}
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
                          title={displayReminderLabel(reminder.label)}
                        >
                          {recognized && `${recognized.icon} `}
                          {displayReminderLabel(reminder.label)}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }}
        />
        {(recentActivities.length > 0 || activeEffects.length > 0 || bmrStateAlerts.length > 0) && <aside className="self-stretch max-w-md 2xl:max-w-none mx-auto w-full rounded-2xl border border-border bg-surface-1/90 backdrop-blur p-4 flex flex-col gap-4 shadow-xl">
          {bmrStateAlerts.length > 0 && (
            <section className="rounded-xl border border-accent/25 bg-accent/5 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-accent">États à suivre — BMR</p>
              <div className="mt-3 flex flex-col gap-2">
                {bmrStateAlerts.map((alert) => (
                  <div key={alert.title} className={`rounded-lg px-3 py-2 text-xs ${
                    alert.tone === 'evil' ? 'bg-evil-bg text-evil' : alert.tone === 'warn' ? 'bg-warn/15 text-warn' : alert.tone === 'good' ? 'bg-good-bg text-good' : 'bg-surface-2 text-ink-1'
                  }`}>
                    <span className="font-semibold">{alert.title} :</span> {alert.detail}
                  </div>
                ))}
              </div>
            </section>
          )}
          {activeEffects.length > 0 && (
            <section className="rounded-xl border border-accent/25 bg-accent/5 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-accent">Effets actifs</p>
              <div className="mt-3 flex flex-col gap-2">
                {activeEffects.slice(0, 5).map(({ id, source, target, reminder, visual }) => (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 rounded-full px-1.5 py-1 ${visual?.className ?? 'bg-warn/20 text-warn'}`}>{visual?.icon ?? '✦'}</span>
                    <span className="min-w-0 truncate font-medium">{source?.name ?? reminder.sourceCharacterId}</span>
                    <span className="text-accent">→</span>
                    <span className="min-w-0 truncate">{target.name}</span>
                    <span className="ml-auto text-ink-2 truncate max-w-20" title={displayReminderLabel(reminder.label)}>{displayReminderLabel(reminder.label)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-accent">Journal du Conteur</p>
            <h2 className="text-lg font-semibold mt-1">Dernières actions</h2>
          </div>
          {recentActivities.length > 0 ? (
            <ol className="relative flex flex-col gap-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {recentActivities.map(({ event, description }, index) => (
                <li key={event.id} className="relative pl-5">
                  <span className={`absolute left-0 top-3 h-3.5 w-3.5 rounded-full border-2 border-surface-1 ${index === 0 ? 'bg-accent event-pulse' : 'bg-ink-2'}`} />
                  <div className="rounded-lg border border-border bg-surface-2/70 px-3 py-2 card-lift">
                    <p className="text-sm font-medium">{description}</p>
                    <p className="text-[11px] text-ink-2">{new Date(event.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="mt-auto rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs text-ink-1">
            <span className="text-accent">Astuce :</span> cliquez sur un jeton pour consulter les rappels, notes et voisins du joueur.
          </div>
        </aside>}
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
