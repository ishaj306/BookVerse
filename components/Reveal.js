'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fades and lifts its children in the first time they scroll into view.
 * Content is visible immediately when motion is reduced or JS is slow.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Reduced motion is handled in CSS, which shows reveals immediately.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${seen ? 'reveal-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}
