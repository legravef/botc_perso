import { useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById, getCharactersForScript } from '@/data'
import { getLivingNeighbors } from '@/engine'
import { getReminderVisual } from '@/lib/reminderStyles'
import type { Game, Player, PlayerNote } from '@/types'
import { Button } from './Button'
import { RoleIcon } from './RoleIcon'

const NOTE_CATEGORIES: { value: NonNullable<PlayerNote['category']>; label: string }[] = [
  { value: 'bluff', label: 'Bluff revendiqué' },
  { value: 'information', label: 'Information donnée' },
  { value: 'power-used', label: 'Pouvoir utilisé' },
  { value: 'suspected', label: 'Suspecté' },
  { value: 'confirmed', label: 'Confirmé publiquement' },
  { value: 'watch', label: 'À surveiller' },
]

interface PlayerDetailPanelProps {
  game: Game
  player: Player
  onClose: () => void
}

export function PlayerDetailPanel({ game, player, onClose }: PlayerDetailPanelProps) {
  const killPlayer = useGameStore((s) => s.killPlayer)
  const revivePlayer = useGameStore((s) => s.revivePlayer)
  const toggleGhostVote = useGameStore((s) => s.toggleGhostVote)
  const setPlayerCharacter = useGameStore((s) => s.setPlayerCharacter)
  const addReminder = useGameStore((s) => s.addReminder)
  const removeReminder = useGameStore((s) => s.removeReminder)
  const addNote = useGameStore((s) => s.addNote)
  const removeNote = useGameStore((s) => s.removeNote)

  const [reminderText, setReminderText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState<PlayerNote['category']>(undefined)

  const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : null
  const perceivedCharacter = player.perceivedCharacterId
    ? getCharacterById(game.scriptId, player.perceivedCharacterId)
    : null
  const characters = getCharactersForScript(game.scriptId)
  const availableCharacterIds = game.composition?.characterIds ?? []
  const { left, right } = getLivingNeighbors(game.players, player.id)

  function handleAddReminder() {
    const label = reminderText.trim()
    if (!label) return
    addReminder(player.id, label, player.realCharacterId ?? 'custom')
    setReminderText('')
  }

  function handleAddNote() {
    const text = noteText.trim()
    if (!text) return
    addNote(player.id, text, noteCategory)
    setNoteText('')
    setNoteCategory(undefined)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={`Détails de ${player.name}`}>
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Fermer le panneau"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md h-full bg-surface-1 border-l border-border overflow-y-auto flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <RoleIcon characterId={character?.id} nameFr={character?.nameFr} size={40} />
            <div>
              <h2 className="text-lg font-semibold">{player.name}</h2>
              <p className="text-xs text-ink-2">Siège {player.seat + 1}</p>
            </div>
          </div>
          <Button variant="ghost" className="px-3 py-2" onClick={onClose}>
            Fermer
          </Button>
        </header>

        <div className="flex-1 flex flex-col gap-6 px-5 py-5">
          <section>
            <label className="block text-xs text-ink-2 mb-1">Personnage réel</label>
            <select
              value={player.realCharacterId ?? ''}
              onChange={(e) => e.target.value && setPlayerCharacter(player.id, e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-2 py-2 text-ink-0"
            >
              <option value="">— Aucun —</option>
              {availableCharacterIds.map((id) => {
                const c = characters.find((ch) => ch.id === id)
                return (
                  <option key={id} value={id}>
                    {c?.nameFr ?? id}
                  </option>
                )
              })}
            </select>
            {character && <p className="text-sm text-ink-1 mt-2">{character.fullDescription}</p>}
            {perceivedCharacter && perceivedCharacter.id !== character?.id && (
              <div className="mt-3 bg-warn/10 border border-warn/40 rounded-lg px-3 py-2">
                <p className="text-xs text-warn font-medium">
                  Personnage cru par le joueur : {perceivedCharacter.nameFr} — pouvoir inactif
                </p>
                <p className="text-xs text-ink-2 mt-1">
                  Le joueur pense être {perceivedCharacter.nameFr} et ne sait pas qu'il est réellement{' '}
                  {character?.nameFr}. Ne révélez jamais son vrai rôle.
                </p>
              </div>
            )}
          </section>

          <section className="flex gap-2">
            {player.alive ? (
              <Button variant="danger" className="flex-1" onClick={() => killPlayer(player.id)}>
                Déclarer mort
              </Button>
            ) : (
              <Button variant="secondary" className="flex-1" onClick={() => revivePlayer(player.id)}>
                Ressusciter
              </Button>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-2">Vote fantôme</label>
              <span className={`text-sm ${player.ghostVoteAvailable ? 'text-success' : 'text-ink-2'}`}>
                {player.ghostVoteAvailable ? 'Disponible' : 'Utilisé'}
              </span>
            </div>
            <Button variant="ghost" className="w-full mt-2" onClick={() => toggleGhostVote(player.id)}>
              {player.ghostVoteAvailable ? 'Marquer comme utilisé' : 'Restaurer le vote'}
            </Button>
          </section>

          <section>
            <h3 className="text-xs text-ink-2 mb-2">Voisins vivants</h3>
            <div className="flex justify-between text-sm bg-surface-2 border border-border rounded-lg px-3 py-2">
              <span>← {left?.name ?? '—'}</span>
              <span>{right?.name ?? '—'} →</span>
            </div>
          </section>

          <section>
            <h3 className="text-xs text-ink-2 mb-2">Rappels</h3>
            <div className="flex flex-col gap-2 mb-2">
              {player.reminders.map((reminder) => {
                const recognized = getReminderVisual(reminder.sourceCharacterId)
                return (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between rounded px-3 py-2 text-sm border ${
                      recognized ? `${recognized.className} border-transparent` : 'bg-surface-2 border-border'
                    }`}
                  >
                    <span>
                      {recognized && `${recognized.icon} `}
                      {reminder.label}
                    </span>
                    <button
                      className="text-xs opacity-80 hover:underline hover:opacity-100"
                      onClick={() => removeReminder(player.id, reminder.id)}
                    >
                      Retirer
                    </button>
                  </div>
                )
              })}
              {player.reminders.length === 0 && <p className="text-xs text-ink-2">Aucun rappel actif.</p>}
            </div>
            {character && character.reminders.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {character.reminders.map((label) => (
                  <button
                    key={label}
                    className="text-xs bg-surface-3 text-ink-1 rounded px-2 py-1 hover:bg-accent hover:text-surface-0"
                    onClick={() => addReminder(player.id, label, player.realCharacterId ?? 'custom')}
                  >
                    + {label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="Rappel libre…"
                className="flex-1 bg-surface-2 border border-border rounded px-2 py-2 text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddReminder()}
              />
              <Button variant="secondary" onClick={handleAddReminder}>
                Ajouter
              </Button>
            </div>
          </section>

          <section>
            <h3 className="text-xs text-ink-2 mb-2">Notes du Conteur</h3>
            <div className="flex flex-col gap-2 mb-2">
              {player.notes.map((note) => (
                <div key={note.id} className="bg-surface-2 border border-border rounded px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{note.text}</span>
                    <button
                      className="text-xs text-danger hover:underline shrink-0"
                      onClick={() => removeNote(player.id, note.id)}
                    >
                      Retirer
                    </button>
                  </div>
                  {note.category && (
                    <span className="text-[10px] text-accent uppercase tracking-wide">
                      {NOTE_CATEGORIES.find((c) => c.value === note.category)?.label ?? note.category}
                    </span>
                  )}
                </div>
              ))}
              {player.notes.length === 0 && <p className="text-xs text-ink-2">Aucune note.</p>}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {NOTE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  className={`text-xs rounded px-2 py-1 ${
                    noteCategory === c.value ? 'bg-accent text-surface-0' : 'bg-surface-3 text-ink-1'
                  }`}
                  onClick={() => setNoteCategory(noteCategory === c.value ? undefined : c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Écrire une note…"
                className="flex-1 bg-surface-2 border border-border rounded px-2 py-2 text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button variant="secondary" onClick={handleAddNote}>
                Ajouter
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
