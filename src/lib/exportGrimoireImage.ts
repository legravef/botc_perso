import type { Game } from '@/types'
import { getCharacterById } from '@/data'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Rendu du grimoire en image PNG (data URL), pour archiver ou débriefer une
 * partie sans dépendre d'une librairie de capture d'écran DOM : on reproduit
 * directement la disposition circulaire du grimoire sur un <canvas>.
 */
export function renderGrimoireToDataUrl(game: Game): string {
  const size = 900
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Le rendu canvas n\'est pas disponible dans cet environnement.')

  ctx.fillStyle = '#0d0e13'
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = '#f4f4f6'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Grimoire du Conteur', 24, 36)
  ctx.font = '12px sans-serif'
  ctx.fillStyle = '#8b8d9a'
  ctx.fillText(`${game.players.length} joueurs — usage privé du Conteur uniquement`, 24, 56)

  const ordered = [...game.players].sort((a, b) => a.seat - b.seat)
  const center = size / 2 + 10
  const radius = size / 2 - 130
  const cardWidth = 150
  const cardHeight = 64

  ordered.forEach((player, index) => {
    const angle = (index / ordered.length) * 2 * Math.PI - Math.PI / 2
    const x = center + radius * Math.cos(angle)
    const y = center + radius * Math.sin(angle)
    const character = player.realCharacterId ? getCharacterById(game.scriptId, player.realCharacterId) : null

    ctx.fillStyle = character?.team === 'evil' ? '#3a1a1a' : character ? '#16233d' : '#1f2129'
    ctx.strokeStyle = character?.team === 'evil' ? '#e0473f' : character ? '#4f8ff0' : '#33353f'
    ctx.lineWidth = 2
    roundRect(ctx, x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f4f4f6'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(player.name, x, y - 8)

    ctx.fillStyle = '#c7c8d1'
    ctx.font = '13px sans-serif'
    ctx.fillText(character?.nameFr ?? '—', x, y + 12)

    if (!player.alive) {
      ctx.fillStyle = '#e0473f'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('MORT', x, y + 27)
    }
  })

  return canvas.toDataURL('image/png')
}
