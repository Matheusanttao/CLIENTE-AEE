import { useSiteSettings } from '../contexts/SiteSettingsContext'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.004 3C9.38 3 4 8.384 4 15.012c0 2.188.58 4.315 1.684 6.192L4 29l7.988-1.65A12 12 0 0 0 16.004 27C22.628 27 28 21.616 28 14.988 28 8.384 22.628 3 16.004 3Zm6.62 16.972c-.276.78-1.604 1.428-2.244 1.52-.576.08-1.3.114-2.1-.132-.484-.148-1.108-.348-1.908-.68-3.356-1.452-5.54-4.816-5.708-5.04-.164-.228-1.36-1.812-1.36-3.456 0-1.644.86-2.452 1.164-2.788.304-.336.664-.42.884-.42h.64c.208 0 .484-.004.748.572.276.592.936 2.292 1.02 2.464.084.172.14.372.028.6-.108.228-.164.372-.324.572-.164.2-.344.448-.492.6-.164.172-.336.36-.144.704.192.344.852 1.404 1.828 2.276 1.256 1.12 2.312 1.468 2.656 1.632.344.164.544.14.744-.084.204-.228.864-.992 1.096-1.332.228-.344.46-.284.772-.172.316.112 2 .944 2.34 1.116.344.172.572.256.656.4.084.148.084.844-.192 1.624Z"
      />
    </svg>
  )
}

export function WhatsAppButton() {
  const { settings, whatsappUrl } = useSiteSettings()

  if (!settings.whatsapp_button_enabled || !settings.whatsapp_number) return null

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
      className="fixed bottom-4 right-4 z-50 grid h-13 w-13 place-items-center rounded-full bg-[#25D366] text-white shadow-soft transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  )
}
