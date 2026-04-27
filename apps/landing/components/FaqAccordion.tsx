'use client';
import { useState } from 'react';

interface FaqItem { q: string; ans: string; }

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 780, margin: '0 auto' }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, background: open === i ? 'rgba(204,255,0,0.04)' : 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
            aria-expanded={open === i}
          >
            <span style={{ fontWeight: 600, fontSize: '0.975rem', color: '#fff', lineHeight: 1.4 }}>{item.q}</span>
            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: open === i ? '#CCFF00' : 'rgba(255,255,255,0.4)', transition: 'transform 0.2s, color 0.2s', transform: open === i ? 'rotate(45deg)' : 'none', fontSize: 16, lineHeight: 1 }}>+</span>
          </button>
          {open === i && (
            <div style={{ padding: '0 22px 18px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.72 }}>
              {item.ans}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
