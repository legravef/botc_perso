import { describe, expect, it } from 'vitest'
import { exportCompositionToScriptJson } from './scriptExport'

const SCRIPT = 'trouble-brewing' as const

describe('exportCompositionToScriptJson', () => {
  const characterIds = ['washerwoman', 'chef', 'poisoner', 'imp']
  const entries = exportCompositionToScriptJson(characterIds, SCRIPT)

  it('commence par une entrée _meta', () => {
    expect(entries[0]).toMatchObject({ id: '_meta' })
  })

  it('produit une entrée par personnage, avec les identifiants officiels inchangés', () => {
    const ids = entries.slice(1).map((e) => e.id)
    expect(ids).toEqual(characterIds)
  })

  it('utilise les valeurs de team compatibles avec le format communautaire', () => {
    const imp = entries.find((e) => e.id === 'imp')
    expect(imp).toMatchObject({ team: 'demon' })
    const chef = entries.find((e) => e.id === 'chef')
    expect(chef).toMatchObject({ team: 'townsfolk' })
  })

  it('reporte les ordres de nuit et marque les personnages à effet de composition (setup)', () => {
    const poisoner = entries.find((e) => e.id === 'poisoner')
    expect(poisoner).toMatchObject({ firstNight: 1, otherNight: 1 })
    const washerwoman = entries.find((e) => e.id === 'washerwoman')
    expect(washerwoman).toMatchObject({ setup: false })
  })

  it('ignore silencieusement un identifiant de personnage inconnu', () => {
    const withUnknown = exportCompositionToScriptJson(['chef', 'not-a-real-character'], SCRIPT)
    expect(withUnknown.map((e) => e.id)).toEqual(['_meta', 'chef'])
  })
})
