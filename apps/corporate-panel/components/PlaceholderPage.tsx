import Shell from './Shell';
import { Construction } from 'lucide-react';
export default function PlaceholderPage({ title, description, features }: { title: string; description: string; features?: string[] }) {
  return (
    <Shell title={title}>
      <div className="card p-12 text-center max-w-2xl mx-auto">
        <Construction className="mx-auto mb-4 text-amber-500" size={48} />
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-neutral-600 mb-6">{description}</p>
        {features && <div className="text-left bg-neutral-50 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase text-neutral-500 mb-3">Planned Features</div>
          <ul className="space-y-2 text-sm">{features.map((f) => <li key={f} className="flex items-start gap-2"><span className="text-emerald-500">✓</span><span>{f}</span></li>)}</ul>
        </div>}
      </div>
    </Shell>
  );
}
