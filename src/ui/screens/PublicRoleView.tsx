import { useState } from 'react'
import { decodeRoleShareHash } from '@/lib/roleShare'
import { RoleIcon } from '../components/RoleIcon'

const TEAM_LABEL: Record<'good' | 'evil', string> = { good: 'Bien', evil: 'Mal' }

/**
 * Vue autonome ouverte en scannant le QR code de révélation : ne dépend ni
 * du store ni d'une partie chargée, uniquement du contenu encodé dans
 * l'URL. Permet à un joueur de consulter son rôle sur son propre appareil.
 */
export function PublicRoleView() {
  const payload = decodeRoleShareHash(window.location.hash)
  const [acknowledged, setAcknowledged] = useState(false)

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0 text-ink-0 px-6">
        <p className="text-ink-2">Lien de révélation invalide ou expiré.</p>
      </div>
    )
  }

  if (acknowledged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0 text-ink-0 px-6">
        <p className="text-ink-2 text-center">Vous pouvez fermer cet onglet et rendre l'appareil au Conteur.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 text-ink-0 px-6">
      <div className="max-w-md w-full bg-surface-1 border border-border rounded-2xl p-8 text-center flex flex-col gap-4">
        <p className="text-sm text-ink-2">{payload.playerName}, vous êtes :</p>
        <RoleIcon characterId={payload.characterId} nameFr={payload.characterNameFr} size={96} className="self-center" />
        <h1 className="text-3xl font-semibold">{payload.characterNameFr}</h1>
        <span
          className={`self-center text-xs px-3 py-1 rounded-full ${
            payload.team === 'evil' ? 'bg-evil-bg text-evil' : 'bg-good-bg text-good'
          }`}
        >
          Équipe : {TEAM_LABEL[payload.team]}
        </span>
        <p className="text-base text-ink-1">{payload.description}</p>
        <button
          onClick={() => setAcknowledged(true)}
          className="mt-2 px-5 py-3 rounded-xl text-base font-medium bg-accent text-surface-0"
        >
          J'ai compris
        </button>
      </div>
    </div>
  )
}
