'use client';
import { useEffect, useRef, useState } from 'react';

interface Props { end: number; suffix?: string; duration?: number; label: string; }

export default function StatCounter({ end, suffix = '', duration = 1800, label }: Props) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(end);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} style={{ padding: '20px 22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, textAlign: 'center', transition: 'border-color 0.3s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(204,255,0,0.35)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
    >
      <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 900, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-1px' }}>
        {count.toLocaleString('en-IN')}{suffix}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
