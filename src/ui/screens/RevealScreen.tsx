import { useEffect, useState } from 'react'
import { useGameStore } from '@/store'
import { getCharacterById } from '@/data'
import { buildRoleShareUrl } from '@/lib/roleShare'
import { Button } from '../components/Button'
import { RoleIcon } from '../components/RoleIcon'
import { SkyBanner } from '../components/SkyBanner'

type Stage = 'neutral' | 'confirm' | 'revealed'

const TEAM_LABEL: Record<'good' | 'evil', string> = { good: 'Bien', evil: 'Mal' }

export function RevealScreen() {
  const game = useGameStore((s) => s.game)
  const setPhase = useGameStore((s) => s.setPhase)
  const [stage, setStage] = useState<Stage>('neutral')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  function hide() {
    setStage('neutral')
    setSelectedPlayerId(null)
    setQrUrl(null)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault()
        hide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!game) return null

  const players = [...game.players].sort((a, b) => a.seat - b.seat)
  const selectedPlayer = selectedPlayerId ? players.find((p) => p.id === selectedPlayerId) : undefined
  const fallbackLunaticDemonId = players.find((player) => {
    const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : undefined
    return character?.category === 'demon'
  })?.realCharacterId
  const displayedCharacterId = selectedPlayer
    ? (selectedPlayer.perceivedCharacterId
      ?? (selectedPlayer.realCharacterId === 'lunatic'
        ? (game.preparation.lunaticBelievedDemonId ?? fallbackLunaticDemonId)
        : selectedPlayer.realCharacterId))
    : null
  const displayedCharacter = displayedCharacterId ? getCharacterById(game.scriptId, displayedCharacterId) : null

  async function handleShowQr() {
    if (!selectedPlayer || !displayedCharacter) return
    const url = buildRoleShareUrl({
      playerName: selectedPlayer.name,
      characterId: displayedCharacter.id,
      characterNameFr: displayedCharacter.nameFr,
      team: displayedCharacter.team,
      description: displayedCharacter.fullDescription,
    })
    const QRCode = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240 })
    setQrUrl(dataUrl)
  }

  function handleUnderstood() {
    if (selectedPlayerId) setRevealedIds((prev) => new Set(prev).add(selectedPlayerId))
    hide()
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-ink-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold">Révélation des rôles</h1>
          <p className="text-xs text-ink-2">
            Faites passer l'appareil à chaque joueur, un par un — espace ou échap masque immédiatement.
          </p>
        </div>
        <Button variant="ghost" onClick={hide}>
          Masquer immédiatement
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        {stage === 'neutral' && (
          <div className="max-w-2xl w-full flex flex-col gap-6">
            <SkyBanner variant="night" className="h-40 w-full" />
            <div>
              <p className="text-center text-ink-2 mb-1">
                {revealedIds.size} / {players.length} joueurs ont déjà vu leur rôle
              </p>
              <p className="text-center text-ink-0 text-lg mb-6">Sélectionnez le prochain joueur.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayerId(p.id)
                      setStage('confirm')
                    }}
                    className={`min-h-20 rounded-xl border px-4 py-4 text-center transition hover:brightness-125 active:scale-[0.98] ${
                      revealedIds.has(p.id) ? 'border-success bg-surface-2' : 'border-border bg-surface-1'
                    }`}
                  >
                    <div className="font-medium text-lg">{p.name}</div>
                    {revealedIds.has(p.id) && <div className="text-[10px] text-success mt-1">✓ a vu son rôle</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === 'confirm' && selectedPlayer && (
          <div className="max-w-md w-full bg-surface-1 border border-border rounded-2xl p-8 text-center flex flex-col gap-5">
            <p className="text-lg">
              Assurez-vous que seul(e) <span className="font-semibold">{selectedPlayer.name}</span> regarde
              l'écran.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={hide}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => setStage('revealed')}>
                Révéler mon personnage
              </Button>
            </div>
          </div>
        )}

        {stage === 'revealed' && selectedPlayer && displayedCharacter && (
          <div className="max-w-md w-full bg-surface-1 border border-border rounded-2xl p-8 text-center flex flex-col gap-4">
            <p className="text-sm text-ink-2">{selectedPlayer.name}, vous êtes :</p>
            <RoleIcon
              characterId={displayedCharacter.id}
              nameFr={displayedCharacter.nameFr}
              size={96}
              className="self-center"
            />
            <h2 className="text-3xl font-semibold">{displayedCharacter.nameFr}</h2>
            <span
              className={`self-center text-xs px-3 py-1 rounded-full ${
                displayedCharacter.team === 'evil' ? 'bg-evil-bg text-evil' : 'bg-good-bg text-good'
              }`}
            >
              Équipe : {TEAM_LABEL[displayedCharacter.team]}
            </span>
            <p className="text-base text-ink-1">{displayedCharacter.shortDescription}</p>

            {qrUrl ? (
              <img src={qrUrl} alt="QR code du rôle" className="self-center rounded-lg bg-white p-2" />
            ) : (
              <Button variant="ghost" onClick={() => void handleShowQr()}>
                Afficher un QR code (à scanner sur son propre téléphone, même réseau)
              </Button>
            )}

            <Button variant="primary" onClick={handleUnderstood}>
              J'ai compris
            </Button>
          </div>
        )}
      </main>

      <footer className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border flex justify-end">
        <Button variant="primary" onClick={() => setPhase('night.first')}>
          Tous les joueurs ont vu leur rôle — commencer la première nuit
        </Button>
      </footer>
    </div>
  )
}
