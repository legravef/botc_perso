import { TROUBLE_BREWING_CHARACTERS } from '@/data'
import type { CharacterCategory } from '@/types'
import { Screen } from '../components/Screen'
import { RoleIcon } from '../components/RoleIcon'

const CATEGORY_ORDER: CharacterCategory[] = ['townsfolk', 'outsider', 'minion', 'demon']
const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  townsfolk: 'Villageois',
  outsider: 'Parias',
  minion: 'Sbires',
  demon: 'Démon',
}

export function CharacterReferenceScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen title="Personnages — Trouble Brewing" onBack={onBack}>
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        {CATEGORY_ORDER.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category]}</h2>
            <div className="flex flex-col gap-3">
              {TROUBLE_BREWING_CHARACTERS.filter((c) => c.category === category).map((character) => (
                <div key={character.id} className="bg-surface-1 border border-border rounded-lg p-4 flex gap-3">
                  <RoleIcon characterId={character.id} nameFr={character.nameFr} size={44} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium">{character.nameFr}</h3>
                      <span className="text-xs text-ink-2 shrink-0">{character.nameEn}</span>
                    </div>
                    <p className="text-sm text-ink-1 mt-1">{character.shortDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Screen>
  )
}
