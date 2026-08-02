import { useEffect } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById, getCharactersForScript } from '@/data'
import type { CharacterCategory, Game, InfoPairPreparation } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'

interface InfoPairFieldProps {
  game: Game
  label: string
  categoryLabel: string
  category: CharacterCategory
  excludeCharacterId: string
  value: InfoPairPreparation | 'none' | null
  onChange: (value: InfoPairPreparation | 'none' | null) => void
}

function InfoPairField({ game, label, categoryLabel, category, excludeCharacterId, value, onChange }: InfoPairFieldProps) {
  const characters = getCharactersForScript(game.scriptId)
  const inPlayCharacterIds = game.composition?.characterIds ?? []
  const candidates = characters.filter(
    (c) => c.category === category && c.id !== excludeCharacterId && inPlayCharacterIds.includes(c.id),
  )
  const askerPlayer = game.players.find((p) => p.realCharacterId === excludeCharacterId)
  const current = value && value !== 'none' ? value : null

  useEffect(() => {
    if (candidates.length === 0 && value !== 'none') onChange('none')
  }, [candidates.length, value, onChange])

  if (candidates.length === 0) {
    return (
      <div className="bg-surface-1 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-1">{label}</h3>
        <p className="text-sm text-ink-2">Aucun {categoryLabel} en jeu — information automatique.</p>
      </div>
    )
  }

  const shownCharacter = current ? characters.find((c) => c.id === current.characterId) : null
  const decoyPlayer = current ? game.players.find((p) => p.id === current.playerBId) : null

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 flex flex-col gap-3">
      <h3 className="font-medium">{label}</h3>
      <div>
        <label className="block text-xs text-ink-2 mb-1">{categoryLabel} montré</label>
        <select
          value={current?.characterId ?? ''}
          onChange={(e) => {
            const characterId = e.target.value
            if (!characterId) {
              onChange(null)
              return
            }
            const holder = game.players.find((p) => p.realCharacterId === characterId)
            if (!holder) return
            onChange({ characterId, playerAId: holder.id, playerBId: current?.playerBId ?? '' })
          }}
          className="w-full bg-surface-2 border border-border rounded px-2 py-2"
        >
          <option value="">— Choisir —</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameFr}
            </option>
          ))}
        </select>
      </div>
      {current && (
        <div>
          <label className="block text-xs text-ink-2 mb-1">Second joueur montré (leurre)</label>
          <select
            value={current.playerBId}
            onChange={(e) => onChange({ ...current, playerBId: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded px-2 py-2"
          >
            <option value="">— Choisir —</option>
            {game.players
              .filter((p) => p.id !== current.playerAId && p.id !== askerPlayer?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {current && shownCharacter && decoyPlayer && (
        <p className="text-xs text-success">
          Le vrai {categoryLabel.toLowerCase()} ({shownCharacter.nameFr}) est détenu par{' '}
          {game.players.find((p) => p.id === current.playerAId)?.name}. Second joueur montré : {decoyPlayer.name}.
        </p>
      )}
    </div>
  )
}

export function PreparationScreen() {
  const game = useGameStore((s) => s.game)
  const setPreparation = useGameStore((s) => s.setPreparation)
  const setPhase = useGameStore((s) => s.setPhase)
  const applyNightlyReminder = useGameStore((s) => s.applyNightlyReminder)

  if (!game) return null

  const inPlayIds = game.composition?.characterIds ?? []
  const inPlay = (id: string) => game.players.some((p) => p.realCharacterId === id)

  const needsWasherwoman = inPlay('washerwoman')
  const needsLibrarian = inPlay('librarian')
  const needsInvestigator = inPlay('investigator')
  const needsFortuneTeller = inPlay('fortune-teller')
  const needsDrunk = inPlay('drunk')
  const needsLunatic = inPlay('lunatic')
  const needsGrandmother = inPlay('grandmother')
  const demon = game.players
    .map((player) => ({ player, character: player.realCharacterId ? getCharactersForScript(game.scriptId).find((c) => c.id === player.realCharacterId) : undefined }))
    .find(({ character }) => character?.category === 'demon')?.character
  const needsDemonBluffs = !!demon

  const scriptCharacters = getCharactersForScript(game.scriptId)
  const absentTownsfolk = scriptCharacters.filter(
    (c) => c.category === 'townsfolk' && !inPlayIds.includes(c.id),
  )
  const absentForBluffs = scriptCharacters.filter(
    (c) =>
      (c.category === 'townsfolk' || (c.category === 'outsider' && game.players.some((player) => {
        const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : undefined
        return character?.category === 'outsider'
      }))) &&
      !inPlayIds.includes(c.id) &&
      c.id !== game.preparation.drunkBelievedCharacterId,
  )
  const goodPlayers = game.players.filter((p) => p.alignment === 'good')
  const demonChoices = scriptCharacters.filter((character) => character.category === 'demon')
  const lunaticPlayer = game.players.find((player) => player.realCharacterId === 'lunatic')
  const lunaticMinionSlots = game.composition?.effectiveCounts.minion ?? 0
  const lunaticMinionPlayerIds = game.preparation.lunaticMinionPlayerIds ?? []
  const lunaticBluffCharacterIds = game.preparation.lunaticBluffCharacterIds ?? []

  const ready =
    (!needsWasherwoman || !!game.preparation.washerwoman) &&
    (!needsLibrarian || !!game.preparation.librarian) &&
    (!needsInvestigator || !!game.preparation.investigator) &&
    (!needsFortuneTeller || !!game.preparation.fortuneTellerRedHerringPlayerId) &&
    (!needsDrunk || !!game.preparation.drunkBelievedCharacterId) &&
    (!needsLunatic || !!game.preparation.lunaticBelievedDemonId) &&
    (!needsLunatic || lunaticMinionPlayerIds.length === lunaticMinionSlots) &&
    (!needsLunatic || lunaticBluffCharacterIds.length === 3) &&
    (!needsDemonBluffs || game.preparation.impBluffCharacterIds.length === 3) &&
    (!needsGrandmother || !!game.preparation.grandmotherRevealPlayerId)

  function handleNext() {
    if (!ready) return
    setPhase('setup.seating')
  }

  return (
    <Screen
      title="Préparation de la partie"
      subtitle="Renseignez ce que le Conteur doit savoir avant la première nuit — l'assistant de nuit s'appuiera dessus."
      onBack={() => setPhase('setup.assignment')}
      footer={
        <Button variant="primary" disabled={!ready} onClick={handleNext}>
          Passer à la disposition des sièges
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <section className="bg-surface-1 border border-accent/30 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-accent">Composition retenue</p>
          <h2 className="text-lg font-semibold mt-1">Rôles et détenteurs</h2>
          <p className="text-xs text-ink-2 mt-1">Vue privée du MJ — utile pour préparer les informations de la première nuit.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {[...game.players].sort((a, b) => a.seat - b.seat).map((player) => {
              const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : undefined
              return <div key={player.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${character?.team === 'evil' ? 'border-evil/40 bg-evil-bg/40' : 'border-good/40 bg-good-bg/40'}`}>
                <RoleIcon characterId={character?.id} nameFr={character?.nameFr} size={32} />
                <div className="min-w-0"><p className="text-sm font-medium truncate">{player.name}</p><p className="text-xs text-ink-2 truncate">{character?.nameFr ?? 'Rôle non attribué'}</p></div>
              </div>
            })}
          </div>
        </section>
        {needsWasherwoman && (
          <InfoPairField
            game={game}
            label="Lavandière"
            categoryLabel="Villageois"
            category="townsfolk"
            excludeCharacterId="washerwoman"
            value={game.preparation.washerwoman}
            onChange={(v) => setPreparation({ washerwoman: v })}
          />
        )}
        {needsLibrarian && (
          <InfoPairField
            game={game}
            label="Libraire"
            categoryLabel="Paria"
            category="outsider"
            excludeCharacterId="librarian"
            value={game.preparation.librarian}
            onChange={(v) => setPreparation({ librarian: v })}
          />
        )}
        {needsInvestigator && (
          <InfoPairField
            game={game}
            label="Enquêteur"
            categoryLabel="Sbire"
            category="minion"
            excludeCharacterId="investigator"
            value={game.preparation.investigator}
            onChange={(v) => setPreparation({ investigator: v })}
          />
        )}

        {needsFortuneTeller && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Voyante — leurre</h3>
            <p className="text-xs text-ink-2 mb-2">
              Un joueur bon qui déclenchera toujours une réponse positive, pour toute la partie.
            </p>
            <select
              value={game.preparation.fortuneTellerRedHerringPlayerId ?? ''}
              onChange={(e) => {
                setPreparation({ fortuneTellerRedHerringPlayerId: e.target.value || null })
                // Pose (ou retire) un rappel visible en permanence sur le grimoire, pour ne
                // jamais oublier le leurre en cours de partie — pas seulement dans l'étape de nuit.
                applyNightlyReminder('fortune-teller', 'Leurre (Voyante)', e.target.value)
              }}
              className="w-full bg-surface-2 border border-border rounded px-2 py-2"
            >
              <option value="">— Choisir —</option>
              {goodPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsGrandmother && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Grand-mère — joueur montré</h3>
            <p className="text-xs text-ink-2 mb-2">
              Un joueur gentil (hors Grand-mère) dont le rôle lui sera montré la première nuit. Si le
              Démon le tue plus tard, la Grand-mère meurt aussi — l'appli surveille ce lien pour vous.
            </p>
            <select
              value={game.preparation.grandmotherRevealPlayerId ?? ''}
              onChange={(e) => {
                setPreparation({ grandmotherRevealPlayerId: e.target.value || null })
                applyNightlyReminder('grandmother', 'Lien (Grand-mère)', e.target.value)
              }}
              className="w-full bg-surface-2 border border-border rounded px-2 py-2"
            >
              <option value="">— Choisir —</option>
              {goodPlayers
                .filter((p) => p.realCharacterId !== 'grandmother')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {needsDrunk && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Ivrogne — personnage cru</h3>
            <p className="text-xs text-ink-2 mb-2">
              Un Villageois absent de cette partie, que l'Ivrogne croira posséder.
            </p>
            <select
              value={game.preparation.drunkBelievedCharacterId ?? ''}
              onChange={(e) => setPreparation({ drunkBelievedCharacterId: e.target.value || null })}
              className="w-full bg-surface-2 border border-border rounded px-2 py-2"
            >
              <option value="">— Choisir —</option>
              {absentTownsfolk.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameFr}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsLunatic && (
          <div className="bg-warn/10 border border-warn/40 rounded-lg p-4">
            <h3 className="font-medium mb-2">Lunatique — Démon cru</h3>
            <p className="text-xs text-ink-2 mb-2">
              Le Lunatique doit recevoir un jeton de Démon à la révélation, jamais son vrai jeton de Lunatique.
              Définissez ensuite la fausse équipe et les bluffs qu'il recevra à la première nuit.
            </p>
            <select
              value={game.preparation.lunaticBelievedDemonId ?? ''}
              onChange={(e) => setPreparation({ lunaticBelievedDemonId: e.target.value || null })}
              className="w-full bg-surface-2 border border-border rounded px-2 py-2"
            >
              <option value="">— Choisir un Démon —</option>
              {demonChoices.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.nameFr}
                </option>
              ))}
            </select>
            <div className="mt-4">
              <p className="text-xs text-ink-2 mb-2">
                Faux Sbires à lui montrer ({lunaticMinionSlots}) — les joueurs indiqués ne voient rien à ce moment-là.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: lunaticMinionSlots }, (_, slot) => {
                  const currentId = lunaticMinionPlayerIds[slot] ?? ''
                  const options = game.players.filter((player) =>
                    player.id !== lunaticPlayer?.id &&
                    (player.id === currentId || !lunaticMinionPlayerIds.includes(player.id)),
                  )
                  return (
                    <select
                      key={slot}
                      value={currentId}
                      onChange={(e) => {
                        const next = [...lunaticMinionPlayerIds]
                        if (e.target.value) next[slot] = e.target.value
                        else next.splice(slot, 1)
                        setPreparation({ lunaticMinionPlayerIds: next.filter(Boolean) })
                      }}
                      className="bg-surface-2 border border-border rounded px-2 py-2"
                    >
                      <option value="">— Faux Sbire {slot + 1} —</option>
                      {options.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                    </select>
                  )
                })}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-ink-2 mb-2">Les 3 bluffs à montrer au Lunatique</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => {
                  const currentId = lunaticBluffCharacterIds[slot] ?? ''
                  const options = absentForBluffs.filter(
                    (character) => character.id === currentId || !lunaticBluffCharacterIds.includes(character.id),
                  )
                  return (
                    <select
                      key={slot}
                      value={currentId}
                      onChange={(e) => {
                        const next = [...lunaticBluffCharacterIds]
                        if (e.target.value) next[slot] = e.target.value
                        else next.splice(slot, 1)
                        setPreparation({ lunaticBluffCharacterIds: next.filter(Boolean) })
                      }}
                      className="bg-surface-2 border border-border rounded px-2 py-2"
                    >
                      <option value="">— Bluff {slot + 1} —</option>
                      {options.map((character) => <option key={character.id} value={character.id}>{character.nameFr}</option>)}
                    </select>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {needsDemonBluffs && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">{demon?.nameFr ?? 'Démon'} — 3 bluffs</h3>
            <p className="text-xs text-ink-2 mb-2">
              Trois personnages absents (Villageois ou Paria) donnés au {demon?.nameFr ?? 'Démon'} comme bluffs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[0, 1, 2].map((slot) => {
                const currentId = game.preparation.impBluffCharacterIds[slot] ?? ''
                const options = absentForBluffs.filter(
                  (c) => c.id === currentId || !game.preparation.impBluffCharacterIds.includes(c.id),
                )
                return (
                  <select
                    key={slot}
                    value={currentId}
                    onChange={(e) => {
                      const next = [...game.preparation.impBluffCharacterIds]
                      if (e.target.value) next[slot] = e.target.value
                      else next.splice(slot, 1)
                      setPreparation({ impBluffCharacterIds: next.filter(Boolean) })
                    }}
                    className="bg-surface-2 border border-border rounded px-2 py-2"
                  >
                    <option value="">— Bluff {slot + 1} —</option>
                    {options.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameFr}
                      </option>
                    ))}
                  </select>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Screen>
  )
}
