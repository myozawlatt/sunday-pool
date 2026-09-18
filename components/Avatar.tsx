'use client';

import { useEffect, useRef, useState } from 'react';
import type { Player } from '@/lib/types';
import { initials } from '@/lib/format';

type Size = 'sm' | 'md' | 'lg' | 'xl';

/** Round bordered avatar; the initials underneath show if there's no photo or it fails to load. */
export function Avatar({ player, size = 'md', eager = false }: { player: Player; size?: Size; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image can fail before hydration, when onError isn't attached yet.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(player.name)}
      {player.avatarUrl && !failed && (
        // Plain <img> keeps us off Vercel's image-optimisation quota.
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={player.avatarUrl} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
