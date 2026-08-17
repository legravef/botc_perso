/**
 * Icônes de personnages (fournies par l'utilisateur, propriété de
 * l'utilisateur — pas d'illustration tierce protégée). Chargées via
 * import.meta.glob pour rester à jour automatiquement si des icônes sont
 * ajoutées/retirées dans src/assets/roles/, sans liste d'imports manuelle :
 * le nom du fichier EST l'identifiant du personnage (`tea-lady.png` →
 * `tea-lady`), donc ajouter une icône suffit à la voir apparaître dans l'app.
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

// Ressources officielles mises à disposition des outils communautaires par TPI.
Object.assign(ROLE_ICONS, {
  clockmaker: 'https://release.botc.app/resources/characters/snv/clockmaker_g.webp',
  sage: 'https://release.botc.app/resources/characters/snv/sage_g.webp',
  artist: 'https://release.botc.app/resources/characters/snv/artist_g.webp',
  klutz: 'https://release.botc.app/resources/characters/snv/klutz_g.webp',
  snakecharmer: 'https://release.botc.app/resources/characters/snv/snakecharmer_g.webp',
})

/** URL de l'icône d'un personnage, ou undefined si aucune icône n'est fournie pour cet id. */
export function getCharacterIconUrl(characterId: string): string | undefined {
  return ROLE_ICONS[characterId]
}
