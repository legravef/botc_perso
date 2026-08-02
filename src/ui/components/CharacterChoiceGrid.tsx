import type { Character } from '@/types'
import { RoleIcon } from './RoleIcon'

interface CharacterChoiceGridProps {
  characters: Character[]
  selectedIds: string[]
  onSelect: (characterId: string) => void
  disabled?: boolean
  getBadge?: (character: Character) => string | undefined
}

/** Équivalent de PlayerChoiceGrid pour choisir un personnage plutôt qu'un joueur — icône +
 * nom, sélection tactile, plutôt qu'un <select> natif. */
export function CharacterChoiceGrid({ characters, selectedIds, onSelect, disabled = false, getBadge }: CharacterChoiceGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {characters.map((character) => {
        const selected = selectedIds.includes(character.id)
        const badge = getBadge?.(character)
        return (
          <button
            key={character.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onSelect(character.id)}
            className={`min-h-14 rounded-xl border px-3 py-2 flex items-center gap-2 text-left transition active:scale-[0.98] disabled:opacity-45 ${
              selected ? 'border-accent bg-accent/20 text-ink-0 ring-1 ring-accent' : 'border-border bg-surface-1 text-ink-1 hover:border-accent/60 hover:bg-surface-3'
            }`}
          >
            <RoleIcon characterId={character.id} nameFr={character.nameFr} size={32} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{character.nameFr}</span>
              {badge && <span className="block text-[10px] text-ink-2 truncate">{badge}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
