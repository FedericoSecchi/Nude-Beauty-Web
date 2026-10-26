'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  label: string;
  href: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  threshold?: number;
}

export function StickyCta({
  label,
  href,
  secondaryLabel,
  secondaryHref,
  threshold = 400,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden">
      <div className="container py-3 flex items-center gap-3">
        {secondaryLabel && secondaryHref ? (
          <Link href={secondaryHref} className="btn-outline flex-1 text-sm">
            {secondaryLabel}
          </Link>
        ) : null}
        <Link href={href} className="btn-primary flex-1 text-sm">
          {label}
        </Link>
      </div>
    </div>
  );
}
