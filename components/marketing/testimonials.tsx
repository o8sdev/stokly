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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#F8FAFB] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#F8FAFB] to-transparent" />

      <div className="flex w-max animate-mk-marquee gap-5">
        {doubled.map((item, i) => (
          <figure
            key={i}
            className="flex w-[340px] shrink-0 flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6"
          >
            <Quote className="h-6 w-6 text-brand/40" />
            <blockquote className="mt-3 text-[15px] leading-relaxed text-[#1A2332]">
              {item.quote}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-[#F0F4F8] pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D1B2A] font-display text-sm font-semibold text-brand">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A2332]">
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
