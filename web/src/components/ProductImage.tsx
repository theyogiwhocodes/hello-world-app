import { useState } from 'react';
import type { Platform } from '@app/shared';
import { PlatformLogo } from './PlatformLogo';

interface Props {
  src?: string;
  alt: string;
  platform: Platform;
  size: number;
}

/** Product photo, falling back to the platform logo if missing or blocked by the source site. */
export function ProductImage({ src, alt, platform, size }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="img-fallback" style={{ width: size, height: size }}>
        <PlatformLogo platform={platform} height={Math.round(size / 3)} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', width: size, height: size }}
    />
  );
}
