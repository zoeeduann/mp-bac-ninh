import Image, { type ImageProps } from 'next/image'

/** Display the landscape artwork selected by activityImageUrl. */
export default function ActivityImage({
  width,
  height,
  alt,
  className = '',
  ...props
}: Omit<ImageProps, 'fill'> & { width: number; height: number }) {
  return (
    <div
      className="relative w-full shrink-0 overflow-hidden bg-paper"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image {...props} alt={alt} fill className={`object-contain ${className}`} />
    </div>
  )
}
