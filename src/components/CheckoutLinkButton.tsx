import type { AnchorHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../utils/cn'

type Variant = 'primary' | 'secondary'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
  secondary: 'border border-line bg-white text-ink hover:border-[#D0D5DD] hover:bg-surface',
}

/** Link do react-router com a mesma aparencia do Button (evita <button> dentro de <a>). */
export function CheckoutLinkButton({
  variant = 'primary',
  className,
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />
}

/** Link externo (<a>) com a mesma aparencia do Button. */
export function CheckoutAnchorButton({
  variant = 'primary',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={cn(base, variants[variant], className)} {...props} />
}
