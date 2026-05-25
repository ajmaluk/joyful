type BrandLogoProps = {
  className?: string
  showText?: boolean
}

export function BrandLogo({ className = 'h-7 w-7', showText = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`shrink-0 rounded-xl bg-gradient-to-br from-[#2f5bff] to-[#f23c78] flex items-center justify-center text-white font-bold ${className}`}>
        J
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-foreground">Joyful</span>
      )}
    </div>
  )
}
