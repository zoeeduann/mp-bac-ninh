import Image from 'next/image'
import { Noto_Serif_SC } from 'next/font/google'

const bacNinhSerif = Noto_Serif_SC({
  preload: false,
  weight: ['500'],
  display: 'swap',
})

export default function BacNinhLogo() {
  return (
    <span className="flex items-center gap-3 leading-none">
      <Image
        src="/brand/mindful-peace-yard-logo.svg"
        alt="静心小院 · Mindful Peace Yard"
        width={256}
        height={101}
        priority
        className="h-11 w-auto max-w-[180px] sm:h-12"
      />
      <span aria-hidden="true" className="h-8 w-px bg-ink/25 sm:h-9" />
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span
          className={`${bacNinhSerif.className} text-[16px] font-medium tracking-[0.06em] text-ink sm:text-[18px]`}
        >
          北宁善明
        </span>
        <span className="mt-1 translate-y-[7px] font-sans text-[8px] font-medium tracking-[0.08em] text-ink-soft sm:text-[9px]">
          Bac Ninh
        </span>
      </span>
    </span>
  )
}
