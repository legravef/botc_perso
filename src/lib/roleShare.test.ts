import { describe, expect, it } from 'vitest'
import { buildRoleShareUrl, decodeRoleShareHash, isRoleShareHash } from './roleShare'

describe('roleShare — encodage/décodage du QR de révélation', () => {
  const payload = {
    playerName: 'Alice',
    characterId: 'fortune-teller',
    characterNameFr: 'Voyante',
    team: 'good' as const,
    description: 'Chaque nuit, choisissez 2 joueurs...',
  }

  it('produit une URL avec un fragment #/role/ reconnu par isRoleShareHash', () => {
    const url = buildRoleShareUrl(payload)
    const hash = url.slice(url.indexOf('#'))
    expect(isRoleShareHash(hash)).toBe(true)
  })

  it('round-trip encode puis décode fidèlement, y compris les accents', () => {
    const url = buildRoleShareUrl(payload)
    const hash = url.slice(url.indexOf('#'))
    const decoded = decodeRoleShareHash(hash)
    expect(decoded).toEqual(payload)
  })

  it('retourne null pour un fragment qui ne correspond pas au préfixe attendu', () => {
    expect(decodeRoleShareHash('#/autre-chose')).toBeNull()
    expect(isRoleShareHash('#/autre-chose')).toBe(false)
  })

  it('retourne null pour un contenu corrompu', () => {
    expect(decodeRoleShareHash('#/role/%%%invalid-base64%%%')).toBeNull()
  })
})
