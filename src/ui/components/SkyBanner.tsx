interface SkyBannerProps {
  variant: 'sunrise' | 'night'
  className?: string
}

const STARS = [
  { top: 12, left: 8, size: 2, delay: '0s' },
  { top: 22, left: 18, size: 1.5, delay: '0.4s' },
  { top: 10, left: 32, size: 2, delay: '1.1s' },
  { top: 28, left: 44, size: 1.5, delay: '0.7s' },
  { top: 15, left: 58, size: 2, delay: '1.6s' },
  { top: 8, left: 70, size: 1.5, delay: '0.2s' },
  { top: 24, left: 82, size: 2, delay: '1.3s' },
  { top: 18, left: 92, size: 1.5, delay: '0.9s' },
  { top: 34, left: 12, size: 1.5, delay: '1.8s' },
  { top: 38, left: 63, size: 1.5, delay: '0.5s' },
  { top: 6, left: 48, size: 1.5, delay: '1.0s' },
  { top: 30, left: 25, size: 1.5, delay: '1.5s' },
]

/**
 * Silhouette de ville avec un beffroi central — dessinée à la main (pas une image
 * téléchargée) pour pouvoir l'animer librement et rester 100% hors-ligne, sans
 * dépendre d'un asset externe soumis à droits d'auteur.
 */
function ClocktowerSkyline({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 600 150"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 w-full h-[64%]"
      aria-hidden="true"
    >
      <g fill="#0a0a10">
        <rect x="0" y="90" width="60" height="60" />
        <rect x="55" y="70" width="50" height="80" />
        <rect x="100" y="100" width="45" height="50" />
        <rect x="140" y="60" width="55" height="90" />
        <rect x="480" y="65" width="55" height="85" />
        <rect x="530" y="95" width="45" height="55" />
        <rect x="440" y="105" width="45" height="45" />
        <rect x="570" y="80" width="30" height="70" />
        {/* Beffroi central */}
        <rect x="262" y="28" width="76" height="122" />
        <polygon points="255,30 300,-6 345,30" />
        <rect x="296" y="-20" width="8" height="16" />
      </g>
      <circle cx="300" cy="58" r="17" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.9" />
      <line x1="300" y1="58" x2="300" y2="47" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="300" y1="58" x2="309" y2="61" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
    </svg>
  )
}

export function SkyBanner({ variant, className = '' }: SkyBannerProps) {
  const isSunrise = variant === 'sunrise'

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border ${className}`}>
      {/* Ciel de départ : nuit finissante (jour) ou ciel nocturne stable (nuit) */}
      <div
        className="absolute inset-0"
        style={{
          background: isSunrise
            ? 'linear-gradient(180deg, #14152a 0%, #3a2a55 45%, #a9542f 78%, #e0a83f 100%)'
            : 'linear-gradient(180deg, #0d0e13 0%, #1a1730 55%, #2a2148 100%)',
        }}
      />

      {/* Ciel du plein jour, qui se dévoile en fondu par-dessus au lever du soleil. Opacité de
          base 0 posée via une classe (pas un style inline) pour que motion-reduce:opacity-100
          puisse bien la supplanter quand les animations sont désactivées. */}
      {isSunrise && (
        <div
          className="absolute inset-0 opacity-0 motion-safe:animate-[sky-fade-in_2.6s_ease-out_forwards] motion-reduce:opacity-100"
          style={{
            background: 'linear-gradient(180deg, #f2c85c 0%, #f2935a 45%, #f6b56a 78%, #fbe2a0 100%)',
          }}
        />
      )}

      {/* Étoiles */}
      <div
        className={`absolute inset-0 ${isSunrise ? 'opacity-0 motion-safe:animate-[stars-fade-out_2.6s_ease-out_forwards]' : ''}`}
      >
        {STARS.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white motion-safe:animate-[twinkle_2.4s_ease-in-out_infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Lune (nuit uniquement) */}
      {!isSunrise && (
        <div
          className="absolute rounded-full motion-safe:animate-[moon-glow_4s_ease-in-out_infinite]"
          style={{
            top: '20%',
            right: '22%',
            width: 28,
            height: 28,
            background: 'radial-gradient(circle at 35% 35%, #f4f2ea, #cdd3ea)',
          }}
        />
      )}

      {/* Soleil (jour uniquement) — position/opacité de base = état final "levé", pour un
          repli propre en cas de prefers-reduced-motion (l'animation ne fait alors que
          survoler cet état de repos, sans jamais y contredire visuellement). */}
      {isSunrise && (
        <div
          className="absolute left-1/2 rounded-full motion-safe:animate-[sunrise-sun_2.8s_cubic-bezier(0.22,0.8,0.32,1)_forwards]"
          style={{
            top: '22%',
            width: 64,
            height: 64,
            opacity: 1,
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle at 40% 35%, #fff4d6, #ffcf6b 55%, #ff9b4d 100%)',
            boxShadow: '0 0 40px 10px rgba(255, 180, 90, 0.55)',
          }}
        />
      )}

      <ClocktowerSkyline accent={isSunrise ? '#3a2a1a' : '#cdd3ea'} />

      {/* Voile sombre en bas pour garder le texte lisible par-dessus */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-scrim/70 to-transparent" />
    </div>
  )
}
