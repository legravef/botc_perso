import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { Player } from '@/types'
import { getEffectivePosition } from '@/engine'

interface SeatingLayoutProps {
  players: Player[]
  renderSeat: (player: Player, isDragging: boolean) => ReactNode
  size?: number
  /** Active le placement libre des sièges (glisser n'importe où sur la carte). */
  reorderable?: boolean
  /** Appelé au relâchement, avec les coordonnées libres (relatives au rayon, centrées sur 0). Purement informatif : ce composant ne touche jamais au store lui-même — au parent de décider s'il commit immédiatement ou accumule localement jusqu'à une validation explicite. */
  onDropPosition?: (playerId: string, mapX: number, mapY: number) => void
}

const TOKEN_HALF_WIDTH = 56

/**
 * Dispose les joueurs sur une carte libre plutôt qu'un cercle mathématique
 * strict : chaque siège peut être placé n'importe où (ovale, deux rangées
 * face à face, etc.) pour refléter fidèlement l'installation réelle autour
 * de la table. L'ordre logique (utilisé pour les voisins/pouvoirs) est
 * recalculé ailleurs (voir engine/circle.ts) à partir de ces positions ; ce
 * composant se contente d'afficher et de faire glisser librement.
 *
 * Le glisser conserve le point exact où le doigt/curseur a saisi le jeton
 * (offset de prise) plutôt que de re-centrer le jeton sous le pointeur dès
 * le premier mouvement : sans ça, un simple clic légèrement décentré fait
 * "sauter" le jeton, ce qui rend le geste désagréable et imprévisible.
 *
 * L'identité du jeton en cours de glisser est suivie via une ref (pas
 * seulement le state React `draggingId`) : un pointerdown suivi de très
 * près par un pointermove (geste rapide, typiquement au tactile) peut voir
 * le premier pointermove traiter encore l'ancien rendu si on ne compare
 * qu'au state — la ref, mutée de façon synchrone, élimine cette course et
 * le "parfois je n'arrive pas à déplacer le joueur" qui en résultait.
 */
export function SeatingLayout({
  players,
  renderSeat,
  size = 560,
  reorderable = false,
  onDropPosition,
}: SeatingLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ playerId: string; grabOffset: { x: number; y: number }; lastPixel: { x: number; y: number } } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPixel, setDragPixel] = useState<{ x: number; y: number } | null>(null)
  // Le conteneur est carré et rétrécit en dessous de `size` sur petit écran (voir le style
  // CSS min() plus bas) : on mesure sa taille réelle plutôt que de faire confiance à la prop
  // `size`, sinon les jetons se positionneraient hors de l'écran sur mobile/tablette. La
  // mesure initiale se fait dans un useLayoutEffect (synchrone, avant peinture) plutôt qu'un
  // useEffect : sinon, le premier rendu utilise encore la taille "desktop" par défaut le temps
  // que le ResizeObserver se déclenche, ce qui produit un flash visible de jetons mal placés
  // (certains hors du cadre) à chaque ouverture de l'écran sur mobile.
  const [measuredSize, setMeasuredSize] = useState(size)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setMeasuredSize(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setMeasuredSize(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const total = players.length
  const radius = measuredSize / 2 - measuredSize * 0.125
  const center = measuredSize / 2

  if (total === 0) {
    return <p className="text-ink-2 text-center">Aucun joueur pour le moment.</p>
  }

  const pixelById = new Map<string, { x: number; y: number }>()
  for (const player of players) {
    if (draggingId === player.id && dragPixel) {
      pixelById.set(player.id, dragPixel)
      continue
    }
    const pos = getEffectivePosition(player, total)
    pixelById.set(player.id, { x: center + pos.x * radius, y: center + pos.y * radius })
  }

  function clampToContainer(x: number, y: number) {
    return {
      x: Math.min(Math.max(x, TOKEN_HALF_WIDTH), measuredSize - TOKEN_HALF_WIDTH),
      y: Math.min(Math.max(y, TOKEN_HALF_WIDTH), measuredSize - TOKEN_HALF_WIDTH),
    }
  }

  function toLocal(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: center, y: center }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>, playerId: string) {
    if (!reorderable) return
    // Empêche l'action par défaut du navigateur (démarrage d'une sélection de texte ou d'un
    // glisser-déposer natif sur l'icône/le texte du jeton) : sans ça, Chromium peut annuler la
    // capture du pointeur (pointercancel) dès le premier mouvement, ce qui bloque le glisser en
    // plein milieu du geste — c'était la cause du "parfois je n'arrive pas à déplacer le joueur".
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const currentPixel = pixelById.get(playerId) ?? { x: center, y: center }
    const pointerLocal = toLocal(e.clientX, e.clientY)
    const grabOffset = { x: pointerLocal.x - currentPixel.x, y: pointerLocal.y - currentPixel.y }
    dragRef.current = { playerId, grabOffset, lastPixel: currentPixel }
    setDraggingId(playerId)
    setDragPixel(currentPixel)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>, playerId: string) {
    const drag = dragRef.current
    if (!drag || drag.playerId !== playerId) return
    // Le navigateur regroupe (coalesce) les pointermove trop rapprochés en un seul événement
    // dispatché par frame : sans lire les échantillons groupés, on perdrait la position réelle
    // la plus récente lors d'un glisser rapide, et le jeton "raterait des bouts" du geste.
    const native = e.nativeEvent
    const coalesced = native.getCoalescedEvents?.() ?? []
    const latest = coalesced.length > 0 ? coalesced[coalesced.length - 1]! : native
    const pointerLocal = toLocal(latest.clientX, latest.clientY)
    const nextPixel = clampToContainer(pointerLocal.x - drag.grabOffset.x, pointerLocal.y - drag.grabOffset.y)
    drag.lastPixel = nextPixel
    setDragPixel(nextPixel)
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>, playerId: string) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const drag = dragRef.current
    dragRef.current = null
    setDraggingId(null)
    setDragPixel(null)
    if (!drag || drag.playerId !== playerId) return
    const mapX = (drag.lastPixel.x - center) / radius
    const mapY = (drag.lastPixel.y - center) / radius
    onDropPosition?.(playerId, mapX, mapY)
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto select-none mb-14"
      style={{ width: `min(${size}px, 92vw)`, height: `min(${size}px, 92vw)` }}
    >
      {players.map((player) => {
        const pixel = pixelById.get(player.id)
        if (!pixel) return null
        const isDragging = draggingId === player.id
        return (
          <div
            key={player.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${
              isDragging ? 'z-20 scale-110 cursor-grabbing' : reorderable ? 'cursor-grab' : ''
            } ${isDragging ? '' : 'transition-[left,top] duration-150 ease-out'}`}
            style={{ left: pixel.x, top: pixel.y, touchAction: reorderable ? 'none' : undefined }}
            onPointerDown={(e) => handlePointerDown(e, player.id)}
            onPointerMove={(e) => handlePointerMove(e, player.id)}
            onPointerUp={(e) => handlePointerUp(e, player.id)}
            onPointerCancel={(e) => handlePointerUp(e, player.id)}
            onLostPointerCapture={(e) => handlePointerUp(e, player.id)}
          >
            {renderSeat(player, isDragging)}
          </div>
        )
      })}
    </div>
  )
}
