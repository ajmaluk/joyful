type BrandLogoProps = {
  className?: string;
  showText?: boolean;
};

const brandIconUrl = '/brand-logo-180.png';

export function BrandLogo({ className = 'h-7 w-7', showText = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={brandIconUrl}
        alt="Joyful"
        className={`shrink-0 rounded-xl object-contain ${className}`}
        draggable={false}
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">Joyful</span>
      )}
    </div>
  );
}
