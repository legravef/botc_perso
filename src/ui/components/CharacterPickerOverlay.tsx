import type { Character } from '@/types'
import { Button } from './Button'
import { RoleIcon } from './RoleIcon'

interface CharacterPickerOverlayProps {
  title: string
  subtitle?: string
  characters: Character[]
  onSelect: (characterId: string) => void
  onClose: () => void
  getBadge?: (character: Character) => string | undefined
}

/** Sélecteur de personnage plein écran, à grandes cartes tactiles — utilisé partout où le
 * Conteur doit choisir un rôle sur une tablette posée à table (Courtisane, Attribution...). */
export function CharacterPickerOverlay({ title, subtitle, characters, onSelect, onClose, getBadge }: CharacterPickerOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-surface-0 text-ink-0 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="min-h-full max-w-4xl mx-auto px-6 py-10 flex flex-col">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{title}</p>
          {subtitle && <p className="text-ink-2 mt-3">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => onSelect(character.id)}
              className="min-h-36 rounded-2xl border border-border bg-surface-1 px-3 py-4 flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-accent/10 active:scale-[0.98] transition"
            >
              <RoleIcon characterId={character.id} nameFr={character.nameFr} size={56} />
              <span className="text-base font-semibold text-center">{character.nameFr}</span>
              {getBadge?.(character) && <span className="text-[11px] text-ink-2 text-center">{getBadge(character)}</span>}
            </button>
          ))}
        </div>
        <Button variant="ghost" className="self-center mt-8" onClick={onClose}>
          Retour
        </Button>
      </div>
    </div>
  )
}
