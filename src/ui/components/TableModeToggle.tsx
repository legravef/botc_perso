import { useEffect, useState } from 'react'
import { Button } from './Button'

const STORAGE_KEY = 'botc-table-mode'

export function TableModeToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    document.documentElement.dataset.tableMode = String(enabled)
    localStorage.setItem(STORAGE_KEY, String(enabled))
  }, [enabled])

  return (
    <Button variant={enabled ? 'primary' : 'ghost'} className="px-3 py-2 text-sm" onClick={() => setEnabled((current) => !current)}>
      {enabled ? 'Mode table activé' : 'Mode table'}
    </Button>
  )
}
