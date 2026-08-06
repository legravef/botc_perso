import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@/store'
import { generateNightSteps } from '@/engine'
import { getCharacterById, getCharactersForScript } from '@/data'
import type { Game, Player } from '@/types'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoBadMoonRising from '../../../bad_moon/Logo BDM.png'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { SkyBanner } from '../components/SkyBanner'
import { PlayerChoiceGrid } from '../components/PlayerChoiceGrid'
import { CharacterChoiceGrid } from '../components/CharacterChoiceGrid'
import { CharacterPickerOverlay } from '../components/CharacterPickerOverlay'

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
  const cancelNight = useGameStore((s) => s.cancelNight)
  const applyNightlyReminder = useGameStore((s) => s.applyNightlyReminder)
  const addReminder = useGameStore((s) => s.addReminder)
  const addNote = useGameStore((s) => s.addNote)
  const killPlayer = useGameStore((s) => s.killPlayer)
  const resolveNightDeaths = useGameStore((s) => s.resolveNightDeaths)
  const revivePlayer = useGameStore((s) => s.revivePlayer)
  const setPlayerCharacter = useGameStore((s) => s.setPlayerCharacter)
  const setPlayerAlignment = useGameStore((s) => s.setPlayerAlignment)
  const setPoMustKillThree = useGameStore((s) => s.setPoMustKillThree)
  const setCourtierExpiry = useGameStore((s) => s.setCourtierExpiry)
  const setLastExorcistTarget = useGameStore((s) => s.setLastExorcistTarget)
  const setLastDevilsAdvocateTarget = useGameStore((s) => s.setLastDevilsAdvocateTarget)
  const setLunaticTargets = useGameStore((s) => s.setLunaticTargets)
  const setGodfatherKillDue = useGameStore((s) => s.setGodfatherKillDue)
  const setShabalothVictims = useGameStore((s) => s.setShabalothVictims)
  const setGossipKillDue = useGameStore((s) => s.setGossipKillDue)
  const setMoonchildTarget = useGameStore((s) => s.setMoonchildTarget)
  const [index, setIndex] = useState(0)
  // Le starpass du Diablotin change le rôle du successeur en pleine nuit : `steps` se recalcule
  // aussitôt et raccourcit (l'ancienne étape du successeur disparaît), ce qui décale `index`. On
  // recale `index` nous-mêmes juste après (voir recordImpKill) et on pose ce drapeau pour que
  // l'effet de reset ci-dessous n'efface pas la confirmation qu'on vient d'enregistrer.
  const skipNextStepResetRef = useRef(false)
  const [targetId, setTargetId] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [undertakerShownCharacterId, setUndertakerShownCharacterId] = useState('')
  const [showDemonRole, setShowDemonRole] = useState(false)
  const [showGoonAlignment, setShowGoonAlignment] = useState(false)
  const [bmrTargetIds, setBmrTargetIds] = useState<string[]>([])
  const [bmrDrunkPlayerId, setBmrDrunkPlayerId] = useState('')
  const [bmrCharacterChoice, setBmrCharacterChoice] = useState('')
  const [showCourtierRolePicker, setShowCourtierRolePicker] = useState(false)
  const [bmrRecorded, setBmrRecorded] = useState(false)
  const [impTargetId, setImpTargetId] = useState('')
  const [impSuccessorId, setImpSuccessorId] = useState('')
  const [nightOutcome, setNightOutcome] = useState<string | null>(null)
  const [roleRevealRequest, setRoleRevealRequest] = useState<{ actorId: string; title: string } | null>(null)
  const [roleRevealTargetId, setRoleRevealTargetId] = useState('')
  const [bmrReviveTargetId, setBmrReviveTargetId] = useState('')
  const [bmrInfoResult, setBmrInfoResult] = useState<string | null>(null)
  const [specialKillTargetId, setSpecialKillTargetId] = useState('')
  const [showNightSummary, setShowNightSummary] = useState(false)
  const [confirmingCancelNight, setConfirmingCancelNight] = useState(false)

  const nightType = game?.phase === 'night.first' ? 'first' : 'other'
  const steps = useMemo(() => (game ? generateNightSteps(game, nightType) : []), [game, nightType])

  useEffect(() => {
    if (skipNextStepResetRef.current) {
      skipNextStepResetRef.current = false
      return
    }
    setTargetId('')
    setShowReveal(false)
    setUndertakerShownCharacterId('')
    setShowDemonRole(false)
    setShowGoonAlignment(false)
    setBmrTargetIds([])
    setBmrDrunkPlayerId('')
    setBmrCharacterChoice('')
    setShowCourtierRolePicker(false)
    setBmrRecorded(false)
    setImpTargetId('')
    setImpSuccessorId('')
    setNightOutcome(null)
    setRoleRevealRequest(null)
    setRoleRevealTargetId('')
    setBmrReviveTargetId('')
    setBmrInfoResult(null)
    setSpecialKillTargetId('')
    setShowNightSummary(false)
    // Dépend de l'identité de l'étape (son id), pas seulement de l'index : si une action tue le
    // joueur en train d'agir (Parieur qui se trompe, Diablotin qui se choisit lui-même...), la
    // liste des étapes se recalcule et une étape différente peut se retrouver au même index —
    // sans ce garde-fou, l'état de l'étape précédente (résultat affiché, "déjà enregistré") reste
    // affiché par erreur sur la nouvelle étape.
  }, [index, steps[index]?.id])

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
  const lunaticSimulationCharacter = bmrCharacter?.id === 'lunatic' && nightType === 'other' && step?.perceivedDemonCharacterId
    ? getCharacterById(game.scriptId, step.perceivedDemonCharacterId)
    : undefined
  const isLunaticSimulation = !!lunaticSimulationCharacter
  const minstrelActive = game.players.some((player) => player.reminders.some((reminder) => reminder.sourceCharacterId === 'minstrel'))
  const nightLog = game.nightLog ?? []
  const publicNightDeaths = nightLog
    .filter((entry) => entry.outcome === 'dead' || entry.reason.includes('paraît mort'))
    .map((entry) => entry.targetName)
  const privateNightOutcomes = nightLog.filter((entry) => entry.outcome !== 'dead')
  const activeNightEffects = game.players.flatMap((player) => player.reminders
    .filter((reminder) => ['courtier', 'innkeeper', 'sailor', 'pukka', 'exorcist', 'devils-advocate'].includes(reminder.sourceCharacterId))
    .map((reminder) => `${player.name} : ${reminder.label}`))
  const exorcisedDemonName = game.players.find((player) => player.realCharacterId && getCharacterById(game.scriptId, player.realCharacterId)?.category === 'demon' && player.reminders.some((reminder) => reminder.sourceCharacterId === 'exorcist'))?.name
  const activeDemon = game.players.find((player) => player.realCharacterId && getCharacterById(game.scriptId, player.realCharacterId)?.category === 'demon')
  const demonDrunkReason = activeDemon?.reminders.find((reminder) => reminder.label.startsWith('Ivre'))?.label
  const actingPlayer = actingPlayerId ? game.players.find((player) => player.id === actingPlayerId) : undefined
  const hasUsedBmrPower = !!actingPlayer && !!bmrCharacter && actingPlayer.notes.some((note) => note.text.includes(`[BMR:${bmrCharacter.id}]`))
  const isExorcisedDemon = !!actingPlayer && bmrCharacter?.category === 'demon' && actingPlayer.reminders.some((reminder) => reminder.sourceCharacterId === 'exorcist')
  const godfatherCanKill = bmrCharacter?.id !== 'godfather' || !!game.godfatherKillDue
  const someoneDiedToday = !!game.lastExecutedPlayerId && game.players.find((player) => player.id === game.lastExecutedPlayerId)?.alive === false
  const zombuulCanKill = bmrCharacter?.id !== 'zombuul' || !someoneDiedToday
  const isBmrAction =
    game.scriptId === 'bad-moon-rising' &&
    !!bmrCharacter &&
    !step?.isSimulated &&
    (bmrCharacter.targetCount > 0 || bmrCharacter.id === 'courtier') &&
    !isExorcisedDemon && godfatherCanKill && zombuulCanKill &&
    !(nightType === 'first' && bmrCharacter.id === 'lunatic') && !isLunaticSimulation
  const bmrEligiblePlayers = game.players.filter((player) => {
    if (bmrCharacter?.id === 'professor') return !player.alive
    if (bmrCharacter?.id === 'exorcist') return player.alive && player.id !== game.lastExorcistTargetId
    if (bmrCharacter?.id === 'devils-advocate') return player.alive && player.id !== game.lastDevilsAdvocateTargetId
    if (bmrCharacter?.id === 'chambermaid') return player.alive && player.id !== actingPlayerId
    return player.alive
  })
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

  // S'il ne reste qu'un seul Sbire vivant, il n'y a rien à choisir : on le désigne
  // automatiquement comme successeur. Avec plusieurs Sbires vivants, le Conteur doit trancher.
  function handleImpTargetSelect(playerId: string) {
    setImpTargetId(playerId)
    setImpSuccessorId(playerId === actingPlayerId && impSuccessors.length === 1 ? impSuccessors[0]?.id ?? '' : '')
  }

  const requiresBluffConfirmation = (step?.kind === 'demon-info' || step?.characterId === 'lunatic') && (step.bluffCharacterIds?.length ?? 0) > 0
  const canAdvance = !isImpKillAction || bmrRecorded

  function handleNext() {
    if (!canAdvance) return
    if (isLast) {
      setShowNightSummary(true)
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

  const isPoForced = bmrCharacter?.id === 'po' && !!game.poMustKillThree
  const bmrEffectiveTargetCount = bmrCharacter?.id === 'po' ? (isPoForced ? 3 : 1) : (bmrCharacter?.targetCount ?? 0)
  const lunaticTargetCount = lunaticSimulationCharacter?.targetCount ?? 0

  function bmrTargetSelectionValid(): boolean {
    if (!bmrCharacter) return false
    if (bmrCharacter.id === 'po') return isPoForced ? bmrTargetIds.length === 3 : bmrTargetIds.length <= 1
    return bmrTargetIds.length === bmrCharacter.targetCount
  }

  function toggleBmrTarget(playerId: string) {
    if (!bmrCharacter) return
    setBmrTargetIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= bmrEffectiveTargetCount) return [...current.slice(1), playerId]
      return [...current, playerId]
    })
  }

  function toggleLunaticTarget(playerId: string) {
    setBmrTargetIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= lunaticTargetCount) return [...current.slice(1), playerId]
      return [...current, playerId]
    })
  }

  function recordLunaticSimulation() {
    if (!actingPlayerId || !lunaticSimulationCharacter || bmrTargetIds.length !== lunaticTargetCount) return
    const currentGame = useGameStore.getState().game
    if (!currentGame) return
    const names = bmrTargetIds
      .map((id) => currentGame.players.find((player) => player.id === id)?.name)
      .filter((name): name is string => Boolean(name))
    addNote(actingPlayerId, `[BMR:lunatic] Se croit ${lunaticSimulationCharacter.nameFr} : ${names.join(', ')}`, 'power-used')
    setLunaticTargets(bmrTargetIds)
    setBmrRecorded(true)
  }

  function reportDemonOutcome(targetIds: string[], demonName: string) {
    const updatedGame = useGameStore.getState().game
    if (!updatedGame) return
    const zombuulFeigningDeath = updatedGame.players.filter((player) => targetIds.includes(player.id) && player.realCharacterId === 'zombuul' && player.reminders.some((reminder) => reminder.sourceCharacterId === 'zombuul'))
    if (zombuulFeigningDeath.length > 0) {
      setNightOutcome(`${zombuulFeigningDeath.map((player) => player.name).join(', ')} doit paraître mort(e) publiquement, mais reste réellement en vie : gardez le jeton « Mort vivant » comme rappel MJ.`)
      return
    }
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
    if (hasUsedBmrPower) return
    const actorIsDrunk = !!actingPlayer?.reminders.some((reminder) =>
      (['courtier', 'sailor', 'innkeeper', 'goon', 'minstrel'].includes(reminder.sourceCharacterId) && reminder.label.startsWith('Ivre'))
      || reminder.label.startsWith('Empoisonné'),
    )
    if (actorIsDrunk) {
      addNote(actingPlayerId, `Pouvoir sans effet : ${bmrCharacter.nameFr} est ivre ou empoisonné.`, 'power-used')
      setBmrRecorded(true)
      return
    }
    if (bmrCharacter.id === 'courtier') {
      if (!bmrCharacterChoice) return
      const chosen = getCharacterById(game.scriptId, bmrCharacterChoice)
      const holder = game.players.find((player) => player.realCharacterId === bmrCharacterChoice)
      addNote(actingPlayerId, `[BMR:courtier] Courtisane : ${chosen?.nameFr ?? bmrCharacterChoice}`, 'power-used')
      if (holder) {
        addReminder(holder.id, 'Ivre (Courtisane : 3 jours et 3 nuits)', 'courtier')
        setCourtierExpiry(game.nightNumber + 3)
      }
      setBmrRecorded(true)
      return
    }
    if (!bmrTargetSelectionValid()) return
    const targets = bmrTargetIds.map((id) => game.players.find((player) => player.id === id)).filter((p): p is Player => Boolean(p))
    const targetNames = targets.length > 0 ? targets.map((player) => player.name).join(', ') : 'personne'
    // Le Parieur ne dit jamais le vrai rôle à l'écran (le joueur tient la tablette) : l'appli
    // compare elle-même l'annonce au rôle réel, en silence, pour décider s'il meurt.
    const gamblerGuessWrong = bmrCharacter.id === 'gambler' && targets[0] ? targets[0].realCharacterId !== bmrCharacterChoice : false
    const detail = bmrCharacter.id === 'gambler' && bmrCharacterChoice
      ? ` — annonce : ${getCharacterById(game.scriptId, bmrCharacterChoice)?.nameFr ?? bmrCharacterChoice} (${gamblerGuessWrong ? 'fausse' : 'correcte'})`
      : ''
    addNote(actingPlayerId, `${['assassin', 'professor'].includes(bmrCharacter.id) ? `[BMR:${bmrCharacter.id}] ` : ''}${bmrCharacter.nameFr} : ${targetNames}${detail}`, 'power-used')

    // Bras droit : le 1er joueur qui le cible cette nuit (toute capacité confondue) devient
    // ivre jusqu'au prochain crépuscule, et le Bras droit prend son alignement.
    const goonTarget = targets.find((player) => player.realCharacterId === 'goon')
    if (goonTarget && !goonTarget.reminders.some((reminder) => reminder.sourceCharacterId === 'goon-flip')) {
      const actor = game.players.find((player) => player.id === actingPlayerId)
      if (actor) {
        setPlayerAlignment(goonTarget.id, actor.alignment)
        addReminder(actor.id, 'Ivre (a ciblé le Bras droit)', 'goon')
        addReminder(goonTarget.id, `A changé d'équipe : ${actor.alignment === 'evil' ? 'Méchant' : 'Gentil'}`, 'goon-flip')
      }
    }

    if (bmrCharacter.id === 'po') setPoMustKillThree(targets.length === 0)
    if (bmrCharacter.id === 'exorcist') setLastExorcistTarget(targets[0]?.id ?? null)
    if (bmrCharacter.id === 'devils-advocate') setLastDevilsAdvocateTarget(targets[0]?.id ?? null)
    if (bmrCharacter.id === 'godfather') setGodfatherKillDue(false)

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

    if (BMR_KILLERS.has(bmrCharacter.id) && targets.length > 0) {
      resolveNightDeaths(targets.map((target) => target.id), bmrCharacter.id, bmrCharacter.id === 'assassin')
      reportDemonOutcome(targets.map((target) => target.id), bmrCharacter.nameFr)
      queueDeathTriggeredReveal(targets.map((target) => target.id))
    }
    if (bmrCharacter.id === 'shabaloth') {
      if (bmrReviveTargetId) revivePlayer(bmrReviveTargetId)
      setShabalothVictims(targets.map((target) => target.id))
    }
    if (bmrCharacter.id === 'chambermaid') {
      const awakened = targets.filter((target) => steps.some((nightStep) => nightStep.kind === 'character' && !nightStep.isSimulated && nightStep.playerIds.includes(target.id))).length
      setBmrInfoResult(`Montrez ${awakened} au/à la Concierge. Les joueurs ivres ou empoisonnés comptent tout de même s’ils se sont réveillés à cause de leur pouvoir.`)
    }
    if (bmrCharacter.id === 'professor') {
      for (const target of targets) {
        const role = target.realCharacterId ? getCharacterById(game.scriptId, target.realCharacterId) : undefined
        if (role?.category === 'townsfolk') revivePlayer(target.id)
      }
    }
    if (gamblerGuessWrong) {
      killPlayer(actingPlayerId)
      setNightOutcome(`Annonce fausse : ${actingPlayer?.name ?? 'le Parieur'} meurt cette nuit.`)
    } else if (bmrCharacter.id === 'gambler') {
      setNightOutcome(`Annonce correcte : ${actingPlayer?.name ?? 'le Parieur'} survit.`)
    }
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
      setNightOutcome(`${successor?.name ?? 'Le Sbire choisi'} devient le nouveau Diablotin et ne tue pas une seconde fois cette nuit.`)
      // Le changement de rôle raccourcit/réordonne `steps` immédiatement (voir plus haut) : on
      // recale `index` sur la nouvelle étape "imp", désormais tenue par le successeur, pour ne
      // pas perdre la position en cours de nuit et laisser le Conteur enchaîner normalement.
      const updatedGame = useGameStore.getState().game
      if (updatedGame) {
        const newSteps = generateNightSteps(updatedGame, nightType)
        const newIndex = newSteps.findIndex((s) => s.characterId === 'imp' && s.playerIds.includes(impSuccessorId))
        if (newIndex !== -1) {
          skipNextStepResetRef.current = true
          setIndex(newIndex)
        }
      }
    } else {
      resolveNightDeaths([impTargetId], 'imp')
      addNote(actingPlayerId, `Diablotin : cible ${target.name}.`, 'power-used')
      reportDemonOutcome([impTargetId], 'Diablotin')
      queueDeathTriggeredReveal([impTargetId])
      // La victime peut avoir déjà joué plus tôt dans la nuit. Sa disparition raccourcit alors
      // la file et peut laisser l'index courant hors limites : rester calé sur le Diablotin
      // permet de terminer proprement cette nuit sans perdre la validation de la victime.
      const updatedGame = useGameStore.getState().game
      if (updatedGame) {
        const newSteps = generateNightSteps(updatedGame, nightType)
        const newIndex = newSteps.findIndex((s) => s.characterId === 'imp' && s.playerIds.includes(actingPlayerId))
        if (newIndex !== -1) {
          skipNextStepResetRef.current = true
          setIndex(newIndex)
        }
      }
    }
    setBmrRecorded(true)
  }

  function resolvePendingSpecialKill(kind: 'gossip' | 'moonchild', targetId: string | null | undefined = specialKillTargetId) {
    if (!targetId) return
    if (!game) return
    const target = game.players.find((player) => player.id === targetId)
    if (!target) return
    if (kind === 'gossip') {
      resolveNightDeaths([target.id], 'gossip')
      setGossipKillDue(false)
      setNightOutcome(`La mort provoquée par la Pipelette est enregistrée pour ${target.name}.`)
    } else {
      if (game.moonchildTargetWasGood) {
        resolveNightDeaths([target.id], 'moonchild')
        setNightOutcome(`${target.name} était gentil(le) au choix du Moonchild : sa mort est enregistrée.`)
      } else {
        setNightOutcome(`${target.name} n’est pas gentil(le) : le Moonchild ne provoque aucune mort.`)
      }
      setMoonchildTarget(null)
    }
    setSpecialKillTargetId('')
  }

  const demonPlayerName = step?.demonPlayerId ? game.players.find((p) => p.id === step.demonPlayerId)?.name : undefined
  const redHerringName = step?.redHerringPlayerId
    ? game.players.find((p) => p.id === step.redHerringPlayerId)?.name
    : undefined

  const undertakerExecutedPlayer = step?.characterId === 'undertaker' && game.lastExecutedPlayerId
    ? game.players.find((player) => player.id === game.lastExecutedPlayerId)
    : undefined
  const undertakerActualCharacterId = undertakerExecutedPlayer?.realCharacterId
  const undertakerRevealCharacterId = undertakerShownCharacterId || undertakerActualCharacterId
  const reveal = step?.characterId === 'undertaker' && undertakerRevealCharacterId
    ? { kind: 'characters' as const, characterIds: [undertakerRevealCharacterId], title: 'Le personnage du joueur exécuté' }
    : step?.displayReveal
  const revealPlayerA = reveal?.kind === 'pair' ? game.players.find((p) => p.id === reveal.playerAId) : undefined
  const revealPlayerB = reveal?.kind === 'pair' ? game.players.find((p) => p.id === reveal.playerBId) : undefined
  const revealCharacter = reveal?.kind === 'pair' ? getCharacterById(game.scriptId, reveal.characterId) : undefined
  const revealSinglePlayer = reveal?.kind === 'player-role' ? game.players.find((player) => player.id === reveal.playerId) : undefined
  const revealSingleCharacter = reveal?.kind === 'player-role' ? getCharacterById(game.scriptId, reveal.characterId) : undefined
  const revealPlayers = reveal?.kind === 'players'
    ? reveal.playerIds.map((id) => game.players.find((player) => player.id === id)).filter((player): player is Player => Boolean(player))
    : []
  const roleRevealTarget = roleRevealTargetId ? game.players.find((player) => player.id === roleRevealTargetId) : undefined
  const roleRevealCharacter = roleRevealTarget?.realCharacterId
    ? getCharacterById(game.scriptId, roleRevealTarget.realCharacterId)
    : undefined
  const demonInfoPlayer = step?.demonPlayerId ? game.players.find((player) => player.id === step.demonPlayerId) : undefined
  const demonInfoCharacter = step?.perceivedDemonCharacterId
    ? getCharacterById(game.scriptId, step.perceivedDemonCharacterId)
    : demonInfoPlayer?.realCharacterId
      ? getCharacterById(game.scriptId, demonInfoPlayer.realCharacterId)
      : undefined
  const goonWasTargeted = bmrCharacter?.id === 'goon' && !!actingPlayer?.reminders.some((reminder) => reminder.sourceCharacterId === 'goon-flip')

  // Les étapes "Information des Sbires"/"Information du Démon" n'ont pas de characterId unique
  // (plusieurs Sbires possibles) : on résout les icônes à afficher depuis les joueurs concernés.
  const headerCharacterIds: string[] = step
    ? step.perceivedDemonCharacterId
      ? [step.perceivedDemonCharacterId]
      : step.kind === 'character'
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
          <Button
            variant={confirmingCancelNight ? 'danger' : 'ghost'}
            onClick={() => {
              if (confirmingCancelNight) {
                cancelNight()
                setConfirmingCancelNight(false)
              } else {
                setConfirmingCancelNight(true)
              }
            }}
            onBlur={() => setConfirmingCancelNight(false)}
            title="Annule toutes les actions de cette nuit et revient à l'état d'avant son début."
          >
            {confirmingCancelNight ? 'Confirmer : annuler la nuit ?' : 'Annuler la nuit'}
          </Button>
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

            {bmrCharacter?.id === 'goon' && actingPlayer && (
              <div className={`rounded-xl border p-4 flex flex-col gap-3 ${goonWasTargeted ? 'bg-warn/10 border-warn/40' : 'bg-surface-2 border-border'}`}>
                <div>
                  <p className="text-xs uppercase tracking-wide text-accent mb-1">Guide MJ — Bras droit</p>
                  {nightType === 'first' ? (
                    <p className="text-sm">C’est la première nuit : réveillez {actingPlayer.name} et montrez-lui uniquement son alignement initial. Ne montrez ni rôle, ni nom de joueur.</p>
                  ) : goonWasTargeted ? (
                    <p className="text-sm">Le Bras droit a été ciblé cette nuit : le premier joueur qui l’a ciblé est désormais ivre et son alignement a été mis à jour. Réveillez {actingPlayer.name} pour lui montrer son nouvel alignement, sans expliquer pourquoi.</p>
                  ) : (
                    <p className="text-sm">Le Bras droit n’a pas été ciblé cette nuit : aucune information nouvelle à lui donner. Vous pouvez passer cette étape sans le réveiller.</p>
                  )}
                </div>
                {(nightType === 'first' || goonWasTargeted) && <Button variant="secondary" onClick={() => setShowGoonAlignment(true)} className="self-start">Afficher l’alignement à {actingPlayer.name}</Button>}
              </div>
            )}

            {step.resolvedInfo && (
              <div className={step.isPoisoned ? 'bg-danger/10 border border-danger/40 rounded-lg p-3' : 'bg-surface-2 border border-accent/40 rounded-lg p-3'}>
                <p className={`text-xs mb-1 uppercase tracking-wide ${step.isPoisoned ? 'text-danger' : 'text-ink-2'}`}>
                  {step.isPoisoned ? '⚠️ Ivre ou empoisonné(e) — réponse libre au choix du Conteur' : 'Information privée à donner'}
                </p>
                <p className="text-base text-ink-0 font-medium">{step.resolvedInfo}</p>
              </div>
            )}

            {step.kind === 'demon-info' && demonInfoPlayer && demonInfoCharacter && (
              <div className="bg-evil-bg border border-evil/45 rounded-xl p-4 flex items-center justify-between gap-3">
                <div><p className="text-xs uppercase tracking-wide text-evil mb-1">Rappel pour le Démon</p><p className="text-sm">Avant de lui montrer ses Sbires et ses bluffs, confirmez-lui clairement son personnage.</p></div>
                <Button variant="secondary" onClick={() => setShowDemonRole(true)}>Montrer « {demonInfoCharacter.nameFr} »</Button>
              </div>
            )}

            {minstrelActive && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-warn mb-1">Ménestrel actif</p>
                <p className="text-sm">Un Sbire a été exécuté : tous les autres joueurs sont ivres cette nuit et le jour suivant.</p>
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

            {step?.characterId === 'undertaker' && step.isPoisoned && undertakerRevealCharacterId && (
              <div className="bg-danger/10 border border-danger/40 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-danger font-medium uppercase tracking-wide">Croque-mort ivre ou empoisonné</p>
                  <p className="text-sm">Choisissez le rôle à lui montrer. Le rôle réel reste présélectionné comme repère pour le Conteur.</p>
                </div>
                <CharacterChoiceGrid
                  characters={getCharactersForScript(game.scriptId)}
                  selectedIds={[undertakerRevealCharacterId]}
                  onSelect={setUndertakerShownCharacterId}
                />
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
                  onChange={(e) => handleImpTargetSelect(e.target.value)}
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
                  onSelect={handleImpTargetSelect}
                  getLabel={(player) => `${player.name}${player.id === actingPlayerId ? ' (vous-même)' : ''}`}
                />
                {impTargetId === actingPlayerId && (
                  <div>
                    {impSuccessors.length > 1 ? (
                      <>
                        <label className="block text-xs text-ink-2 mb-1">Sbire devenant le nouveau Diablotin</label>
                        <PlayerChoiceGrid players={impSuccessors} selectedIds={impSuccessorId ? [impSuccessorId] : []} disabled={bmrRecorded} onSelect={setImpSuccessorId} />
                        <select value={impSuccessorId} onChange={(e) => setImpSuccessorId(e.target.value)} disabled={bmrRecorded} className="hidden">
                          <option value="">— Choisir un Sbire vivant —</option>
                          {impSuccessors.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                        </select>
                      </>
                    ) : impSuccessors.length === 1 ? (
                      <p className="text-xs text-success">Successeur automatique — seul Sbire vivant : {impSuccessors[0]?.name} devient le nouveau Diablotin.</p>
                    ) : (
                      <p className="text-xs text-danger mt-2">Aucun Sbire vivant ne peut reprendre le rôle.</p>
                    )}
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

            {isLunaticSimulation && lunaticSimulationCharacter && (
              <div className="bg-surface-2 border border-accent/30 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <RoleIcon characterId={lunaticSimulationCharacter.id} nameFr={lunaticSimulationCharacter.nameFr} size={42} />
                  <div>
                    <p className="text-xs text-ink-2">Action simulée</p>
                    <p className="text-sm">Comme {lunaticSimulationCharacter.nameFr}, choisissez {lunaticTargetCount === 1 ? 'un joueur' : `${lunaticTargetCount} joueurs`}.</p>
                  </div>
                </div>
                <PlayerChoiceGrid
                  players={game.players.filter((player) => player.alive)}
                  selectedIds={bmrTargetIds}
                  disabled={bmrRecorded}
                  onSelect={toggleLunaticTarget}
                />
                <Button variant="secondary" disabled={bmrRecorded || bmrTargetIds.length !== lunaticTargetCount} onClick={recordLunaticSimulation}>
                  {bmrRecorded ? 'Choix du Lunatique enregistré' : 'Enregistrer les choix du Lunatique'}
                </Button>
                <p className="text-xs text-ink-2">Ces choix sont conservés pour le MJ, sans tuer ni affecter les joueurs.</p>
              </div>
            )}

            {isBmrAction && bmrCharacter && (
              <div className="bg-surface-2 border border-accent/30 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-ink-2">Décision du Conteur</p>
                  <p className="text-sm">
                    {bmrCharacter.id === 'courtier'
                      ? 'Choisissez le personnage à rendre ivre.'
                      : bmrCharacter.id === 'po'
                        ? isPoForced
                          ? 'Po n\'a tué personne la nuit dernière : il doit tuer 3 joueurs cette nuit.'
                          : 'Sélectionnez un joueur à tuer, ou aucun.'
                        : `Sélectionnez ${bmrCharacter.targetCount === 1 ? 'un joueur' : `${bmrCharacter.targetCount} joueurs`}.`}
                  </p>
                </div>
                {bmrCharacter.id === 'exorcist' && game.lastExorcistTargetId && (
                  <p className="text-xs text-warn">
                    Cible de la nuit précédente : {game.players.find((player) => player.id === game.lastExorcistTargetId)?.name ?? 'joueur inconnu'} — elle est exclue de cette sélection.
                  </p>
                )}
                {bmrCharacter.id === 'courtier' ? (
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="secondary" disabled={bmrRecorded} onClick={() => setShowCourtierRolePicker(true)}>
                      Donner la tablette à la Courtisane
                    </Button>
                    {bmrCharacterChoice && <p className="text-xs text-success">Rôle choisi : {getCharacterById(game.scriptId, bmrCharacterChoice)?.nameFr ?? bmrCharacterChoice}</p>}
                  </div>
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
                {bmrCharacter.id === 'shabaloth' && (game.shabalothVictimIds?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-ink-2 mb-1">Régurgitation facultative — une victime de la nuit précédente revient en jeu.</p>
                    <PlayerChoiceGrid
                      players={game.players.filter((player) => game.shabalothVictimIds?.includes(player.id))}
                      selectedIds={bmrReviveTargetId ? [bmrReviveTargetId] : []}
                      disabled={bmrRecorded}
                      onSelect={setBmrReviveTargetId}
                    />
                  </div>
                )}
                {bmrCharacter.id === 'gambler' && bmrTargetIds.length === 1 && !bmrCharacterChoice && (
                  <div>
                    <label className="block text-xs text-ink-2 mb-2">Rôle annoncé par le Parieur (le joueur choisit lui-même)</label>
                    <CharacterChoiceGrid
                      characters={getCharactersForScript(game.scriptId)}
                      selectedIds={[]}
                      onSelect={setBmrCharacterChoice}
                    />
                  </div>
                )}
                {bmrCharacter.id === 'gambler' && bmrCharacterChoice && !bmrRecorded && (
                  <div className="bg-warn/10 border border-warn/40 rounded-lg p-4 flex flex-col gap-2">
                    <p className="text-sm font-medium">Annonce enregistrée — rendez la tablette au Conteur.</p>
                    <p className="text-xs text-ink-2">
                      Le résultat n'apparaîtra qu'après validation par le Conteur ci-dessous — le vrai rôle n'est
                      jamais affiché au joueur.
                    </p>
                    <Button variant="ghost" className="self-start text-xs px-2 py-1" onClick={() => setBmrCharacterChoice('')}>
                      Modifier l'annonce (Conteur)
                    </Button>
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
                <Button variant="secondary" disabled={bmrRecorded || hasUsedBmrPower || (bmrCharacter.id === 'courtier' ? !bmrCharacterChoice : !bmrTargetSelectionValid()) || ((bmrCharacter.id === 'sailor' || bmrCharacter.id === 'innkeeper') && !bmrDrunkPlayerId) || (bmrCharacter.id === 'gambler' && !bmrCharacterChoice)} onClick={recordBmrAction}>
                  {bmrRecorded ? 'Décision enregistrée' : bmrCharacter.id === 'gambler' ? 'Conteur : valider le résultat' : 'Enregistrer dans le grimoire'}
                </Button>
                {bmrRecorded && <p className="text-xs text-success">Rappels, notes et éventuelles morts ont été reportés dans le grimoire.</p>}
                {hasUsedBmrPower && <p className="text-xs text-warn">Ce pouvoir unique a déjà été utilisé pendant cette partie.</p>}
                {bmrInfoResult && <p className="bg-good/10 border border-good/35 rounded-lg px-3 py-2 text-sm">{bmrInfoResult}</p>}
              </div>
            )}

            {game.scriptId === 'bad-moon-rising' && isExorcisedDemon && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3 text-sm">
                Le Démon a été ciblé par l’Exorciste : il ne peut pas utiliser son pouvoir cette nuit. Informez-le de l’identité de l’Exorciste.
              </div>
            )}
            {game.scriptId === 'bad-moon-rising' && bmrCharacter?.id === 'godfather' && !game.godfatherKillDue && (
              <div className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm">Le Parrain ne tue pas cette nuit : aucun Paria n’est mort pendant la journée précédente.</div>
            )}
            {game.scriptId === 'bad-moon-rising' && bmrCharacter?.id === 'zombuul' && someoneDiedToday && (
              <div className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm">Le Zombuul ne tue pas cette nuit : quelqu’un est mort aujourd’hui (exécution).</div>
            )}

            {step?.id === 'gossip-kill' && game.gossipKillDue && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg p-4 flex flex-col gap-3">
                <div><p className="text-xs uppercase tracking-wide text-warn">Pipelette — décision du Conteur</p><p className="text-sm">Sa déclaration était vraie : choisissez une personne qui meurt cette nuit.</p></div>
                <PlayerChoiceGrid players={game.players.filter((player) => player.alive)} selectedIds={specialKillTargetId ? [specialKillTargetId] : []} onSelect={setSpecialKillTargetId} />
                <Button variant="secondary" disabled={!specialKillTargetId} onClick={() => resolvePendingSpecialKill('gossip')}>Enregistrer la mort</Button>
              </div>
            )}
            {step?.id === 'moonchild-death' && game.moonchildTargetId && (
              <div className="bg-warn/10 border border-warn/40 rounded-lg p-4 flex flex-col gap-3">
                <div><p className="text-xs uppercase tracking-wide text-warn">Moonchild — résolution</p><p className="text-sm">{game.players.find((player) => player.id === game.moonchildTargetId)?.name ?? 'La cible'} a été désigné(e) publiquement. Confirmez sa résolution cette nuit.</p></div>
                <Button variant="secondary" onClick={() => resolvePendingSpecialKill('moonchild', game.moonchildTargetId)}>Résoudre le Moonchild</Button>
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

      <footer className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border flex justify-between gap-3">
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
        ) : reveal.kind === 'number' ? (
          <>
            <p className="text-ink-2 text-sm">Nombre à montrer silencieusement</p>
            <p className="text-[9rem] leading-none font-bold text-accent">{reveal.value}</p>
          </>
        ) : reveal.kind === 'players' ? (
          <>
            <p className="text-ink-2 text-sm">{reveal.title}</p>
            <div className="flex flex-wrap justify-center gap-4">
              {revealPlayers.map((player) => <div key={player.id} className="bg-accent/10 border border-accent/50 rounded-2xl px-10 py-7"><p className="text-3xl font-semibold">{player.name}</p></div>)}
            </div>
          </>
        ) : reveal.kind === 'player-role' ? (
          <>
            <p className="text-ink-2 text-sm">Ce joueur et son personnage</p>
            <div className="bg-surface-1 border border-border rounded-2xl px-10 py-6"><p className="text-3xl font-semibold">{revealSinglePlayer?.name ?? '?'}</p></div>
            <div className="bg-accent/10 border border-accent/50 rounded-2xl px-10 py-7 flex flex-col items-center gap-3"><RoleIcon characterId={revealSingleCharacter?.id} nameFr={revealSingleCharacter?.nameFr} size={78} /><p className="text-3xl font-semibold">{revealSingleCharacter?.nameFr ?? '?'}</p></div>
          </>
        ) : (
          <>
            <p className="text-ink-2 text-sm">{reveal.title}</p>
            {reveal.characterIds.length > 0 ? <div className="flex flex-wrap justify-center gap-4">{reveal.characterIds.map((characterId) => { const character = getCharacterById(game.scriptId, characterId); return <div key={characterId} className="bg-accent/10 border border-accent/50 rounded-2xl px-7 py-5 flex flex-col items-center gap-2"><RoleIcon characterId={characterId} nameFr={character?.nameFr} size={64} /><p className="text-xl font-semibold">{character?.nameFr ?? characterId}</p></div> })}</div> : <p className="text-4xl font-semibold">Aucun</p>}
          </>
        )}
        <p className="text-ink-2 text-xs mt-4">Touchez l'écran, espace ou échap pour masquer</p>
      </div>
    )}
    {showNightSummary && (
      <div className="fixed inset-0 z-[60] bg-surface-0/95 overflow-y-auto px-5 py-8" role="dialog" aria-modal="true" aria-label="Résumé de la nuit">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent">Briefing du Conteur</p>
            <h1 className="mt-2 text-3xl font-bold">Résumé de la nuit</h1>
            <p className="mt-2 text-ink-2">Vérifiez cette résolution avant de réveiller le village.</p>
          </div>

          <section className="rounded-2xl border border-good/40 bg-good-bg p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-good">À annoncer à l’aube</p>
            {publicNightDeaths.length > 0 ? (
              <p className="mt-3 text-lg font-semibold">Mort{publicNightDeaths.length > 1 ? 's' : ''} cette nuit : {publicNightDeaths.join(', ')}.</p>
            ) : (
              <p className="mt-3 text-lg font-semibold">Aucun joueur mort à annoncer.</p>
            )}
            <p className="mt-2 text-sm text-ink-2">Annoncez uniquement les morts visibles. Ne donnez ni cause, ni protection, ni information privée.</p>
          </section>

          <section className="rounded-2xl border border-border bg-surface-1 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Résolution privée — MJ uniquement</p>
            <div className="mt-3 space-y-2 text-sm">
              {privateNightOutcomes.map((entry, entryIndex) => (
                <p key={`${entry.sourceCharacterId}-${entry.targetName}-${entryIndex}`} className="rounded-xl bg-surface-2 px-3 py-2"><span className="font-semibold">{entry.sourceName} → {entry.targetName}</span> : {entry.reason}</p>
              ))}
              {minstrelActive && <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2"><span className="font-semibold">Ménestrel actif :</span> tous les autres joueurs sont ivres cette nuit. Leurs pouvoirs ne fonctionnent pas.</p>}
              {exorcisedDemonName && <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2"><span className="font-semibold">Exorciste :</span> {exorcisedDemonName} sait qu’il a été choisi et ne peut pas utiliser son pouvoir cette nuit.</p>}
              {!exorcisedDemonName && demonDrunkReason && activeDemon && <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2"><span className="font-semibold">Démon empêché :</span> {activeDemon.name} est ivre ({demonDrunkReason}) ; son pouvoir ne fonctionne pas cette nuit.</p>}
              {activeNightEffects.length > 0 && <p className="rounded-xl bg-surface-2 px-3 py-2"><span className="font-semibold">Effets encore actifs :</span> {activeNightEffects.join(' · ')}</p>}
              {privateNightOutcomes.length === 0 && !minstrelActive && !exorcisedDemonName && !demonDrunkReason && activeNightEffects.length === 0 && <p className="text-ink-2">Aucun effet privé particulier n’a été enregistré.</p>}
            </div>
          </section>

          <p className="text-sm text-ink-2">À ne pas annoncer : les protections, l’ivresse, les empoisonnements, les cibles choisies et les raisons d’une survie.</p>
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setShowNightSummary(false)}>Retour à la nuit</Button>
            <Button variant="primary" onClick={() => { setShowNightSummary(false); completeNight() }}>Passer au jour</Button>
          </div>
        </div>
      </div>
    )}
    {showGoonAlignment && actingPlayer && (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6" onClick={() => setShowGoonAlignment(false)} role="dialog" aria-modal="true" aria-label="Alignement du Bras droit">
        <div className={`w-full max-w-xl rounded-3xl border p-10 text-center shadow-2xl ${actingPlayer.alignment === 'good' ? 'border-good bg-good-bg' : 'border-evil bg-evil-bg'}`} onClick={(event) => event.stopPropagation()}>
          <p className="text-sm uppercase tracking-[0.22em] text-ink-2">Votre alignement est</p>
          <p className={`mt-5 text-6xl font-bold ${actingPlayer.alignment === 'good' ? 'text-good' : 'text-evil'}`}>{actingPlayer.alignment === 'good' ? 'GENTIL' : 'MÉCHANT'}</p>
          <Button variant="ghost" className="mt-10" onClick={() => setShowGoonAlignment(false)}>Masquer</Button>
        </div>
      </div>
    )}
    {showCourtierRolePicker && (
      <CharacterPickerOverlay
        title="Courtisane"
        subtitle="Choisissez un personnage — touchez le rôle que vous souhaitez rendre ivre."
        characters={getCharactersForScript(game.scriptId)}
        onSelect={(characterId) => {
          setBmrCharacterChoice(characterId)
          setShowCourtierRolePicker(false)
        }}
        onClose={() => setShowCourtierRolePicker(false)}
      />
    )}
    {showDemonRole && demonInfoPlayer && demonInfoCharacter && (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-8 p-6 text-center" onClick={() => setShowDemonRole(false)} role="dialog" aria-modal="true" aria-label="Personnage du Démon">
        <p className="text-sm uppercase tracking-[0.22em] text-ink-2">Votre personnage est</p>
        <div className="bg-evil-bg border border-evil rounded-3xl px-12 py-10 flex flex-col items-center gap-4">
          <RoleIcon characterId={demonInfoCharacter.id} nameFr={demonInfoCharacter.nameFr} size={96} />
          <p className="text-4xl font-bold text-evil">{demonInfoCharacter.nameFr}</p>
        </div>
        <p className="text-xs text-ink-2">Touchez l’écran pour masquer</p>
      </div>
    )}
    </>
  )
}
