'use client';

import { useEffect, useState } from 'react';

const KEY = 'nude.carrito.v1';

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return setCount(0);
        const items: { cantidad: number }[] = JSON.parse(raw);
        const total = items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);
        setCount(total);
      } catch {
        setCount(0);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) read();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('nude:cart', read as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nude:cart', read as EventListener);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} ítems en el carrito`}
      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-terracotta text-white text-xs font-medium"
    >
      {count}
    </span>
  );
}
