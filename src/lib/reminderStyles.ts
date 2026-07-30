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
}

export function getReminderVisual(sourceCharacterId: string): { icon: string; className: string } | null {
  return RECOGNIZED_REMINDER_STYLE[sourceCharacterId] ?? null
}
