import { useMemo } from 'react'
import type { GameEvent } from '@/types'

function latestNightEvents(history: GameEvent[]) {
  const start = history.map((event) => event.type === 'phase.changed' && event.resultingState.phase.startsWith('night')).lastIndexOf(true)
  return start >= 0 ? history.slice(start + 1) : []
}

export function DayBriefing({ history }: { history: GameEvent[] }) {
  const summary = useMemo(() => {
    const deaths = new Set<string>(); const resurrections = new Set<string>(); const prevented = new Set<string>(); const information = new Set<string>()
    for (const event of latestNightEvents(history)) {
      if (event.type !== 'player.updated') continue
      for (const id of event.targetIds ?? []) {
        const before = event.previousState.players.find((player) => player.id === id); const after = event.resultingState.players.find((player) => player.id === id)
        if (!before || !after) continue
        if (before.alive && !after.alive) deaths.add(after.name)
        if (!before.alive && after.alive) resurrections.add(after.name)
        if (typeof event.payload.sourceCharacterId === 'string' && 'ignoreProtection' in event.payload && before.alive && after.alive) prevented.add(after.name)
        if (after.notes.some((note) => !before.notes.some((old) => old.id === note.id) && note.category === 'information')) information.add(after.name)
      }
    }
    return { deaths: [...deaths], resurrections: [...resurrections], prevented: [...prevented], information: [...information] }
  }, [history])
  const quiet = !summary.deaths.length && !summary.resurrections.length && !summary.prevented.length && !summary.information.length
  return <section className="w-full rounded-2xl border border-accent/30 bg-accent/5 p-5 screen-enter">
    <p className="text-xs uppercase tracking-[0.16em] text-accent">Briefing du Conteur</p><h2 className="text-lg font-semibold mt-1">À annoncer au début du jour</h2>
    {quiet ? <p className="text-sm text-ink-2 mt-3">Aucun événement nocturne à annoncer. Le village se réveille sans changement visible.</p> : <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      {summary.deaths.length > 0 && <BriefCard title="Morts cette nuit" names={summary.deaths} tone="danger" />}
      {summary.resurrections.length > 0 && <BriefCard title="Résurrections" names={summary.resurrections} tone="success" />}
      {summary.prevented.length > 0 && <BriefCard title="Morts évitées — secret MJ" names={summary.prevented} tone="warn" />}
      {summary.information.length > 0 && <BriefCard title="Informations privées résolues" names={summary.information} tone="accent" />}
    </div>}
  </section>
}

function BriefCard({ title, names, tone }: { title: string; names: string[]; tone: 'danger' | 'success' | 'warn' | 'accent' }) {
  const tones = { danger: 'border-danger/35 bg-danger/10', success: 'border-success/35 bg-success/10', warn: 'border-warn/35 bg-warn/10', accent: 'border-accent/35 bg-accent/10' }
  return <div className={`rounded-xl border p-3 ${tones[tone]}`}><p className="text-xs text-ink-2">{title}</p><p className="font-medium mt-1">{names.join(', ')}</p></div>
}
