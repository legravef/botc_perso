import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/store'
import { generateNightSteps } from '@/engine'
import { getCharacterById } from '@/data'
import type { Game, Player } from '@/types'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { SkyBanner } from '../components/SkyBanner'

interface AutoReminderConfig {
  /** Joueurs proposés dans le sélecteur de cible. */
  getEligiblePlayers: (game: Game, actingPlayerId: string) => Player[]
  /** Libellé du rappel posé sur le grimoire. */
  buildLabel: (target: Player) => string
  /** Joueur qui reçoit visuellement le rappel (la cible pour Empoisonneur/Moine, le joueur agissant pour le Majordome). */
  reminderPlayerId: (actingPlayerId: string, targetId: string) => string
}

const AUTO_REMINDER_CONFIG: Record<string, AutoReminderConfig> = {
  poisoner: {
    getEligiblePlayers: (game) => game.players.filter((p) => p.alive),
    buildLabel: () => 'Empoisonné',
    reminderPlayerId: (_actor, target) => target,
  },
  monk: {
    getEligiblePlayers: (game, actor) => game.players.filter((p) => p.alive && p.id !== actor),
    buildLabel: () => 'Protégé',
    reminderPlayerId: (_actor, target) => target,
  },
  butler: {
    getEligiblePlayers: (game, actor) => game.players.filter((p) => p.alive && p.id !== actor),
    buildLabel: (target) => `Maître : ${target.name}`,
    reminderPlayerId: (actor) => actor,
  },
}

export function NightAssistantScreen({ onOpenGrimoire }: { onOpenGrimoire: () => void }) {
  const game = useGameStore((s) => s.game)
  const completeNight = useGameStore((s) => s.completeNight)
  const applyNightlyReminder = useGameStore((s) => s.applyNightlyReminder)
  const [index, setIndex] = useState(0)
  const [targetId, setTargetId] = useState('')
  const [bluffsShown, setBluffsShown] = useState(false)

  const nightType = game?.phase === 'night.first' ? 'first' : 'other'
  const steps = useMemo(() => (game ? generateNightSteps(game, nightType) : []), [game, nightType])

  useEffect(() => {
    setTargetId('')
    setBluffsShown(false)
  }, [index])

  if (!game) return null

  const step = steps[index]
  const isLast = index === steps.length - 1
  const title = nightType === 'first' ? `Première nuit` : `Nuit ${game.nightNumber}`

  const autoConfig =
    step?.characterId && !step.isSimulated ? AUTO_REMINDER_CONFIG[step.characterId] : undefined
  const actingPlayerId = step?.playerIds[0]
  const eligiblePlayers = autoConfig && actingPlayerId ? autoConfig.getEligiblePlayers(game, actingPlayerId) : []

  const requiresBluffConfirmation = step?.kind === 'demon-info' && (step.bluffCharacterIds?.length ?? 0) > 0
  const canAdvance = !requiresBluffConfirmation || bluffsShown

  function handleNext() {
    if (!canAdvance) return
    if (isLast) {
      completeNight()
      return
    }
    setIndex((i) => i + 1)
  }

  function handlePrevious() {
    setIndex((i) => Math.max(0, i - 1))
  }

  function handleTargetChange(newTargetId: string) {
    setTargetId(newTargetId)
    if (!autoConfig || !actingPlayerId || !step?.characterId || !newTargetId) return
    const target = eligiblePlayers.find((p) => p.id === newTargetId)
    if (!target) return
    const reminderPlayerId = autoConfig.reminderPlayerId(actingPlayerId, newTargetId)
    applyNightlyReminder(step.characterId, autoConfig.buildLabel(target), reminderPlayerId)
  }

  const demonPlayerName = step?.demonPlayerId ? game.players.find((p) => p.id === step.demonPlayerId)?.name : undefined
  const redHerringName = step?.redHerringPlayerId
    ? game.players.find((p) => p.id === step.redHerringPlayerId)?.name
    : undefined

  // Les étapes "Information des Sbires"/"Information du Démon" n'ont pas de characterId unique
  // (plusieurs Sbires possibles) : on résout les icônes à afficher depuis les joueurs concernés.
  const headerCharacterIds: string[] = step
    ? step.kind === 'character'
      ? step.characterId
        ? [step.characterId]
        : []
      : step.playerIds
          .map((id) => game.players.find((p) => p.id === id)?.realCharacterId)
          .filter((id): id is string => Boolean(id))
    : []

  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-ink-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={logoTroubleBrewing} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-ink-2">
              {steps.length > 0 ? `Étape ${index + 1} / ${steps.length}` : 'Aucune action cette nuit'}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onOpenGrimoire}>
          Grimoire
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10">
        <SkyBanner variant="night" className="h-44 w-full max-w-xl" />
        {step ? (
          <div className="max-w-xl w-full bg-surface-1 border border-border rounded-2xl p-8 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {headerCharacterIds.length > 0 && (
                <div className="flex -space-x-2">
                  {headerCharacterIds.map((characterId, i) => (
                    <RoleIcon
                      key={`${characterId}-${i}`}
                      characterId={characterId}
                      nameFr={step.title}
                      size={56}
                      className="rounded-full ring-2 ring-surface-1"
                    />
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs text-accent uppercase tracking-wide mb-1">
                  {step.kind === 'minion-info'
                    ? 'Information des Sbires'
                    : step.kind === 'demon-info'
                      ? 'Information du Démon'
                      : 'Personnage'}
                </p>
                <h2 className="text-2xl font-semibold">{step.title}</h2>
              </div>
            </div>

            <div>
              <p className="text-xs text-ink-2 mb-1">Réveillez</p>
              <p className="text-lg">
                {step.playerIds
                  .map((id) => game.players.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>

            <div>
              <p className="text-xs text-ink-2 mb-1">Instruction</p>
              <p className="text-base">{step.instruction}</p>
            </div>

            {step.resolvedInfo && (
              <div className="bg-surface-2 border border-accent/40 rounded-lg p-3">
                <p className="text-xs text-ink-2 mb-1">Information privée à donner</p>
                <p className="text-base text-ink-0 font-medium">{step.resolvedInfo}</p>
              </div>
            )}

            {/* Voyante : démon et leurre affichés comme deux repères visuels distincts, impossibles à confondre ou oublier. */}
            {step?.characterId === 'fortune-teller' && (demonPlayerName || redHerringName) && (
              <div className="flex flex-wrap gap-2">
                {demonPlayerName && (
                  <span className="text-sm px-3 py-1.5 rounded-full bg-evil-bg text-evil border border-evil/40">
                    😈 Démon : {demonPlayerName}
                  </span>
                )}
                {redHerringName && (
                  <span className="text-sm px-3 py-1.5 rounded-full bg-warn/10 text-warn border border-warn/40">
                    🎭 Leurre (faux positif) : {redHerringName}
                  </span>
                )}
              </div>
            )}

            {/* Démon : bluffs affichés en grand avec icônes, confirmation obligatoire pour ne jamais les oublier. */}
            {requiresBluffConfirmation && (
              <div className="bg-danger/10 border border-danger/40 rounded-lg p-4">
                <p className="text-xs text-danger font-medium mb-3 uppercase tracking-wide">
                  ⚠️ Ne pas oublier de montrer ces 3 bluffs
                </p>
                <div className="flex flex-wrap gap-3 justify-center mb-4">
                  {step.bluffCharacterIds?.map((characterId) => {
                    const character = getCharacterById(game.scriptId, characterId)
                    return (
                      <div key={characterId} className="flex flex-col items-center gap-1 w-20">
                        <RoleIcon characterId={characterId} nameFr={character?.nameFr} size={48} />
                        <span className="text-xs text-center">{character?.nameFr ?? characterId}</span>
                      </div>
                    )
                  })}
                </div>
                <label className="flex items-center gap-2 justify-center text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bluffsShown}
                    onChange={(e) => setBluffsShown(e.target.checked)}
                    className="w-4 h-4"
                  />
                  J'ai montré les 3 bluffs au Diablotin
                </label>
              </div>
            )}

            {autoConfig && (
              <div>
                <label className="block text-xs text-ink-2 mb-1">
                  Cible choisie par le joueur — posée automatiquement sur le grimoire
                </label>
                <select
                  value={targetId}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-2 py-2 text-ink-0"
                >
                  <option value="">— Choisir —</option>
                  {eligiblePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {targetId && <p className="text-xs text-success mt-2">Rappel posé sur le grimoire.</p>}
              </div>
            )}

            {step.isSimulated && (
              <p className="text-xs text-warn">
                Pouvoir défaillant : ce réveil est simulé pour ne pas trahir l'Ivrogne, l'action n'a aucun effet réel.
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-xl w-full bg-surface-1 border border-border rounded-2xl p-8 text-center">
            <p className="text-lg">Aucun personnage à réveiller cette nuit.</p>
          </div>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-border flex justify-between gap-3">
        <Button variant="ghost" disabled={index === 0} onClick={handlePrevious}>
          Précédent
        </Button>
        <Button variant="primary" onClick={handleNext} disabled={!canAdvance}>
          {isLast || steps.length === 0 ? 'Terminer la nuit' : 'Suivant'}
        </Button>
      </footer>
    </div>
  )
}
