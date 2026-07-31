import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/store'
import { generateNightSteps } from '@/engine'
import { getCharacterById, getCharactersForScript } from '@/data'
import type { Game, Player } from '@/types'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoBadMoonRising from '../../../bad_moon/Logo BDM.png'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { SkyBanner } from '../components/SkyBanner'
import { TableModeToggle } from '../components/TableModeToggle'
import { PlayerChoiceGrid } from '../components/PlayerChoiceGrid'

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

const BMR_KILLERS = new Set(['assassin', 'godfather', 'moonchild', 'zombuul', 'shabaloth', 'po'])
const BMR_TARGET_REMINDERS: Record<string, string> = {
  exorcist: 'Exorcisé',
  'devils-advocate': 'Protégé (exécution)',
  pukka: 'Empoisonné (Pukka)',
}

export function NightAssistantScreen({ onOpenGrimoire }: { onOpenGrimoire: () => void }) {
  const game = useGameStore((s) => s.game)
  const completeNight = useGameStore((s) => s.completeNight)
  const applyNightlyReminder = useGameStore((s) => s.applyNightlyReminder)
  const addReminder = useGameStore((s) => s.addReminder)
  const addNote = useGameStore((s) => s.addNote)
  const killPlayer = useGameStore((s) => s.killPlayer)
  const resolveNightDeaths = useGameStore((s) => s.resolveNightDeaths)
  const revivePlayer = useGameStore((s) => s.revivePlayer)
  const setPlayerCharacter = useGameStore((s) => s.setPlayerCharacter)
  const [index, setIndex] = useState(0)
  const [targetId, setTargetId] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [bmrTargetIds, setBmrTargetIds] = useState<string[]>([])
  const [bmrDrunkPlayerId, setBmrDrunkPlayerId] = useState('')
  const [bmrCharacterChoice, setBmrCharacterChoice] = useState('')
  const [bmrGuessCorrect, setBmrGuessCorrect] = useState('')
  const [bmrRecorded, setBmrRecorded] = useState(false)
  const [impTargetId, setImpTargetId] = useState('')
  const [impSuccessorId, setImpSuccessorId] = useState('')
  const [nightOutcome, setNightOutcome] = useState<string | null>(null)
  const [roleRevealRequest, setRoleRevealRequest] = useState<{ actorId: string; title: string } | null>(null)
  const [roleRevealTargetId, setRoleRevealTargetId] = useState('')

  const nightType = game?.phase === 'night.first' ? 'first' : 'other'
  const steps = useMemo(() => (game ? generateNightSteps(game, nightType) : []), [game, nightType])

  useEffect(() => {
    setTargetId('')
    setShowReveal(false)
    setBmrTargetIds([])
    setBmrDrunkPlayerId('')
    setBmrCharacterChoice('')
    setBmrGuessCorrect('')
    setBmrRecorded(false)
    setImpTargetId('')
    setImpSuccessorId('')
    setNightOutcome(null)
    setRoleRevealRequest(null)
    setRoleRevealTargetId('')
  }, [index])

  useEffect(() => {
    if (!showReveal) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault()
        setShowReveal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showReveal])

  if (!game) return null

  const step = steps[index]
  const isLast = index === steps.length - 1
  const title = nightType === 'first' ? `Première nuit` : `Nuit ${game.nightNumber}`

  const autoConfig =
    step?.characterId && !step.isSimulated ? AUTO_REMINDER_CONFIG[step.characterId] : undefined
  const actingPlayerId = step?.playerIds[0]
  const eligiblePlayers = autoConfig && actingPlayerId ? autoConfig.getEligiblePlayers(game, actingPlayerId) : []
  const bmrCharacter = step?.characterId ? getCharacterById(game.scriptId, step.characterId) : undefined
  const isBmrAction =
    game.scriptId === 'bad-moon-rising' &&
    !!bmrCharacter &&
    !step?.isSimulated &&
    (bmrCharacter.targetCount > 0 || bmrCharacter.id === 'courtier')
  const bmrEligiblePlayers = game.players.filter((player) =>
    bmrCharacter?.id === 'professor' ? !player.alive : player.alive && player.id !== actingPlayerId,
  )
  const isImpKillAction = step?.characterId === 'imp' && !step.isSimulated
  const selectedDemonTargetIds = isImpKillAction
    ? (impTargetId ? [impTargetId] : [])
    : bmrCharacter?.category === 'demon'
      ? bmrTargetIds
      : []
  const protectedDemonTargets = game.players.filter((player) =>
    selectedDemonTargetIds.includes(player.id) &&
    (player.realCharacterId === 'sailor' || player.reminders.some((reminder) => reminder.sourceCharacterId === 'monk' || reminder.sourceCharacterId === 'innkeeper')),
  )
  const impSuccessors = game.players.filter((player) => {
    const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : undefined
    return player.alive && player.id !== actingPlayerId && character?.category === 'minion'
  })

  const requiresBluffConfirmation = step?.kind === 'demon-info' && (step.bluffCharacterIds?.length ?? 0) > 0
  const canAdvance = !isImpKillAction || bmrRecorded

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

  function toggleBmrTarget(playerId: string) {
    if (!bmrCharacter) return
    setBmrTargetIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= bmrCharacter.targetCount) return [...current.slice(1), playerId]
      return [...current, playerId]
    })
  }

  function reportDemonOutcome(targetIds: string[], demonName: string) {
    const updatedGame = useGameStore.getState().game
    if (!updatedGame) return
    const saved = updatedGame.players.filter((player) => targetIds.includes(player.id) && player.alive)
    if (saved.length > 0) {
      setNightOutcome(`${saved.map((player) => player.name).join(', ')} ne meurt pas : une protection ou une immunité a empêché l'attaque de ${demonName}.`)
    } else {
      setNightOutcome(`La victime de ${demonName} est bien enregistrée comme morte dans le grimoire.`)
    }
  }

  function queueDeathTriggeredReveal(targetIds: string[]) {
    const updatedGame = useGameStore.getState().game
    if (!updatedGame) return
    const ravenkeeper = updatedGame.players.find(
      (player) => targetIds.includes(player.id) && !player.alive && player.realCharacterId === 'ravenkeeper',
    )
    if (ravenkeeper) {
      setRoleRevealRequest({ actorId: ravenkeeper.id, title: `Gardien — ${ravenkeeper.name}` })
      setRoleRevealTargetId('')
    }
  }

  function recordBmrAction() {
    if (!game || !bmrCharacter || !actingPlayerId) return
    if (bmrCharacter.id === 'courtier') {
      if (!bmrCharacterChoice) return
      const chosen = getCharacterById(game.scriptId, bmrCharacterChoice)
      const holder = game.players.find((player) => player.realCharacterId === bmrCharacterChoice)
      addNote(actingPlayerId, `Courtisan : ${chosen?.nameFr ?? bmrCharacterChoice}`, 'power-used')
      if (holder) addReminder(holder.id, 'Ivre (Courtisan : 3 jours et 3 nuits)', 'courtier')
      setBmrRecorded(true)
      return
    }
    if (bmrTargetIds.length !== bmrCharacter.targetCount) return
    const targets = bmrTargetIds.map((id) => game.players.find((player) => player.id === id)).filter((p): p is Player => Boolean(p))
    const targetNames = targets.map((player) => player.name).join(', ')
    const detail = bmrCharacter.id === 'gambler' && bmrCharacterChoice
      ? ` — annonce : ${getCharacterById(game.scriptId, bmrCharacterChoice)?.nameFr ?? bmrCharacterChoice}`
      : ''
    addNote(actingPlayerId, `${bmrCharacter.nameFr} : ${targetNames}${detail}`, 'power-used')

    if (bmrCharacter.id === 'sailor') {
      const drunkId = bmrDrunkPlayerId || actingPlayerId
      addReminder(drunkId, 'Ivre (Marin)', 'sailor')
    } else if (bmrCharacter.id === 'innkeeper') {
      for (const target of targets) addReminder(target.id, 'Protégé (Aubergiste)', 'innkeeper')
      if (bmrDrunkPlayerId) addReminder(bmrDrunkPlayerId, 'Ivre (Aubergiste)', 'innkeeper')
    } else {
      const reminder = BMR_TARGET_REMINDERS[bmrCharacter.id]
      if (bmrCharacter.id === 'pukka') {
        const previousTargets = game.players
          .filter((player) => player.reminders.some((item) => item.sourceCharacterId === 'pukka'))
          .map((player) => player.id)
        if (previousTargets.length > 0) {
          resolveNightDeaths(previousTargets, 'pukka')
          queueDeathTriggeredReveal(previousTargets)
        }
        applyNightlyReminder('pukka', 'Empoisonné (Pukka)', targets[0]!.id)
      } else if (reminder) {
        for (const target of targets) addReminder(target.id, reminder, bmrCharacter.id)
      }
    }

    if (BMR_KILLERS.has(bmrCharacter.id)) {
      resolveNightDeaths(targets.map((target) => target.id), bmrCharacter.id, bmrCharacter.id === 'assassin')
      reportDemonOutcome(targets.map((target) => target.id), bmrCharacter.nameFr)
      queueDeathTriggeredReveal(targets.map((target) => target.id))
    }
    if (bmrCharacter.id === 'professor') for (const target of targets) revivePlayer(target.id)
    if (bmrCharacter.id === 'gambler' && bmrGuessCorrect === 'false') killPlayer(actingPlayerId)
    setBmrRecorded(true)
  }

  function recordImpKill() {
    if (!game || !actingPlayerId || !impTargetId) return
    const target = game.players.find((player) => player.id === impTargetId)
    if (!target) return

    if (impTargetId === actingPlayerId) {
      if (!impSuccessorId) return
      setPlayerCharacter(impSuccessorId, 'imp')
      killPlayer(actingPlayerId)
      const successor = game.players.find((player) => player.id === impSuccessorId)
      addNote(actingPlayerId, `Diablotin : se choisit lui-même. ${successor?.name ?? 'Un Sbire'} devient le nouveau Diablotin.`, 'power-used')
    } else {
      resolveNightDeaths([impTargetId], 'imp')
      addNote(actingPlayerId, `Diablotin : cible ${target.name}.`, 'power-used')
      reportDemonOutcome([impTargetId], 'Diablotin')
      queueDeathTriggeredReveal([impTargetId])
    }
    setBmrRecorded(true)
  }

  const demonPlayerName = step?.demonPlayerId ? game.players.find((p) => p.id === step.demonPlayerId)?.name : undefined
  const redHerringName = step?.redHerringPlayerId
    ? game.players.find((p) => p.id === step.redHerringPlayerId)?.name
    : undefined

  const reveal = step?.displayReveal
  const revealPlayerA = reveal?.kind === 'pair' ? game.players.find((p) => p.id === reveal.playerAId) : undefined
  const revealPlayerB = reveal?.kind === 'pair' ? game.players.find((p) => p.id === reveal.playerBId) : undefined
  const revealCharacter = reveal?.kind === 'pair' ? getCharacterById(game.scriptId, reveal.characterId) : undefined
  const roleRevealTarget = roleRevealTargetId ? game.players.find((player) => player.id === roleRevealTargetId) : undefined
  const roleRevealCharacter = roleRevealTarget?.realCharacterId
    ? getCharacterById(game.scriptId, roleRevealTarget.realCharacterId)
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
    <>
    <div className="min-h-screen flex flex-col bg-surface-0 text-ink-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={game.scriptId === 'bad-moon-rising' ? logoBadMoonRising : logoTroubleBrewing} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-ink-2">
              {steps.length > 0 ? `Étape ${index + 1} / ${steps.length}` : 'Aucune action cette nuit'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TableModeToggle />
          <Button variant="ghost" onClick={onOpenGrimoire}>Grimoire</Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10">
        {steps.length > 0 && (
          <div className="w-full max-w-xl flex items-center gap-1.5" aria-label={`Progression : étape ${index + 1} sur ${steps.length}`}>
            {steps.map((nightStep, stepIndex) => (
              <div
                key={nightStep.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${stepIndex < index ? 'bg-success' : stepIndex === index ? 'bg-accent shadow-[0_0_10px_rgba(177,138,255,0.8)]' : 'bg-surface-3'}`}
                title={`${stepIndex + 1}. ${nightStep.title}`}
              />
            ))}
          </div>
        )}
        <SkyBanner variant="night" className="h-44 w-full max-w-xl" />
        {step ? (
          <div className="max-w-xl w-full bg-surface-1/95 border border-border rounded-2xl p-8 flex flex-col gap-5 shadow-2xl">
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

            {reveal && (
              <Button variant="secondary" onClick={() => setShowReveal(true)} className="self-start">
                📱 Montrer directement sur l'écran (sans papier)
              </Button>
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
                  className="hidden"
                >
                  <option value="">— Choisir —</option>
                  {eligiblePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <PlayerChoiceGrid players={eligiblePlayers} selectedIds={targetId ? [targetId] : []} onSelect={handleTargetChange} />
                {targetId && <p className="text-xs text-success mt-2">Rappel posé sur le grimoire.</p>}
              </div>
            )}

            {isImpKillAction && (
              <div className="bg-danger/10 border border-danger/35 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-danger uppercase tracking-wide">Choix du Diablotin</p>
                  <p className="text-sm">Choisissez la victime de cette nuit. La mort est appliquée et tracée automatiquement.</p>
                </div>
                <select
                  value={impTargetId}
                  onChange={(e) => {
                    setImpTargetId(e.target.value)
                    setImpSuccessorId('')
                  }}
                  disabled={bmrRecorded}
                  className="hidden"
                >
                  <option value="">— Choisir un joueur —</option>
                  {game.players.filter((player) => player.alive).map((player) => (
                    <option key={player.id} value={player.id}>{player.name}{player.id === actingPlayerId ? ' (vous-même)' : ''}</option>
                  ))}
                </select>
                <PlayerChoiceGrid
                  players={game.players.filter((player) => player.alive)}
                  selectedIds={impTargetId ? [impTargetId] : []}
                  disabled={bmrRecorded}
                  onSelect={(playerId) => { setImpTargetId(playerId); setImpSuccessorId('') }}
                  getLabel={(player) => `${player.name}${player.id === actingPlayerId ? ' (vous-même)' : ''}`}
                />
                {impTargetId === actingPlayerId && (
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Sbire devenant le nouveau Diablotin</label>
                    <PlayerChoiceGrid players={impSuccessors} selectedIds={impSuccessorId ? [impSuccessorId] : []} disabled={bmrRecorded} onSelect={setImpSuccessorId} />
                    <select value={impSuccessorId} onChange={(e) => setImpSuccessorId(e.target.value)} disabled={bmrRecorded} className="hidden">
                      <option value="">— Choisir un Sbire vivant —</option>
                      {impSuccessors.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                    </select>
                    {impSuccessors.length === 0 && <p className="text-xs text-danger mt-2">Aucun Sbire vivant ne peut reprendre le rôle.</p>}
                  </div>
                )}
                <Button
                  variant="secondary"
                  disabled={bmrRecorded || !impTargetId || (impTargetId === actingPlayerId && !impSuccessorId)}
                  onClick={recordImpKill}
                >
                  {bmrRecorded ? 'Victime enregistrée' : 'Enregistrer la victime'}
                </Button>
                {bmrRecorded && <p className="text-xs text-success">La décision et son résultat sont enregistrés dans la partie.</p>}
              </div>
            )}

            {protectedDemonTargets.length > 0 && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-warn mb-1">Protection détectée</p>
                <p className="text-sm">{protectedDemonTargets.map((player) => player.name).join(', ')} est protégé(e) ou immunisé(e) cette nuit : l’attaque du Démon ne le/la tuera pas.</p>
              </div>
            )}

            {isBmrAction && bmrCharacter && (
              <div className="bg-surface-2 border border-accent/30 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-ink-2">Décision du Conteur</p>
                  <p className="text-sm">
                    {bmrCharacter.id === 'courtier'
                      ? 'Choisissez le personnage à rendre ivre.'
                      : `Sélectionnez ${bmrCharacter.targetCount === 1 ? 'un joueur' : `${bmrCharacter.targetCount} joueurs`}.`}
                  </p>
                </div>
                {bmrCharacter.id === 'courtier' ? (
                  <select value={bmrCharacterChoice} onChange={(e) => setBmrCharacterChoice(e.target.value)} disabled={bmrRecorded} className="w-full bg-surface-1 border border-border rounded px-2 py-2">
                    <option value="">— Choisir un personnage —</option>
                    {getCharactersForScript(game.scriptId).map((character) => <option key={character.id} value={character.id}>{character.nameFr}{game.players.some((player) => player.realCharacterId === character.id) ? ' (en jeu)' : ' (absent)'}</option>)}
                  </select>
                ) : <div className="grid grid-cols-2 gap-2">
                  {bmrEligiblePlayers.map((player) => {
                    const selected = bmrTargetIds.includes(player.id)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        disabled={bmrRecorded}
                        aria-pressed={selected}
                        onClick={() => toggleBmrTarget(player.id)}
                        className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${selected ? 'border-accent bg-accent/20 ring-1 ring-accent' : 'border-border bg-surface-1 hover:border-accent/60 hover:bg-surface-3'} disabled:opacity-45`}
                      >
                        {player.name}
                      </button>
                    )
                  })}
                </div>}
                {bmrCharacter.id === 'gambler' && bmrTargetIds.length === 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={bmrCharacterChoice} onChange={(e) => setBmrCharacterChoice(e.target.value)} disabled={bmrRecorded} className="bg-surface-1 border border-border rounded px-2 py-2">
                      <option value="">— Rôle annoncé —</option>
                      {getCharactersForScript(game.scriptId).map((character) => <option key={character.id} value={character.id}>{character.nameFr}</option>)}
                    </select>
                    <select value={bmrGuessCorrect} onChange={(e) => setBmrGuessCorrect(e.target.value)} disabled={bmrRecorded} className="bg-surface-1 border border-border rounded px-2 py-2">
                      <option value="">— Résultat —</option><option value="true">Bonne annonce</option><option value="false">Annonce fausse : le Parieur meurt</option>
                    </select>
                  </div>
                )}
                {(bmrCharacter.id === 'sailor' || bmrCharacter.id === 'innkeeper') && bmrTargetIds.length > 0 && (
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">Qui est ivre ?</label>
                    <PlayerChoiceGrid
                      players={game.players.filter((player) => (bmrCharacter.id === 'sailor' && player.id === actingPlayerId) || bmrTargetIds.includes(player.id))}
                      selectedIds={bmrDrunkPlayerId ? [bmrDrunkPlayerId] : []}
                      disabled={bmrRecorded}
                      onSelect={setBmrDrunkPlayerId}
                      getLabel={(player) => player.id === actingPlayerId ? `${player.name} (Marin)` : player.name}
                    />
                    <select value={bmrDrunkPlayerId} onChange={(e) => setBmrDrunkPlayerId(e.target.value)} disabled={bmrRecorded} className="hidden">
                      {bmrCharacter.id === 'sailor' && <option value={actingPlayerId}>Le Marin</option>}
                      <option value="">— Choisir —</option>
                      {bmrTargetIds.map((id) => <option key={id} value={id}>{game.players.find((player) => player.id === id)?.name}</option>)}
                    </select>
                  </div>
                )}
                <Button variant="secondary" disabled={bmrRecorded || (bmrCharacter.id === 'courtier' ? !bmrCharacterChoice : bmrTargetIds.length !== bmrCharacter.targetCount) || ((bmrCharacter.id === 'sailor' || bmrCharacter.id === 'innkeeper') && !bmrDrunkPlayerId) || (bmrCharacter.id === 'gambler' && (!bmrCharacterChoice || !bmrGuessCorrect))} onClick={recordBmrAction}>
                  {bmrRecorded ? 'Décision enregistrée' : 'Enregistrer dans le grimoire'}
                </Button>
                {bmrRecorded && <p className="text-xs text-success">Rappels, notes et éventuelles morts ont été reportés dans le grimoire.</p>}
              </div>
            )}

            {nightOutcome && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-warn mb-1">Garde-fou du Conteur</p>
                <p className="text-sm">{nightOutcome}</p>
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

    {roleRevealRequest && !roleRevealTarget && (
      <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <p className="text-xs text-accent uppercase tracking-[0.18em] mb-3">Réveil réactif</p>
          <h2 className="text-2xl font-semibold">{roleRevealRequest.title}</h2>
          <p className="text-ink-2 mt-3">Sélectionnez le joueur dont le rôle doit être montré.</p>
        </div>
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {game.players.map((player) => (
            <Button
              key={player.id}
              variant="secondary"
              className="min-h-20 text-xl"
              onClick={() => {
                setRoleRevealTargetId(player.id)
                addNote(roleRevealRequest.actorId, `Gardien : rôle de ${player.name} révélé.`, 'information')
              }}
            >
              {player.name}
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setRoleRevealRequest(null)}>Passer ce réveil</Button>
      </div>
    )}

    {roleRevealRequest && roleRevealTarget && (
      <div className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="text-ink-2 text-sm">Montrez ceci à {roleRevealRequest.title.replace('Gardien — ', '')}</p>
        <div className="bg-accent/10 border border-accent/50 rounded-3xl px-12 py-10 flex flex-col items-center gap-4 min-w-72">
          <p className="text-lg text-ink-1">{roleRevealTarget.name}</p>
          <RoleIcon characterId={roleRevealCharacter?.id} nameFr={roleRevealCharacter?.nameFr} size={92} />
          <p className="text-3xl font-semibold">{roleRevealCharacter?.nameFr ?? '?'}</p>
        </div>
        <Button variant="primary" onClick={() => setRoleRevealRequest(null)}>J’ai montré ce rôle</Button>
      </div>
    )}

    {showReveal && reveal && (
      <div
        className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center gap-8 px-6 cursor-pointer"
        onClick={() => setShowReveal(false)}
        role="button"
        tabIndex={0}
      >
        {reveal.kind === 'pair' ? (
          <>
            <p className="text-ink-2 text-sm">Ces deux joueurs — l'un des deux possède le rôle ci-dessous</p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <div className="bg-surface-1 border border-border rounded-2xl px-8 py-6 text-center min-w-40">
                <p className="text-2xl font-semibold">{revealPlayerA?.name ?? '?'}</p>
              </div>
              <span className="text-ink-2 text-xl">ou</span>
              <div className="bg-surface-1 border border-border rounded-2xl px-8 py-6 text-center min-w-40">
                <p className="text-2xl font-semibold">{revealPlayerB?.name ?? '?'}</p>
              </div>
            </div>
            <div className="bg-accent/10 border border-accent/50 rounded-2xl px-10 py-6 flex flex-col items-center gap-2">
              <RoleIcon characterId={revealCharacter?.id} nameFr={revealCharacter?.nameFr} size={72} />
              <p className="text-2xl font-semibold">{revealCharacter?.nameFr ?? '?'}</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-ink-2 text-sm">Nombre à montrer silencieusement</p>
            <p className="text-[9rem] leading-none font-bold text-accent">{reveal.value}</p>
          </>
        )}
        <p className="text-ink-2 text-xs mt-4">Touchez l'écran, espace ou échap pour masquer</p>
      </div>
    )}
    </>
  )
}
