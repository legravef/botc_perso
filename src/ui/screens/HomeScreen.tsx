import { useRef, useState, type ChangeEvent } from 'react'
import { useGameStore } from '@/store'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import { Button } from '../components/Button'

interface HomeScreenProps {
  onOpenCharacterReference: () => void
}

const HOME_STARS = [
  { top: 8, left: 6 },
  { top: 15, left: 22 },
  { top: 6, left: 38 },
  { top: 20, left: 52 },
  { top: 10, left: 68 },
  { top: 18, left: 84 },
  { top: 28, left: 12 },
  { top: 32, left: 92 },
  { top: 6, left: 95 },
]

/** Halo lumineux placé derrière le logo officiel pour l'intégrer à l'ambiance violette de
 * l'app plutôt que de le poser tel quel sur fond uni. */
function LogoGlow() {
  return (
    <div
      className="absolute inset-[-30px] rounded-full bg-accent/30 blur-3xl motion-safe:animate-[emblem-glow_5s_ease-in-out_infinite]"
      aria-hidden="true"
    />
  )
}

export function HomeScreen({ onOpenCharacterReference }: HomeScreenProps) {
  const createGame = useGameStore((s) => s.createGame)
  const savedGames = useGameStore((s) => s.savedGames)
  const loadGame = useGameStore((s) => s.loadGame)
  const deleteGame = useGameStore((s) => s.deleteGame)
  const importGame = useGameStore((s) => s.importGame)

  const [showSaves, setShowSaves] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sorted = [...savedGames].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const mostRecent = sorted[0]

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      importGame(text)
      setImportError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Échec de l'import.")
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface-0 text-ink-0 px-6 py-10 gap-8">
      {/* Fond ambiant : légère brume violette + étoiles discrètes, purement décoratif */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 50% 8%, rgba(177,138,255,0.16), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {HOME_STARS.map((star, i) => (
          <span
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-white/70 motion-safe:animate-[twinkle_3s_ease-in-out_infinite]"
            style={{ top: `${star.top}%`, left: `${star.left}%`, animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <div className="relative w-40 h-40 mx-auto">
          <LogoGlow />
          <img
            src={logoTroubleBrewing}
            alt="Blood on the Clocktower — Trouble Brewing"
            className="relative w-40 h-40 object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
          />
        </div>
        <h1
          className="text-3xl font-semibold mt-3 mb-1 tracking-wide"
          style={{
            backgroundImage: 'linear-gradient(180deg, #f3e3ad, #d8b866)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Assistant Conteur
        </h1>
        <p className="text-ink-2 text-sm uppercase tracking-[0.2em]">Blood on the Clocktower</p>
        <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
          <span className="h-px w-14 bg-gradient-to-r from-transparent to-accent/60" />
          <span className="w-1.5 h-1.5 rotate-45 bg-accent/80" />
          <span className="h-px w-14 bg-gradient-to-l from-transparent to-accent/60" />
        </div>
      </div>

      <div className="relative flex flex-col gap-3 w-full max-w-sm">
        <Button variant="primary" onClick={createGame}>
          Nouvelle partie
        </Button>

        <Button variant="secondary" disabled={!mostRecent} onClick={() => mostRecent && loadGame(mostRecent.id)}>
          {mostRecent ? `Reprendre : ${mostRecent.label}` : 'Reprendre une partie'}
        </Button>

        <Button variant="secondary" onClick={() => setShowSaves((v) => !v)} disabled={sorted.length === 0}>
          Charger une sauvegarde ({sorted.length})
        </Button>

        {showSaves && (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {sorted.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <button className="text-left flex-1 text-sm hover:text-accent" onClick={() => loadGame(entry.id)}>
                  {entry.label}
                </button>
                <button className="text-xs text-danger px-2 py-1 hover:underline" onClick={() => deleteGame(entry.id)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <Button variant="secondary" onClick={handleImportClick}>
          Importer une partie (JSON)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        {importError && <p className="text-sm text-danger">{importError}</p>}

        <Button variant="secondary" onClick={onOpenCharacterReference}>
          Consulter les personnages
        </Button>

        <Button variant="ghost" disabled title="Disponible dans une prochaine version">
          Mode entraînement du Conteur
        </Button>
      </div>

      <p className="text-xs text-ink-2 max-w-md text-center">
        Outil communautaire non officiel, non affilié à The Pandemonium Institute ni à l'éditeur du jeu.
      </p>
    </div>
  )
}
