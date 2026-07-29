'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'

export interface CarouselImage {
  url: string
  alt: string
}

interface ImageCarouselProps {
  images: CarouselImage[]
  /** Sizing utility for the viewport, e.g. `aspect-[4/5]` or
   *  `h-[clamp(320px,52vw,680px)]`. */
  className?: string
  /** Eager-load the first slide (above-the-fold heroes). */
  priority?: boolean
  /** next/image `sizes` hint. */
  sizes?: string
}

/**
 * Dependency-free image carousel built on native scroll-snap: touch/trackpad
 * swipe works for free, with arrow buttons + dot indicators layered on top.
 * Single image → renders plainly with no controls.
 */
export default function ImageCarousel({
  images,
  className = '',
  priority = false,
  sizes = '100vw',
}: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setActive((prev) => (prev === idx ? prev : idx))
  }, [])

  const scrollTo = useCallback((idx: number) => {
    const el = trackRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(idx, images.length - 1))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }, [images.length])

  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={images[0].url}
          alt={images[0].alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover saturate-[0.9]"
        />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden group ${className}`}>
      {/* Track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div key={i} className="relative h-full w-full flex-shrink-0 snap-center">
            <Image
              src={img.url}
              alt={img.alt}
              fill
              priority={priority && i === 0}
              sizes={sizes}
              className="object-cover saturate-[0.9]"
            />
          </div>
        ))}
      </div>

      {/* Arrows (hover-revealed on desktop, always tappable on touch) */}
      <button
        type="button"
        aria-label="Previous image"
        onClick={() => scrollTo(active - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper/85 text-ink backdrop-blur-sm shadow-sm transition-opacity duration-150 opacity-0 group-hover:opacity-100 disabled:opacity-0 cursor-pointer"
        disabled={active === 0}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button
        type="button"
        aria-label="Next image"
        onClick={() => scrollTo(active + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper/85 text-ink backdrop-blur-sm shadow-sm transition-opacity duration-150 opacity-0 group-hover:opacity-100 disabled:opacity-0 cursor-pointer"
        disabled={active === images.length - 1}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to image ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === active ? 'w-5 bg-paper' : 'w-1.5 bg-paper/55 hover:bg-paper/80'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
