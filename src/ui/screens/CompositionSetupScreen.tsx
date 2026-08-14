import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/store'
import { getCharactersForScript } from '@/data'
import {
  generateRandomComposition,
  generateSuggestedComposition,
  TROUBLE_BREWING_SIX_PLAYER_PRESETS,
  validateComposition,
  type TroubleBrewingSixPlayerPreset,
} from '@/engine'
import type { Character, CharacterCategory, Composition, StorytellerLevel } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { getScriptName } from '../scriptPresentation'

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
  const setPreparation = useGameStore((s) => s.setPreparation)
  const setGodfatherOutsiderDelta = useGameStore((s) => s.setGodfatherOutsiderDelta)
  const setPhase = useGameStore((s) => s.setPhase)

  const playerCount = game?.players.length ?? 0
  const scriptId = game?.scriptId ?? 'trouble-brewing'
  const level = game?.storytellerLevel ?? 'beginner'

  const [selected, setSelected] = useState<Set<string>>(() => new Set(game?.composition?.characterIds ?? []))
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [randomError, setRandomError] = useState<string | null>(null)
  const [godfatherDelta, setGodfatherDelta] = useState<-1 | 0 | 1>(game?.godfatherOutsiderDelta ?? 0)
  const previousGodfatherDelta = useRef(godfatherDelta)

  const composition = useMemo(
    () => validateComposition([...selected], playerCount, scriptId, godfatherDelta),
    [selected, playerCount, scriptId, godfatherDelta],
  )

  const rebalanceGodfather = useCallback((ids: Set<string>, from: -1 | 0 | 1, to: -1 | 0 | 1): Set<string> => {
    const next = new Set(ids)
    const amount = to - from
    const characters = getCharactersForScript(scriptId)
    const replace = (remove: CharacterCategory, add: CharacterCategory) => {
      const removeId = [...next].find((id) => !locked.has(id) && characters.find((character) => character.id === id)?.category === remove)
      const addId = characters.find((character) => character.category === add && !next.has(character.id))?.id
      if (!removeId || !addId) return
      next.delete(removeId)
      next.add(addId)
    }
    for (let step = 0; step < Math.abs(amount); step += 1) {
      if (amount > 0) replace('townsfolk', 'outsider')
      else replace('outsider', 'townsfolk')
    }
    return next
  }, [locked, scriptId])

  useEffect(() => {
    const previous = previousGodfatherDelta.current
    if (previous === godfatherDelta) return
    previousGodfatherDelta.current = godfatherDelta
    setGodfatherOutsiderDelta(godfatherDelta)
    setSelected((current) => current.has('godfather') ? rebalanceGodfather(current, previous, godfatherDelta) : current)
  }, [godfatherDelta, rebalanceGodfather, setGodfatherOutsiderDelta])

  function toggleCharacter(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        if (id === 'godfather') {
          const rebalanced = rebalanceGodfather(next, godfatherDelta, 0)
          rebalanced.delete(id)
          setGodfatherDelta(0)
          setGodfatherOutsiderDelta(0)
          return rebalanced
        }
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
      const delta: -1 | 0 | 1 = result.characterIds.includes('godfather') ? 1 : 0
      setSelected(new Set(result.characterIds))
      setGodfatherDelta(delta)
      setGodfatherOutsiderDelta(delta)
      setRandomError(null)
    } catch (err) {
      setRandomError(err instanceof Error ? err.message : 'Tirage impossible.')
    }
  }

  function handleSuggestedDraw() {
    try {
      const lockedIds = [...selected].filter((id) => locked.has(id))
      const result = generateSuggestedComposition({ playerCount, scriptId, level, lockedCharacterIds: lockedIds })
      const delta: -1 | 0 | 1 = result.characterIds.includes('godfather') ? 1 : 0
      setSelected(new Set(result.characterIds))
      setGodfatherDelta(delta)
      setGodfatherOutsiderDelta(delta)
      setRandomError(null)
    } catch (err) {
      setRandomError(err instanceof Error ? err.message : 'Tirage impossible.')
    }
  }

  function handleSixPlayerPreset(preset: TroubleBrewingSixPlayerPreset) {
    const result = validateComposition(preset.characterIds, 6, 'trouble-brewing')
    if (!result.isValid) {
      setRandomError(`Le préréglage « ${preset.label} » n'est pas valide.`)
      return
    }
    setSelected(new Set(result.characterIds))
    setLocked(new Set())
    setPreparation({ drunkBelievedCharacterId: preset.drunkBelievedCharacterId })
    setRandomError(null)
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
      subtitle={`${playerCount} joueurs — ${getScriptName(scriptId)}`}
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
          <p className="text-xs text-ink-2 max-w-2xl">
            {scriptId === 'no-greater-joy'
              ? 'Scénario Teensyville officiel : les tirages restent limités à ses 11 personnages et respectent automatiquement la règle spéciale du Baron à 6 joueurs.'
              : LEVEL_CAPTIONS[level]}
          </p>
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
        {scriptId === 'trouble-brewing' && playerCount === 6 && (
          <section className="rounded-xl border border-accent/30 bg-surface-1 p-4">
            <div className="mb-3">
              <p className="font-medium">Compositions conseillées — Trouble Brewing à 6</p>
              <p className="mt-1 text-xs text-ink-2">
                Chaque préréglage remplace la sélection actuelle. Le faux rôle de l’Ivrogne est prérempli lorsqu’il est présent.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TROUBLE_BREWING_SIX_PLAYER_PRESETS.map((preset) => {
                const characters = preset.characterIds
                  .map((id) => getCharactersForScript(scriptId).find((character) => character.id === id))
                  .filter((character): character is Character => Boolean(character))
                const isActive = preset.characterIds.length === selected.size
                  && preset.characterIds.every((id) => selected.has(id))
                return (
                  <article key={preset.id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{preset.label}</p>
                        <p className="text-xs text-accent">{preset.audience}</p>
                      </div>
                      <Button
                        variant={isActive ? 'primary' : 'secondary'}
                        className="shrink-0 px-3 py-1.5 text-xs"
                        onClick={() => handleSixPlayerPreset(preset)}
                      >
                        {isActive ? 'Sélectionnée' : 'Choisir'}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-ink-2">{preset.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {characters.map((character) => (
                        <span key={character.id} className="rounded-full border border-border px-2 py-1 text-xs">
                          {character.nameFr}
                        </span>
                      ))}
                    </div>
                    {preset.drunkBelievedCharacterId && (
                      <p className="mt-2 text-xs text-warn">Ivrogne : se croit Empathique.</p>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}
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
