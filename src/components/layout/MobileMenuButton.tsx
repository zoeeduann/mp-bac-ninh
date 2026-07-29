'use client'

interface MobileMenuButtonProps {
  onClick: () => void
}

export default function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open navigation menu"
      className="md:hidden flex flex-col items-center justify-center gap-[5px] cursor-pointer bg-transparent border-none min-w-[44px] min-h-[44px] -mr-2"
    >
      <span className="block w-[22px] h-[1.5px] bg-ink" />
      <span className="block w-[22px] h-[1.5px] bg-ink" />
      <span className="block w-[22px] h-[1.5px] bg-ink" />
    </button>
  )
}
