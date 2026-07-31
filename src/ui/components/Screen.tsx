import type { ReactNode } from 'react'
import logoTroubleBrewing from '@/assets/logo-trouble-brewing.png'
import logoBadMoonRising from '../../../bad_moon/Logo BDM.png'
import { useGameStore } from '@/store'
import { Button } from './Button'
import { TableModeToggle } from './TableModeToggle'

interface ScreenProps {
  title: string
  subtitle?: string
  onBack?: () => void
  headerActions?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Screen({ title, subtitle, onBack, headerActions, children, footer }: ScreenProps) {
  const scriptId = useGameStore((s) => s.game?.scriptId)
  const scriptLogo = scriptId === 'bad-moon-rising' ? logoBadMoonRising : logoTroubleBrewing
  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-ink-0">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="px-3 py-2">
            ← Retour
          </Button>
        )}
        <img src={scriptLogo} alt="" className="w-8 h-8 object-contain opacity-90" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
        </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <TableModeToggle />
          {headerActions}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      {footer && (
        <footer className="px-6 py-4 border-t border-border flex justify-end gap-3">{footer}</footer>
      )}
    </div>
  )
}
