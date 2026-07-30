/**
 * Encodage/décodage du payload de révélation de rôle partagé par QR code.
 *
 * Le payload est entièrement autoporté (nom, personnage, équipe, description)
 * et encodé dans le fragment d'URL (#/role/<base64>) : aucune requête réseau
 * n'est nécessaire pour l'afficher, seule l'application statique doit être
 * accessible (même origine que l'appareil du Conteur, par ex. via le réseau
 * local). Cela reste conforme à l'absence de backend : pas de logique
 * serveur, uniquement des fichiers statiques déjà chargés par le navigateur.
 */
export interface RolePayload {
  playerName: string
  characterId: string
  characterNameFr: string
  team: 'good' | 'evil'
  description: string
}

const ROUTE_PREFIX = '#/role/'

export function buildRoleShareUrl(payload: RolePayload): string {
  const json = JSON.stringify(payload)
  const encoded = btoa(unescape(encodeURIComponent(json)))
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}${ROUTE_PREFIX}${encoded}`
}

export function isRoleShareHash(hash: string): boolean {
  return hash.startsWith(ROUTE_PREFIX)
}

export function decodeRoleShareHash(hash: string): RolePayload | null {
  if (!isRoleShareHash(hash)) return null
  const encoded = hash.slice(ROUTE_PREFIX.length)
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    const parsed = JSON.parse(json) as Partial<RolePayload>
    if (!parsed.playerName || !parsed.characterId || !parsed.characterNameFr || !parsed.team || !parsed.description)
      return null
    return parsed as RolePayload
  } catch {
    return null
  }
}
