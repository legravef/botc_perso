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

const badMoonModules = import.meta.glob('/bad_moon/*.png', { eager: true, import: 'default' }) as Record<string, string>

const ROLE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => {
    const fileName = path.split('/').pop() ?? ''
    const characterId = fileName.replace(/\.png$/, '')
    return [characterId, url]
  }),
)

const BAD_MOON_ICON_FILES: Record<string, string> = {
  grandmother: 'Icon_grandmother.png', sailor: 'Icon_sailor.png', chambermaid: 'Concierge.png', exorcist: 'Icon_exorcist.png',
  innkeeper: 'Aubergiste.png', gambler: 'Icon_gambler.png', gossip: 'Icon_gossip.png', courtier: 'Icon_courtier.png',
  professor: 'Icon_professor.png', minstrel: 'Icon_minstrel.png', 'tea-lady': 'Icon_tealady.png', pacifist: 'Icon_pacifist.png',
  fool: 'Icon_fool.png', goon: 'Icon_goon.png', lunatic: 'Icon_lunatic.png', tinker: 'Icon_tinker.png', moonchild: 'Icon_moonchild.png',
  godfather: 'Icon_godfather.png', 'devils-advocate': 'Icon_devilsadvocate.png', assassin: 'Icon_assassin.png', mastermind: 'Icon_mastermind.png',
  zombuul: 'Icon_zombuul.png', pukka: 'Icon_pukka.png', shabaloth: 'Icon_shabaloth.png', po: 'Icon_po.png',
}

for (const [characterId, fileName] of Object.entries(BAD_MOON_ICON_FILES)) {
  const icon = badMoonModules[`/bad_moon/${fileName}`]
  if (icon) ROLE_ICONS[characterId] = icon
}

/** URL de l'icône d'un personnage, ou undefined si aucune icône n'est fournie pour cet id. */
export function getCharacterIconUrl(characterId: string): string | undefined {
  return ROLE_ICONS[characterId]
}
