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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-white to-transparent" />

      <div className="flex w-max animate-mk-marquee gap-6">
        {doubled.map((item, i) => (
          <figure
            key={i}
            className="mk-card mk-shadow-card flex w-[380px] shrink-0 flex-col justify-between p-7"
          >
            <div>
              <Quote className="h-7 w-7 text-brand/30" />
              <blockquote className="mt-4 text-[17px] font-medium leading-relaxed text-[#0d1b2a]">
                {item.quote}
              </blockquote>
            </div>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-[#eef2f5] pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D1B2A] font-display text-sm font-semibold text-brand">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0d1b2a]">
                  {item.name}
                </p>
                <p className="text-xs text-[#6B7A8D]">{item.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
