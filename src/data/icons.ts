/**
 * Icônes de personnages (fournies par l'utilisateur, propriété de
 * l'utilisateur — pas d'illustration tierce protégée). Chargées via
 * import.meta.glob pour rester à jour automatiquement si des icônes sont
 * ajoutées/retirées dans src/assets/roles/, sans liste d'imports manuelle.
 */
const modules = import.meta.glob('/src/assets/roles/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>

const ROLE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => {
    const fileName = path.split('/').pop() ?? ''
    const characterId = fileName.replace(/\.png$/, '')
    return [characterId, url]
  }),
)

/** URL de l'icône d'un personnage, ou undefined si aucune icône n'est fournie pour cet id. */
export function getCharacterIconUrl(characterId: string): string | undefined {
  return ROLE_ICONS[characterId]
}
