import { useEffect } from 'react'
import { useGameStore } from '@/store'
import { getCharactersForScript } from '@/data'
import type { CharacterCategory, Game, InfoPairPreparation } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'

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
      (c.category === 'townsfolk' || c.category === 'outsider') &&
      !inPlayIds.includes(c.id) &&
      c.id !== game.preparation.drunkBelievedCharacterId,
  )
  const goodPlayers = game.players.filter((p) => p.alignment === 'good')

  const ready =
    (!needsWasherwoman || !!game.preparation.washerwoman) &&
    (!needsLibrarian || !!game.preparation.librarian) &&
    (!needsInvestigator || !!game.preparation.investigator) &&
    (!needsFortuneTeller || !!game.preparation.fortuneTellerRedHerringPlayerId) &&
    (!needsDrunk || !!game.preparation.drunkBelievedCharacterId) &&
    (!needsDemonBluffs || game.preparation.impBluffCharacterIds.length === 3)

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

        {needsDemonBluffs && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Diablotin — 3 bluffs</h3>
            <p className="text-xs text-ink-2 mb-2">
              Trois personnages absents (Villageois ou Paria) donnés au Diablotin comme bluffs.
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
