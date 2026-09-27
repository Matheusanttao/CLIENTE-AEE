export function TestimonialCard({ avatar, name, text }: { avatar: string; name: string; text: string }) {
  return (
    <article className="flex min-w-[320px] flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:min-w-[380px]">
      <p className="text-sm leading-relaxed text-gray-200">"{text}"</p>
      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <img src={avatar} alt={name} className="h-12 w-12 rounded-full object-cover ring-2 ring-brand/40" loading="lazy" />
        <div>
          <h3 className="text-sm font-semibold text-white">{name}</h3>
          <p className="text-xs text-brand">★★★★★</p>
        </div>
      </div>
    </article>
  )
}
