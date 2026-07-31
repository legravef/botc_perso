import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-surface-0 hover:brightness-110',
  secondary: 'bg-surface-2 text-ink-0 border border-border hover:bg-surface-3',
  danger: 'bg-danger text-surface-0 hover:brightness-110',
  ghost: 'bg-transparent text-ink-1 hover:text-ink-0 hover:bg-surface-2',
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-5 py-3 rounded-xl text-base font-medium transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
