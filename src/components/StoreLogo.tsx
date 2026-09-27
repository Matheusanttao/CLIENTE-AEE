import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { cn } from '../utils/cn'

/*
 * A logo original e colorida: exibida sempre sem filtros, sobre fundo neutro,
 * com object-contain para nao distorcer nem cortar.
 */
const logoImgBySize = {
  sm: 'h-10 max-h-10 w-auto max-w-[150px]',
  md: 'h-12 max-h-12 w-auto max-w-[150px] sm:max-w-[170px] lg:h-14 lg:max-h-14 lg:max-w-[210px]',
  lg: 'h-16 max-h-16 w-auto max-w-[240px] sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[280px]',
} as const

const skeletonBySize = {
  sm: 'h-10 w-28',
  md: 'h-12 w-[130px] lg:h-14 lg:w-[152px]',
  lg: 'h-16 w-44 sm:h-[4.5rem] sm:w-48',
} as const

const iconBoxBySize = {
  sm: 'h-10 w-10',
  md: 'h-11 w-11 lg:h-12 lg:w-12',
  lg: 'h-14 w-14',
} as const

const titleBySize = {
  sm: 'text-base',
  md: 'text-lg lg:text-xl',
  lg: 'text-2xl',
} as const

export function StoreLogo({
  size = 'md',
  className,
  onClick,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}) {
  const { settings, loading } = useSiteSettings()

  if (loading) {
    return (
      <div
        className={cn('animate-pulse rounded-xl bg-surface', skeletonBySize[size], className)}
        aria-hidden
      />
    )
  }

  const showIcon = settings.logo_enabled
  const showText = settings.logo_show_text || !showIcon
  const customLogo = Boolean(settings.logo_url?.trim())
  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 20 : 22

  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label={showText ? undefined : `${settings.store_name}, página inicial`}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-lg text-ink',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
        className,
      )}
    >
      {showIcon &&
        (customLogo ? (
          <img
            src={settings.logo_url}
            alt={settings.store_name}
            className={cn('block shrink-0 object-contain object-left', logoImgBySize[size])}
            decoding="async"
            fetchPriority={size === 'md' ? 'high' : undefined}
          />
        ) : (
          <span
            className={cn('grid shrink-0 place-items-center rounded-xl bg-brand text-white', iconBoxBySize[size])}
            aria-hidden
          >
            <ShoppingBag size={iconSize} strokeWidth={2.25} />
          </span>
        ))}
      {showText && (
        <span className="min-w-0 leading-tight">
          <strong className={cn('block truncate font-bold tracking-tight text-ink', titleBySize[size])}>
            {settings.store_name_short}
          </strong>
          {settings.store_tagline && (
            <small className="mt-0.5 block truncate text-xs font-medium text-muted">{settings.store_tagline}</small>
          )}
        </span>
      )}
    </Link>
  )
}
