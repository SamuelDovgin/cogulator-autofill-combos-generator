import finalCogIcon from '../../assets/logo/finalCogIcon.png';

export function BrandMark({
  className = '',
  alt = 'Cogulator Combo Generator logo',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={finalCogIcon}
      alt={alt}
      className={`block h-auto w-auto max-w-none object-contain drop-shadow-[0_12px_24px_rgba(2,8,23,0.45)] ${className}`.trim()}
      loading="eager"
      decoding="async"
    />
  );
}
