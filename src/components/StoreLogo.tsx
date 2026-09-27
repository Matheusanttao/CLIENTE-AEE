import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { cn } from '../utils/cn'

const logoImgBySize = {
  sm: 'h-11 max-h-11 w-auto max-w-[180px]',
  md: 'h-11 max-h-11 w-auto max-w-[150px] sm:h-16 sm:max-h-16 sm:max-w-[280px]',
  lg: 'h-16 max-h-16 w-auto max-w-[280px] sm:h-[4.5rem] sm:max-h-[4.5rem] sm:max-w-[320px]',
} as const

const skeletonBySize = {
  sm: 'h-11 w-40',
  md: 'h-14 w-48',
  lg: 'h-16 w-56',
} as const

export function StoreLogo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const { settings, loading } = useSiteSettings()

  const iconBox =
    size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'
  const iconSize = size === 'lg' ? 30 : size === 'sm' ? 20 : 26
  const titleClass =
    size === 'lg'
      ? 'font-display text-3xl font-extrabold tracking-tight'
      : 'font-display text-2xl font-extrabold tracking-tight'
  const tagClass =
    size === 'lg'
      ? 'block text-[10px] font-semibold uppercase tracking-[0.22em] text-brand'
      : 'block text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-400'

  if (loading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-xl bg-white/15',
          skeletonBySize[size],
          className,
        )}
        aria-hidden
      />
    )
  }

  const showIcon = settings.logo_enabled
  const showText = settings.logo_show_text || !showIcon
  const customLogo = Boolean(settings.logo_url?.trim())

  return (
    <Link to="/" className={cn('flex min-w-0 items-center gap-3 text-white', className)}>
      {showIcon &&
        (customLogo ? (
          <img
            src={settings.logo_url}
            alt={settings.store_name}
            className={cn('shrink-0 object-contain object-left', logoImgBySize[size])}
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <span
            className={cn(
              'grid shrink-0 place-items-center rounded-xl bg-brand text-ink shadow-sm',
              iconBox,
            )}
          >
            <Zap size={iconSize} fill="currentColor" />
          </span>
        ))}
      {showText && (
        <span className="min-w-0 leading-none">
          <strong className={cn('block truncate', titleClass)}>{settings.store_name_short}</strong>
          <small className={tagClass}>{settings.store_tagline}</small>
        </span>
      )}
    </Link>
  )
}
