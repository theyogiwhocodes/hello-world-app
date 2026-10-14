import { PLATFORM_LABELS, type Platform } from '@app/shared';

/** Brand wordmark badge from /public/logos. Replace the SVGs there to use official artwork. */
export function PlatformLogo({ platform, height = 26 }: { platform: Platform; height?: number }) {
  return (
    <img
      src={`/logos/${platform}.svg`}
      alt={PLATFORM_LABELS[platform]}
      title={PLATFORM_LABELS[platform]}
      height={height}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}
