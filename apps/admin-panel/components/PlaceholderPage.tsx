import Shell from './Shell';
import { Construction, CheckCircle } from 'lucide-react';

export default function PlaceholderPage({ title, description, features }: { title: string; description: string; features?: string[] }) {
  return (
    <Shell title={title}>
      <div className="card p-12 text-center max-w-2xl mx-auto">
        <Construction className="mx-auto mb-4" size={48} style={{ color: 'var(--accent)' }} />
        <h2 className="serif text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>{description}</p>
        {features && (
          <div className="text-left glass rounded-xl p-5">
            <div className="kicker mb-3">Planned Features</div>
            <ul className="space-y-2 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2" style={{ color: 'var(--t)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 text-xs" style={{ color: 'var(--t3)' }}>
          Track progress at{' '}
          <a href="http://localhost:3100" style={{ color: 'var(--accent)' }} className="underline">
            Tasklist Tracker
          </a>
        </div>
      </div>
    </Shell>
  );
}
