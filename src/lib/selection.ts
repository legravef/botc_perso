/** Ajoute/retire un id d'une liste plafonnée à `max` éléments : au-delà de la limite, le plus
 * ancien choix est remplacé par le nouveau plutôt que de bloquer la sélection. */
export function toggleCapped(current: string[], id: string, max: number): string[] {
  if (current.includes(id)) return current.filter((item) => item !== id)
  if (max <= 0) return current
  if (current.length >= max) return [...current.slice(1), id]
  return [...current, id]
}
