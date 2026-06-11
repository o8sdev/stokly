export interface Testimonial {
  quote: string
  name: string
  role: string
}

// Seamless marquee of paper note-cards (CSS-only, pauses on hover). The list is
// rendered twice so the -50% translate loops without a seam. Each card opens
// with an oversized editorial quote mark — handwritten-margin-note energy.
export function Testimonials({ items }: { items: Testimonial[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="mk-marquee-pause relative overflow-hidden">
      {/* Edge fades (paper-coloured) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-[#f4f1e8] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-[#f4f1e8] to-transparent" />

      <div className="flex w-max animate-mk-marquee gap-6 px-6">
        {doubled.map((item, i) => (
          <figure
            key={i}
            className={`mk-card-d flex w-[360px] shrink-0 flex-col justify-between p-7 ${
              i % 2 === 0 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'
            }`}
          >
            <div>
              <span
                className="font-editorial block text-5xl italic leading-none text-[#00926e]"
                aria-hidden
              >
                &ldquo;
              </span>
              <blockquote className="font-editorial mt-1 text-[17px] italic leading-relaxed text-[#1c1a14]">
                {item.quote}
              </blockquote>
            </div>
            <figcaption className="mt-6 flex items-baseline justify-between gap-3 border-t border-dashed border-[#c9c2ab] pt-4">
              <p className="text-sm font-semibold text-[#1c1a14]">{item.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8e8a7b]">
                {item.role}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
