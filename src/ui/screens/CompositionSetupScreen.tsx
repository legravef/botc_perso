import { useMemo, useState } from 'react'
import { useGameStore } from '@/store'
import { getCharactersForScript } from '@/data'
import { generateRandomComposition, generateSuggestedComposition, validateComposition } from '@/engine'
import type { Character, CharacterCategory, Composition, StorytellerLevel } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'

const CATEGORY_ORDER: CharacterCategory[] = ['townsfolk', 'outsider', 'minion', 'demon']
const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  townsfolk: 'Villageois',
  outsider: 'Parias',
  minion: 'Sbires',
  demon: 'Démon',
}

const LEVEL_OPTIONS: { value: StorytellerLevel; label: string }[] = [
  { value: 'beginner', label: 'Débutants' },
  { value: 'intermediate', label: 'Intermédiaires' },
  { value: 'experienced', label: 'Expérimentés' },
]

const LEVEL_CAPTIONS: Record<StorytellerLevel, string> = {
  beginner:
    "Reproduit la composition \"TPI TB1\" recommandée par The Pandemonium Institute pour toute première partie : Diablotin, Confidente (filet de sécurité), Reclus, Empathique, Voyante, Croque-mort et Moine forment le cœur — des pouvoirs actifs chaque nuit pour garder tout le monde impliqué. Mercenaire et Saint sont exclus (fin de partie trop abrupte pour découvrir le jeu).",
  intermediate: 'Léger biais vers les rôles informatifs, sans exclusion : tous les personnages restent possibles.',
  experienced: 'Tirage totalement libre parmi les 22 personnages, sans aucun biais.',
}

export function CompositionSetupScreen() {
  const game = useGameStore((s) => s.game)
  const setComposition = useGameStore((s) => s.setComposition)
  const setStorytellerLevel = useGameStore((s) => s.setStorytellerLevel)
  const setGodfatherOutsiderDelta = useGameStore((s) => s.setGodfatherOutsiderDelta)
  const setPhase = useGameStore((s) => s.setPhase)

  const playerCount = game?.players.length ?? 0
  const scriptId = game?.scriptId ?? 'trouble-brewing'
  const level = game?.storytellerLevel ?? 'beginner'

  const [selected, setSelected] = useState<Set<string>>(() => new Set(game?.composition?.characterIds ?? []))
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [randomError, setRandomError] = useState<string | null>(null)
  const [godfatherDelta, setGodfatherDelta] = useState<-1 | 0 | 1>(game?.godfatherOutsiderDelta ?? 0)

  const composition = useMemo(
    () => validateComposition([...selected], playerCount, scriptId, godfatherDelta),
    [selected, playerCount, scriptId, godfatherDelta],
  )

  function toggleCharacter(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
        setLocked((l) => {
          const nl = new Set(l)
          nl.delete(id)
          return nl
        })
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleLock(id: string) {
    setLocked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRandomDraw() {
    try {
      const lockedIds = [...selected].filter((id) => locked.has(id))
      const result = generateRandomComposition({ playerCount, scriptId, lockedCharacterIds: lockedIds })
      setSelected(new Set(result.characterIds))
      setRandomError(null)
    } catch (err) {
      setRandomError(err instanceof Error ? err.message : 'Tirage impossible.')
    }
  }

  function handleSuggestedDraw() {
    try {
      const lockedIds = [...selected].filter((id) => locked.has(id))
      const result = generateSuggestedComposition({ playerCount, scriptId, level, lockedCharacterIds: lockedIds })
      setSelected(new Set(result.characterIds))
      setRandomError(null)
    } catch (err) {
      setRandomError(err instanceof Error ? err.message : 'Tirage impossible.')
    }
  }

  function handleNext() {
    if (!composition.isValid) return
    setGodfatherOutsiderDelta(godfatherDelta)
    setComposition(composition)
    setPhase('setup.assignment')
  }

  return (
    <Screen
      title="Nouvelle partie — Composition"
      subtitle={`${playerCount} joueurs — ${scriptId === 'bad-moon-rising' ? 'Bad Moon Rising' : 'Trouble Brewing'}`}
      onBack={() => setPhase('setup.players')}
      footer={
        <Button variant="primary" disabled={!composition.isValid} onClick={handleNext}>
          Étape suivante
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-2">Niveau du groupe :</span>
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStorytellerLevel(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  level === opt.value
                    ? 'border-accent bg-surface-2 text-ink-0'
                    : 'border-border bg-surface-1 text-ink-2'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-2 max-w-2xl">{LEVEL_CAPTIONS[level]}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={handleSuggestedDraw}>
              Composition conseillée ({LEVEL_OPTIONS.find((o) => o.value === level)?.label.toLowerCase()})
              {locked.size > 0 ? ` — ${locked.size} verrouillé(s)` : ''}
            </Button>
            <Button variant="secondary" onClick={handleRandomDraw}>
              Tirer une composition aléatoire{locked.size > 0 ? ` (${locked.size} verrouillé(s))` : ''}
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Tout désélectionner
            </Button>
          </div>
        </section>
        {randomError && <p className="text-sm text-danger">{randomError}</p>}

        <CompositionSummary composition={composition} />

        {scriptId === 'bad-moon-rising' && selected.has('godfather') && (
          <section className="bg-warn/10 border border-warn/40 rounded-xl p-4">
            <p className="text-sm font-medium">Parrain — variation de composition</p>
            <p className="text-xs text-ink-2 mt-1">Choisissez le +1 ou -1 Paria imposé par le Parrain avant d'attribuer les rôles.</p>
            <div className="flex gap-2 mt-3">
              <Button variant={godfatherDelta === -1 ? 'primary' : 'secondary'} onClick={() => setGodfatherDelta(-1)}>−1 Paria</Button>
              <Button variant={godfatherDelta === 1 ? 'primary' : 'secondary'} onClick={() => setGodfatherDelta(1)}>+1 Paria</Button>
            </div>
          </section>
        )}

        {CATEGORY_ORDER.map((category) => (
          <CategorySection
            key={category}
            category={category}
            characters={getCharactersForScript(scriptId).filter((c) => c.category === category)}
            selected={selected}
            locked={locked}
            onToggle={toggleCharacter}
            onToggleLock={toggleLock}
            target={composition.effectiveCounts[category]}
          />
        ))}
      </div>
    </Screen>
  )
}

function CompositionSummary({ composition }: { composition: Composition }) {
  return (
    <div className="bg-surface-1 border border-border rounded-xl p-4">
      <div className="grid grid-cols-4 gap-3 text-center mb-3">
        {CATEGORY_ORDER.map((category) => (
          <div key={category}>
            <div className="text-xl font-semibold">{composition.effectiveCounts[category]}</div>
            <div className="text-xs text-ink-2">{CATEGORY_LABELS[category]}</div>
          </div>
        ))}
      </div>
      {composition.warnings.length > 0 && (
        <ul className="text-sm text-warn mb-2 list-disc list-inside">
          {composition.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {composition.errors.length > 0 && (
        <ul className="text-sm text-danger list-disc list-inside">
          {composition.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {composition.isValid && <p className="text-sm text-success">Composition valide.</p>}
    </div>
  )
}

function CategorySection({
  category,
  characters,
  selected,
  locked,
  onToggle,
  onToggleLock,
  target,
}: {
  category: CharacterCategory
  characters: Character[]
  selected: Set<string>
  locked: Set<string>
  onToggle: (id: string) => void
  onToggleLock: (id: string) => void
  target: number
}) {
  const count = characters.filter((c) => selected.has(c.id)).length
  return (
    <section>
      <h2 className="text-sm text-ink-2 mb-2">
        {CATEGORY_LABELS[category]} — {count}/{target}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {characters.map((character) => {
          const isSelected = selected.has(character.id)
          return (
            <div
              key={character.id}
              className={`flex items-start gap-3 border rounded-lg px-3 py-2 cursor-pointer ${
                isSelected ? 'border-accent bg-surface-2' : 'border-border bg-surface-1'
              }`}
              onClick={() => onToggle(character.id)}
            >
              <RoleIcon characterId={character.id} nameFr={character.nameFr} size={32} />
              <div className="flex-1">
                <div className="font-medium">{character.nameFr}</div>
                <div className="text-xs text-ink-2">{character.shortDescription}</div>
              </div>
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLock(character.id)
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    locked.has(character.id) ? 'bg-accent text-surface-0' : 'bg-surface-3 text-ink-2'
                  }`}
                  title="Verrouiller pour le prochain tirage aléatoire"
                >
                  🔒
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
