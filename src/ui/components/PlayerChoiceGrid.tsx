import type { Player } from '@/types'

interface PlayerChoiceGridProps {
  players: Player[]
  selectedIds: string[]
  onSelect: (playerId: string) => void
  disabled?: boolean
  getLabel?: (player: Player) => string
}

export function PlayerChoiceGrid({ players, selectedIds, onSelect, disabled = false, getLabel }: PlayerChoiceGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {players.map((player) => {
        const selected = selectedIds.includes(player.id)
        return (
          <button
            key={player.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onSelect(player.id)}
            className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-45 ${
              selected ? 'border-accent bg-accent/20 text-ink-0 ring-1 ring-accent' : 'border-border bg-surface-1 text-ink-1 hover:border-accent/60 hover:bg-surface-3'
            }`}
          >
            {getLabel?.(player) ?? player.name}
          </button>
        )
      })}
    </div>
  )
}
