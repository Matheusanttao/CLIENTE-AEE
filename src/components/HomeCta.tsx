import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

type HomeCtaProps = {
  children: ReactNode
  /** Rota interna (react-router). */
  to?: string
  /** Link comum: ancora da pagina (#atacado) ou URL externa. */
  href?: string
  /** Abre em nova aba (ex.: WhatsApp). */
  external?: boolean
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
  className?: string
}

const baseClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20'

const variantClass = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
  secondary: 'border border-line bg-white text-ink hover:border-[#D0D5DD] hover:bg-surface',
} as const

const sizeClass = {
  md: 'h-11',
  lg: 'h-12',
} as const

/** Link com aparencia de botao (evita aninhar <button> dentro de <a>). */
export function HomeCta({ children, to, href, external, variant = 'primary', size = 'md', className }: HomeCtaProps) {
  const classes = cn(baseClass, variantClass[variant], sizeClass[size], className)

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={classes} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  )
}
