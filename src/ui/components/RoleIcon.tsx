import { getCharacterIconUrl } from '@/data/icons'

interface RoleIconProps {
  characterId: string | null | undefined
  nameFr?: string
  size?: number
  className?: string
}

/** Icône d'un personnage, avec repli discret sur son initiale si aucune icône n'est disponible. */
export function RoleIcon({ characterId, nameFr, size = 40, className = '' }: RoleIconProps) {
  const url = characterId ? getCharacterIconUrl(characterId) : undefined

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-surface-3 text-ink-2 shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {nameFr ? nameFr.charAt(0).toUpperCase() : '?'}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
