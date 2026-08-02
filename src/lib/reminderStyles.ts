/**
 * Rappels "reconnus" (posés automatiquement par le moteur ou l'assistant de
 * nuit) affichés avec une icône et une couleur distinctes des notes libres,
 * pour que les statuts importants (empoisonné, protégé, leurre...) sautent
 * aux yeux plutôt que de se fondre parmi d'autres étiquettes — sur le
 * grimoire comme dans le panneau de détail d'un joueur.
 */
export const RECOGNIZED_REMINDER_STYLE: Record<string, { icon: string; className: string }> = {
  poisoner: { icon: '🧪', className: 'bg-danger/20 text-danger' },
  monk: { icon: '🛡️', className: 'bg-good-bg text-good' },
  'fortune-teller': { icon: '🔮', className: 'bg-accent/20 text-accent' },
  butler: { icon: '🤝', className: 'bg-surface-3 text-ink-1' },
  grandmother: { icon: '👵', className: 'bg-accent/20 text-accent' },
  sailor: { icon: '⚓', className: 'bg-warning/20 text-warning' },
  innkeeper: { icon: '🍺', className: 'bg-good-bg text-good' },
  exorcist: { icon: '✝', className: 'bg-accent/20 text-accent' },
  courtier: { icon: '🍷', className: 'bg-warning/20 text-warning' },
  pukka: { icon: '☠', className: 'bg-danger/20 text-danger' },
  'devils-advocate': { icon: '⚖', className: 'bg-evil-bg text-evil' },
  pacifist: { icon: '☮', className: 'bg-good-bg text-good' },
  fool: { icon: '🃏', className: 'bg-warning/20 text-warning' },
  zombuul: { icon: '🧟', className: 'bg-evil-bg text-evil' },
  goon: { icon: '↔', className: 'bg-warning/20 text-warning' },
  'goon-flip': { icon: '↔', className: 'bg-warning/20 text-warning' },
  moonchild: { icon: '🌙', className: 'bg-accent/20 text-accent' },
}

export function getReminderVisual(sourceCharacterId: string): { icon: string; className: string } | null {
  return RECOGNIZED_REMINDER_STYLE[sourceCharacterId] ?? null
}
