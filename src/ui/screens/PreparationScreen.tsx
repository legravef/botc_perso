import { useEffect } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById, getCharactersForScript } from '@/data'
import { toggleCapped } from '@/lib/selection'
import type { CharacterCategory, Game, InfoPairPreparation } from '@/types'
import { Screen } from '../components/Screen'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { PlayerChoiceGrid } from '../components/PlayerChoiceGrid'
import { CharacterChoiceGrid } from '../components/CharacterChoiceGrid'

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
        <label className="block text-xs text-ink-2 mb-2">{categoryLabel} montré</label>
        <CharacterChoiceGrid
          characters={candidates}
          selectedIds={current ? [current.characterId] : []}
          onSelect={(characterId) => {
            const holder = game.players.find((p) => p.realCharacterId === characterId)
            if (!holder) return
            onChange({ characterId, playerAId: holder.id, playerBId: current?.playerBId ?? '' })
          }}
        />
      </div>
      {current && (
        <div>
          <label className="block text-xs text-ink-2 mb-2">Second joueur montré (leurre)</label>
          <PlayerChoiceGrid
            players={game.players.filter((p) => p.id !== current.playerAId && p.id !== askerPlayer?.id)}
            selectedIds={current.playerBId ? [current.playerBId] : []}
            onSelect={(playerId) => onChange({ ...current, playerBId: playerId })}
          />
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
  // Dans Trouble Brewing, les « Demon info » (identité des Sbires et trois
  // bluffs) ne sont données qu'à partir de 7 joueurs. À 5 ou 6, la partie
  // suit les règles Teensyville.
  const isSupportedTeensyville = ['trouble-brewing', 'no-greater-joy'].includes(game.scriptId) && game.players.length <= 6
  const needsDemonBluffs = !!demon && !isSupportedTeensyville

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
            <PlayerChoiceGrid
              players={goodPlayers}
              selectedIds={game.preparation.fortuneTellerRedHerringPlayerId ? [game.preparation.fortuneTellerRedHerringPlayerId] : []}
              onSelect={(playerId) => {
                setPreparation({ fortuneTellerRedHerringPlayerId: playerId })
                // Pose (ou retire) un rappel visible en permanence sur le grimoire, pour ne
                // jamais oublier le leurre en cours de partie — pas seulement dans l'étape de nuit.
                applyNightlyReminder('fortune-teller', 'Leurre de la Voyante', playerId)
              }}
            />
          </div>
        )}

        {needsGrandmother && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Grand-mère — joueur montré</h3>
            <p className="text-xs text-ink-2 mb-2">
              Un joueur gentil (hors Grand-mère) dont le rôle lui sera montré la première nuit. Si le
              Démon le tue plus tard, la Grand-mère meurt aussi — l'appli surveille ce lien pour vous.
            </p>
            <PlayerChoiceGrid
              players={goodPlayers.filter((p) => p.realCharacterId !== 'grandmother')}
              selectedIds={game.preparation.grandmotherRevealPlayerId ? [game.preparation.grandmotherRevealPlayerId] : []}
              onSelect={(playerId) => {
                setPreparation({ grandmotherRevealPlayerId: playerId })
                applyNightlyReminder('grandmother', 'Lien (Grand-mère)', playerId)
              }}
            />
          </div>
        )}

        {needsDrunk && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">Ivrogne — personnage cru</h3>
            <p className="text-xs text-ink-2 mb-2">
              Un Villageois absent de cette partie, que l'Ivrogne croira posséder.
            </p>
            <CharacterChoiceGrid
              characters={absentTownsfolk}
              selectedIds={game.preparation.drunkBelievedCharacterId ? [game.preparation.drunkBelievedCharacterId] : []}
              onSelect={(characterId) => setPreparation({ drunkBelievedCharacterId: characterId })}
            />
          </div>
        )}

        {needsLunatic && (
          <div className="bg-warn/10 border border-warn/40 rounded-lg p-4">
            <h3 className="font-medium mb-2">Lunatique — Démon cru</h3>
            <p className="text-xs text-ink-2 mb-2">
              Le Lunatique doit recevoir un jeton de Démon à la révélation, jamais son vrai jeton de Lunatique.
              Définissez ensuite la fausse équipe et les bluffs qu'il recevra à la première nuit.
            </p>
            <CharacterChoiceGrid
              characters={demonChoices}
              selectedIds={game.preparation.lunaticBelievedDemonId ? [game.preparation.lunaticBelievedDemonId] : []}
              onSelect={(characterId) => setPreparation({ lunaticBelievedDemonId: characterId })}
            />
            <div className="mt-4">
              <p className="text-xs text-ink-2 mb-2">
                Faux Sbires à lui montrer ({lunaticMinionPlayerIds.length}/{lunaticMinionSlots}) — les joueurs indiqués ne voient rien à ce moment-là.
              </p>
              <PlayerChoiceGrid
                players={game.players.filter((player) => player.id !== lunaticPlayer?.id)}
                selectedIds={lunaticMinionPlayerIds}
                onSelect={(playerId) => setPreparation({ lunaticMinionPlayerIds: toggleCapped(lunaticMinionPlayerIds, playerId, lunaticMinionSlots) })}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs text-ink-2 mb-2">Les 3 bluffs à montrer au Lunatique ({lunaticBluffCharacterIds.length}/3)</p>
              <CharacterChoiceGrid
                characters={absentForBluffs}
                selectedIds={lunaticBluffCharacterIds}
                onSelect={(characterId) => setPreparation({ lunaticBluffCharacterIds: toggleCapped(lunaticBluffCharacterIds, characterId, 3) })}
              />
            </div>
          </div>
        )}

        {needsDemonBluffs && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="font-medium mb-2">{demon?.nameFr ?? 'Démon'} — 3 bluffs ({game.preparation.impBluffCharacterIds.length}/3)</h3>
            <p className="text-xs text-ink-2 mb-2">
              Trois personnages absents (Villageois ou Paria) donnés au {demon?.nameFr ?? 'Démon'} comme bluffs.
            </p>
            <CharacterChoiceGrid
              characters={absentForBluffs}
              selectedIds={game.preparation.impBluffCharacterIds}
              onSelect={(characterId) => setPreparation({ impBluffCharacterIds: toggleCapped(game.preparation.impBluffCharacterIds, characterId, 3) })}
            />
          </div>
        )}
      </div>
    </Screen>
  )
}
