type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({ className = 'h-8 w-8', alt = 'Joyful' }: BrandLogoProps) {
  return (
    <img
      src="/brand-logo.png"
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
      draggable={false}
    />
  );
}
