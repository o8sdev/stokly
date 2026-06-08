import { Quote } from 'lucide-react'

export interface Testimonial {
  quote: string
  name: string
  role: string
}

// Seamless marquee of testimonial cards (CSS-only, pauses on hover). The list
// is rendered twice so the -50% translate loops without a seam.
export function Testimonials({ items }: { items: Testimonial[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="mk-marquee-pause relative overflow-hidden">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-[#070c0b] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-[#070c0b] to-transparent" />

      <div className="flex w-max animate-mk-marquee gap-6">
        {doubled.map((item, i) => (
          <figure
            key={i}
            className="mk-card-d flex w-[380px] shrink-0 flex-col justify-between p-7"
          >
            <div>
              <Quote className="h-7 w-7 text-brand/40" />
              <blockquote className="mt-4 text-[17px] font-medium leading-relaxed text-[#e9f2ee]">
                {item.quote}
              </blockquote>
            </div>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-semibold text-brand ring-1 ring-brand/25">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-[#9fb2aa]">{item.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
