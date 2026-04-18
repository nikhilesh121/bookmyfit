'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit?: (l: number) => void;
}

export default function Pagination({ page, pages, total, limit, onPage, onLimit }: Props) {
  if (pages <= 1 && total <= limit) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', gap: 12 }}>
      <span style={{ color: 'var(--t3)', fontSize: 13 }}>
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {onLimit && (
          <select value={limit} onChange={e => onLimit(+e.target.value)} className="glass-input" style={{ padding: '4px 8px', fontSize: 13 }}>
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
        <button className="btn btn-ghost" onClick={() => onPage(page - 1)} disabled={page <= 1} style={{ padding: '4px 10px' }}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
          return (
            <button key={p} className={p === page ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => onPage(p)} style={{ padding: '4px 10px', minWidth: 36 }}>
              {p}
            </button>
          );
        })}
        <button className="btn btn-ghost" onClick={() => onPage(page + 1)} disabled={page >= pages} style={{ padding: '4px 10px' }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
