/* eslint-disable @next/next/no-img-element */
/**
 * Bodhi-leaf supporting graphic per VI A-14 — renders the official brand
 * mark (public/brand/bodhi-leaf.svg, 虚空蓝 vector traced from the VI PNG)
 * as a faded backdrop.
 *
 * Two layout variants:
 *   - `right`        graphic vertically full, aligned to right edge (wide canvases)
 *   - `bottom-right` graphic anchored at bottom, aligned to right edge (narrow canvases)
 *
 * Two color modes:
 *   - `light`  the mark as-is (sky-blue) at low opacity, for white/near-white bg
 *   - `dark`   inverted to white at low opacity, for gradient or dark bg
 *
 * The parent must establish a positioning context (e.g. `relative` + `overflow-hidden`).
 * A plain <img> is used (not next/image) so it stays a pure decorative,
 * un-optimized layer that the layout never waits on.
 */
type Variant = 'right' | 'bottom-right'
type Mode = 'light' | 'dark'

interface BodhiBackdropProps {
  variant?: Variant
  mode?: Mode
  className?: string
}

export default function BodhiBackdrop({
  variant = 'right',
  mode = 'light',
  className = '',
}: BodhiBackdropProps) {
  // The PNG is sky-blue on transparent; for dark backgrounds flip it to
  // white via filter so it still reads as a faint ghost.
  const filterClass = mode === 'dark' ? 'brightness-0 invert' : ''

  // Position + size per VI A-14.
  // Right-edge variant: graphic spans full height, ~2/3 cropped off the right.
  // Bottom-right variant: graphic anchored bottom, ~2/3 cropped off the right.
  const positionClass =
    variant === 'right'
      ? 'absolute right-[-30%] top-1/2 -translate-y-1/2 h-[140%] w-auto'
      : 'absolute right-[-30%] bottom-[-10%] h-[90%] w-auto'

  return (
    <img
      src="/brand/bodhi-leaf.svg"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none opacity-20 ${filterClass} ${positionClass} ${className}`}
    />
  )
}
