import type { Player } from '@/types'

export interface Position {
  x: number
  y: number
}

/** Joueurs triés dans l'ordre réel du cercle (par siège croissant). */
export function getSeatOrder(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.seat - b.seat)
}

export interface Neighbors<T> {
  left: T
  right: T
}

/**
 * Voisins immédiats d'un joueur autour du cercle, qu'ils soient vivants ou
 * morts. Le premier et le dernier siège sont voisins l'un de l'autre.
 */
export function getNeighbors(players: Player[], playerId: string): Neighbors<Player> | null {
  const ordered = getSeatOrder(players)
  const index = ordered.findIndex((p) => p.id === playerId)
  if (index === -1 || ordered.length < 2) return null
  const left = ordered[(index - 1 + ordered.length) % ordered.length] as Player
  const right = ordered[(index + 1) % ordered.length] as Player
  return { left, right }
}

/**
 * Voisins VIVANTS les plus proches d'un joueur, en sautant les morts,
 * utilisés notamment par l'Empathique. Retourne null pour un côté si tous les
 * autres joueurs sont morts.
 */
export function getLivingNeighbors(players: Player[], playerId: string): Neighbors<Player | null> {
  const ordered = getSeatOrder(players)
  const index = ordered.findIndex((p) => p.id === playerId)
  if (index === -1 || ordered.length < 2) return { left: null, right: null }

  const findInDirection = (step: 1 | -1): Player | null => {
    let cursor = index
    for (let steps = 0; steps < ordered.length - 1; steps++) {
      cursor = (cursor + step + ordered.length) % ordered.length
      const candidate = ordered[cursor] as Player
      if (candidate.alive) return candidate
    }
    return null
  }

  return { left: findInDirection(-1), right: findInDirection(1) }
}

/**
 * Nombre de paires de joueurs adjacents considérés comme méchants, en tenant
 * compte du cercle (le premier et le dernier joueur sont voisins).
 *
 * `appearanceOverrides` permet au Conteur de trancher, pour ce calcul
 * précis, l'apparence d'un Espion (peut compter comme bon) ou d'un Reclus
 * (peut compter comme méchant) — voir Character.specialRules pour ces deux
 * personnages. Sans override, l'alignement réel du joueur est utilisé.
 */
export function countAdjacentEvilPairs(
  players: Player[],
  appearanceOverrides: Record<string, boolean> = {},
): number {
  const ordered = getSeatOrder(players)
  if (ordered.length < 2) return 0

  const isEvil = (p: Player) => appearanceOverrides[p.id] ?? p.alignment === 'evil'

  let pairs = 0
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i] as Player
    const next = ordered[(i + 1) % ordered.length] as Player
    if (isEvil(current) && isEvil(next)) pairs += 1
  }
  return pairs
}

/**
 * Position par défaut (avant tout déplacement manuel) : deux colonnes face à
 * face plutôt qu'un cercle. En pratique, l'installation réelle autour d'une
 * table (rectangulaire) ressemble bien plus souvent à deux rangées de
 * joueurs de part et d'autre de la table, chacune s'étendant en longueur,
 * qu'à un cercle parfait — partir de ce point de départ évite au Conteur
 * d'avoir à repositionner chaque siège à la main après la composition. La
 * première moitié des sièges forme la colonne de gauche (de haut en bas),
 * la seconde moitié la colonne de droite (de bas en haut), de sorte que le
 * parcours 0→1→2→...→n-1→0 trace bien le pourtour de la table (les deux
 * extrémités des colonnes se rejoignent), exactement comme des voisins
 * assis en face-à-face de chaque côté de la table.
 */
export function getDefaultPosition(seat: number, totalCount: number): Position {
  const leftColumnSize = Math.ceil(totalCount / 2)
  const isLeftColumn = seat < leftColumnSize
  const columnSize = isLeftColumn ? leftColumnSize : totalCount - leftColumnSize
  const indexInColumn = isLeftColumn ? seat : seat - leftColumnSize
  const t = columnSize <= 1 ? 0.5 : indexInColumn / (columnSize - 1)
  const y = isLeftColumn ? -1 + 2 * t : 1 - 2 * t
  const x = isLeftColumn ? -0.55 : 0.55
  return { x, y }
}

/**
 * Position effective d'un joueur sur le grimoire : sa position librement
 * déplacée (mapX/mapY) si le Conteur l'a déjà déplacé, sinon une position
 * par défaut en deux rangées face à face (voir getDefaultPosition). Les
 * coordonnées sont en unités relatives à un rayon de 1, centrées sur
 * l'origine — indépendantes de toute taille d'écran.
 */
export function getEffectivePosition(
  player: Pick<Player, 'seat' | 'mapX' | 'mapY'>,
  totalCount: number,
): Position {
  if (player.mapX !== null && player.mapY !== null) {
    return { x: player.mapX, y: player.mapY }
  }
  return getDefaultPosition(player.seat, totalCount)
}

/**
 * Recalcule l'ordre logique des sièges (utilisé pour les voisins, le Chef,
 * l'Empathique...) à partir des positions réelles des joueurs sur la carte,
 * en les triant par angle autour de leur centre commun. Permet une
 * disposition librement dessinée (ovale, deux rangées face à face, etc.)
 * tout en gardant une notion de "voisin" cohérente avec la réalité — une
 * simple rotation du point de départ ne change jamais qui est adjacent à
 * qui, seule la disposition est modifiée.
 */
export function recomputeSeatOrderFromPositions(players: Player[]): Player[] {
  const total = players.length
  if (total === 0) return players

  const withPosition = players.map((p) => ({ player: p, position: getEffectivePosition(p, total) }))
  const centroidX = withPosition.reduce((sum, e) => sum + e.position.x, 0) / total
  const centroidY = withPosition.reduce((sum, e) => sum + e.position.y, 0) / total

  const sorted = [...withPosition].sort((a, b) => {
    const angleA = Math.atan2(a.position.y - centroidY, a.position.x - centroidX)
    const angleB = Math.atan2(b.position.y - centroidY, b.position.x - centroidX)
    return angleA - angleB
  })

  return sorted.map((entry, index) => ({ ...entry.player, seat: index }))
}
