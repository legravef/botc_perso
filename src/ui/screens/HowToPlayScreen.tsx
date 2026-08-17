import { useState } from 'react'
import type { ScriptId } from '@/types'
import { Button } from '../components/Button'
import { getScriptName } from '../scriptPresentation'

/**
 * Fiches imprimables servies telles quelles depuis public/guides/. `image` est la version
 * affichée à l'écran (consultable au doigt sur mobile), `download` le fichier haute qualité
 * proposé au téléchargement pour impression. Ajouter une fiche de scénario = déposer les deux
 * fichiers dans public/guides/ puis ajouter une entrée ici.
 */
interface Sheet {
  id: string
  title: string
  description: string
  image: string
  /** Fichier proposé au téléchargement. Par défaut l'image elle-même, déjà en qualité impression. */
  download?: string
}

/** Préfixe de déploiement (l'app est publiée sous un sous-chemin, cf. vite.config.ts). */
const BASE = import.meta.env.BASE_URL

const PLAYER_GUIDE: Sheet = {
  id: 'regles-joueurs',
  title: 'Règles pour les joueurs',
  description:
    'Tout ce qu’un joueur doit savoir : le déroulé d’une partie, les gestes du Conteur pendant la nuit, les nominations et le vote, et comment utiliser l’app sans casser le secret.',
  image: `${BASE}guides/regles-joueurs.png`,
  download: `${BASE}guides/assistant-conteur-guide-joueurs.pdf`,
}

/**
 * Planche des rôles de chaque scénario, à poser sur la table pour que les joueurs puissent
 * consulter les pouvoirs en jeu. Ajouter un scénario = déposer l'image dans public/guides/ puis
 * ajouter son entrée ici.
 */
const SCRIPT_SHEETS: Partial<Record<ScriptId, Sheet>> = {
  'trouble-brewing': {
    id: 'trouble-brewing',
    title: 'Trouble Brewing',
    description: 'Les 22 rôles du scénario de découverte, classés par équipe : Villageois, Parias, Sbires et Démon.',
    image: `${BASE}guides/trouble-brewing.jpg`,
  },
  'no-greater-joy': {
    id: 'no-greater-joy',
    title: 'No Greater Joy',
    description: 'Teensyville 5-6 joueurs, par Steven Medway. Inclut le rappel des règles propres au format.',
    image: `${BASE}guides/no-greater-joy.png`,
  },
  'over-the-river': {
    id: 'over-the-river',
    title: 'Over the River',
    description: 'Teensyville 5-6 joueurs, par Andrew Nathenson. Inclut le rappel des règles propres au format.',
    image: `${BASE}guides/over-the-river.png`,
  },
  'bad-moon-rising': {
    id: 'bad-moon-rising',
    title: 'Bad Moon Rising',
    description: 'Les rôles du scénario des morts et résurrections, avec ses quatre Démons.',
    image: `${BASE}guides/bad-moon-rising.jpg`,
  },
}

const SCRIPT_IDS: ScriptId[] = ['trouble-brewing', 'no-greater-joy', 'over-the-river', 'bad-moon-rising']

export function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null)
  const availableScriptSheets = SCRIPT_IDS.map((id) => SCRIPT_SHEETS[id]).filter((sheet): sheet is Sheet => !!sheet)

  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-ink-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border gap-3">
        <h1 className="text-lg font-semibold">Comment jouer</h1>
        <Button variant="ghost" className="px-3 py-2" onClick={onBack}>
          Retour
        </Button>
      </header>

      <main className="flex-1 px-6 py-8 flex flex-col gap-8 max-w-3xl w-full mx-auto">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-[0.18em] text-accent">Guide des joueurs</h2>
          <SheetCard sheet={PLAYER_GUIDE} onOpen={() => setOpenSheet(PLAYER_GUIDE)} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-[0.18em] text-accent">Fiches par scénario</h2>
          {availableScriptSheets.length > 0 ? (
            availableScriptSheets.map((sheet) => (
              <SheetCard key={sheet.id} sheet={sheet} onOpen={() => setOpenSheet(sheet)} />
            ))
          ) : (
            <p className="text-sm text-ink-2 border border-dashed border-border rounded-xl px-4 py-6">
              Aucune fiche de scénario disponible pour l’instant. Les fiches{' '}
              {SCRIPT_IDS.map((id) => getScriptName(id)).join(', ')} apparaîtront ici dès qu’elles seront
              déposées dans <code className="text-ink-1">public/guides/</code>.
            </p>
          )}
        </section>
      </main>

      {openSheet && <SheetViewer sheet={openSheet} onClose={() => setOpenSheet(null)} />}
    </div>
  )
}

function SheetCard({ sheet, onOpen }: { sheet: Sheet; onOpen: () => void }) {
  const downloadUrl = sheet.download ?? sheet.image
  const isPdf = downloadUrl.endsWith('.pdf')
  return (
    <article className="border border-border rounded-2xl bg-surface-1 p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 self-start rounded-xl overflow-hidden border border-border hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={`Agrandir la fiche : ${sheet.title}`}
      >
        <img src={sheet.image} alt="" aria-hidden="true" className="w-28 h-36 object-cover object-top" />
      </button>
      <div className="flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold">{sheet.title}</h3>
          <p className="text-sm text-ink-2 mt-1">{sheet.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onOpen}>
            Consulter
          </Button>
          {/* Lien natif plutôt qu'un téléchargement piloté en JS : le navigateur gère seul
              l'enregistrement du PDF, et l'ouverture dans un onglet reste possible au clic long. */}
          <a
            href={downloadUrl}
            download={downloadUrl.split('/').pop()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-accent/60 bg-accent/10 px-4 py-2 text-sm font-medium text-ink-0 transition hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Télécharger / imprimer ({isPdf ? 'PDF' : 'image'})
          </a>
        </div>
      </div>
    </article>
  )
}

function SheetViewer({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-label={sheet.title}
    >
      <div className="sticky top-0 flex justify-between items-center gap-3 px-5 py-3 bg-surface-0/95 border-b border-border">
        <span className="text-sm font-medium">{sheet.title}</span>
        <Button variant="ghost" className="px-3 py-2" onClick={onClose}>
          Fermer
        </Button>
      </div>
      <div className="p-4 flex justify-center">
        <img src={sheet.image} alt={sheet.title} className="max-w-full h-auto rounded-lg shadow-2xl" />
      </div>
    </div>
  )
}
