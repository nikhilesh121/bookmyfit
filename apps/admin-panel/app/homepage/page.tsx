'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  Info, ToggleLeft, ToggleRight, ChevronUp, ChevronDown,
  Plus, Trash2, Save, RefreshCw, Image, Dumbbell, ShoppingBag,
  GripVertical, Eye, EyeOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────
interface Slide {
  imageUrl: string;
  headline: string;
  headlineAccent: string;
  sub: string;
  cta: string;
  ctaRoute: string;
}

interface Section {
  id: string;
  type: 'hero' | 'categories' | 'featured_gyms' | 'products' | 'trust' | 'testimonials';
  title: string;
  visible: boolean;
  order: number;
  // hero
  slides?: Slide[];
  // featured_gyms
  featuredGymIds?: string[];
  gymLimit?: number;
  // products
  productCategory?: string | null;
  featuredProductIds?: string[];
  productLimit?: number;
}

interface HomepageConfig { sections: Section[]; }

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner Carousel',
  categories: 'Browse by Category',
  featured_gyms: 'Featured Gyms',
  products: 'Shop Products',
  trust: 'Why BookMyFit? (Trust)',
  testimonials: 'Member Testimonials',
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <Image size={14} />,
  categories: <GripVertical size={14} />,
  featured_gyms: <Dumbbell size={14} />,
  products: <ShoppingBag size={14} />,
  trust: <Eye size={14} />,
  testimonials: <Eye size={14} />,
};

const PRODUCT_CATEGORIES = ['supplements', 'accessories', 'apparel', 'equipment'];

const EMPTY_SLIDE: Slide = { imageUrl: '', headline: '', headlineAccent: '', sub: '', cta: 'Explore Gyms', ctaRoute: '/gyms' };

// ─── Component ────────────────────────────────────────────────────────────
export default function HomepagePage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');
  const [gymSearch, setGymSearch] = useState('');
  const [gymResults, setGymResults] = useState<any[]>([]);
  const [gymSearching, setGymSearching] = useState(false);
  const gymSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load config from backend ──────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    api.get('/homepage/config')
      .then((data: any) => setConfig(data))
      .catch(() => toast('Could not load config'))
      .finally(() => setLoading(false));
  }, []);

  // ── Save config to backend ────────────────────────────────────────────
  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/homepage/config', config);
      toast('Homepage saved ✓');
    } catch {
      toast('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Section helpers ───────────────────────────────────────────────────
  const updateSection = (id: string, patch: Partial<Section>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: prev.sections.map((s) => s.id === id ? { ...s, ...patch } : s) };
    });
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const newSections = sorted.map((s, i) => {
        if (i === idx) return { ...s, order: sorted[swapIdx].order };
        if (i === swapIdx) return { ...s, order: sorted[idx].order };
        return s;
      });
      return { ...prev, sections: newSections };
    });
  };

  // ── Hero slide helpers ────────────────────────────────────────────────
  const addSlide = (sectionId: string) => {
    const section = config?.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { slides: [...(section.slides || []), { ...EMPTY_SLIDE }] });
  };

  const updateSlide = (sectionId: string, slideIdx: number, patch: Partial<Slide>) => {
    const section = config?.sections.find((s) => s.id === sectionId);
    if (!section?.slides) return;
    const slides = section.slides.map((sl, i) => i === slideIdx ? { ...sl, ...patch } : sl);
    updateSection(sectionId, { slides });
  };

  const removeSlide = (sectionId: string, slideIdx: number) => {
    const section = config?.sections.find((s) => s.id === sectionId);
    if (!section?.slides) return;
    updateSection(sectionId, { slides: section.slides.filter((_, i) => i !== slideIdx) });
  };

  // ── Gym picker ────────────────────────────────────────────────────────
  const searchGyms = (q: string) => {
    setGymSearch(q);
    if (gymSearchRef.current) clearTimeout(gymSearchRef.current);
    if (!q.trim()) { setGymResults([]); return; }
    gymSearchRef.current = setTimeout(async () => {
      setGymSearching(true);
      try {
        const res: any = await api.get(`/gyms?search=${encodeURIComponent(q)}&limit=8`);
        setGymResults(Array.isArray(res) ? res : res?.data ?? []);
      } catch { setGymResults([]); }
      finally { setGymSearching(false); }
    }, 300);
  };

  const addGymId = (sectionId: string, gymId: string) => {
    const section = config?.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const ids = section.featuredGymIds || [];
    if (!ids.includes(gymId)) updateSection(sectionId, { featuredGymIds: [...ids, gymId] });
  };

  const removeGymId = (sectionId: string, gymId: string) => {
    const section = config?.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { featuredGymIds: (section.featuredGymIds || []).filter((id) => id !== gymId) });
  };

  if (loading) return (
    <Shell title="Homepage Builder">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>Loading config…</div>
    </Shell>
  );

  const sorted = [...(config?.sections || [])].sort((a, b) => a.order - b.order);

  return (
    <Shell title="Homepage Builder">
      {/* Info + Save */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderColor: 'rgba(100,160,255,0.25)', background: 'rgba(100,160,255,0.05)' }}>
          <Info size={15} style={{ color: '#64A0FF', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
            Configure each section, set order, toggle visibility. Changes go live to the mobile app on save.
          </span>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving} style={{ gap: 8, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Section builder (left 2/3) ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          {sorted.map((section, idx) => {
            const isExpanded = expandedSection === section.id;
            return (
              <div key={section.id} className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
                {/* Section header row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  {/* Order arrows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={() => moveSection(section.id, -1)} disabled={idx === 0}>
                      <ChevronUp size={12} />
                    </button>
                    <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={() => moveSection(section.id, 1)} disabled={idx === sorted.length - 1}>
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Order badge */}
                  <span style={{ minWidth: 24, height: 24, borderRadius: 6, background: 'rgba(61,255,84,0.12)', border: '1px solid rgba(61,255,84,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                    {section.order + 1}
                  </span>

                  <span style={{ color: 'var(--accent)', display: 'flex' }}>{SECTION_ICONS[section.type]}</span>
                  <span style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>{SECTION_LABELS[section.type] || section.title}</span>

                  {/* Title input */}
                  <input
                    value={section.title || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--t)', width: 180 }}
                    placeholder="Section title"
                  />

                  {/* Visibility toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); updateSection(section.id, { visible: !section.visible }); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title={section.visible ? 'Set to hidden' : 'Set to visible'}
                  >
                    {section.visible
                      ? <ToggleRight size={22} style={{ color: 'var(--accent)' }} />
                      : <ToggleLeft size={22} style={{ color: 'var(--t3)' }} />}
                  </button>

                  <span style={{ fontSize: 11, color: section.visible ? 'var(--accent)' : 'var(--t3)' }}>
                    {section.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--t3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {/* ── Expanded config panel ── */}
                {isExpanded && (
                  <div style={{ padding: '18px 20px' }}>

                    {/* HERO: slide management */}
                    {section.type === 'hero' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <h4 className="kicker">Banner Slides ({section.slides?.length || 0})</h4>
                          <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => addSlide(section.id)}>
                            <Plus size={13} /> Add Slide
                          </button>
                        </div>
                        {(section.slides || []).map((slide, si) => (
                          <div key={si} className="card" style={{ marginBottom: 12, padding: 14, position: 'relative' }}>
                            <button onClick={() => removeSlide(section.id, si)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.7)' }}>
                              <Trash2 size={14} />
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Image URL', key: 'imageUrl', full: true },
                                { label: 'Headline', key: 'headline' },
                                { label: 'Headline Accent (green)', key: 'headlineAccent' },
                                { label: 'Sub text', key: 'sub' },
                                { label: 'CTA Button Text', key: 'cta' },
                                { label: 'CTA Route (e.g. /gyms)', key: 'ctaRoute' },
                              ].map(({ label, key, full }) => (
                                <div key={key} style={full ? { gridColumn: '1 / -1' } : {}}>
                                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>{label}</label>
                                  <input
                                    value={(slide as any)[key] || ''}
                                    onChange={(e) => updateSlide(section.id, si, { [key]: e.target.value } as any)}
                                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: 'var(--t)', boxSizing: 'border-box' }}
                                  />
                                </div>
                              ))}
                            </div>
                            {slide.imageUrl && (
                              <img src={slide.imageUrl} alt="" style={{ marginTop: 8, width: '100%', height: 80, objectFit: 'cover', borderRadius: 8 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FEATURED GYMS: gym picker */}
                    {section.type === 'featured_gyms' && (
                      <div>
                        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                          <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Gym Limit (if no specific IDs)</label>
                            <input
                              type="number" min={1} max={20}
                              value={section.gymLimit || 6}
                              onChange={(e) => updateSection(section.id, { gymLimit: Number(e.target.value) })}
                              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--t)', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Search & Pin Specific Gyms</label>
                            <input
                              value={gymSearch}
                              onChange={(e) => searchGyms(e.target.value)}
                              placeholder="Type gym name…"
                              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: 'var(--t)', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        {gymSearching && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Searching…</div>}
                        {gymResults.length > 0 && (
                          <div className="card" style={{ marginBottom: 12, padding: 10 }}>
                            {gymResults.map((g) => (
                              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 13, color: 'var(--t)' }}>{g.name} <span style={{ color: 'var(--t3)', fontSize: 11 }}>{g.city}</span></span>
                                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => addGymId(section.id, g.id)}>+ Add</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {(section.featuredGymIds || []).length > 0 ? (
                          <div>
                            <h4 className="kicker" style={{ marginBottom: 8 }}>Pinned Gyms ({section.featuredGymIds?.length})</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {(section.featuredGymIds || []).map((id) => (
                                <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,255,84,0.08)', border: '1px solid rgba(61,255,84,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--t)' }}>
                                  {id.slice(0, 8)}…
                                  <button onClick={() => removeGymId(section.id, id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.8)', display: 'flex' }}>
                                    <Trash2 size={11} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--t3)' }}>No specific gyms pinned — will show latest {section.gymLimit || 6} gyms from API.</p>
                        )}
                      </div>
                    )}

                    {/* PRODUCTS: category picker */}
                    {section.type === 'products' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Product Category</label>
                          <select
                            value={section.productCategory || ''}
                            onChange={(e) => updateSection(section.id, { productCategory: e.target.value || null })}
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--t)', boxSizing: 'border-box' }}
                          >
                            <option value="">All Categories</option>
                            {PRODUCT_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Max Products to Show</label>
                          <input
                            type="number" min={1} max={20}
                            value={section.productLimit || 5}
                            onChange={(e) => updateSection(section.id, { productLimit: Number(e.target.value) })}
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--t)', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0 }}>
                            Showing <strong style={{ color: 'var(--accent)' }}>{section.productCategory || 'all'}</strong> products, up to <strong style={{ color: 'var(--accent)' }}>{section.productLimit || 5}</strong> items.
                            To pin specific products, add their IDs (comma-separated):
                          </p>
                          <input
                            value={(section.featuredProductIds || []).join(',')}
                            onChange={(e) => updateSection(section.id, { featuredProductIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            placeholder="uuid1, uuid2, uuid3…"
                            style={{ marginTop: 8, width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: 'var(--t)', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* CATEGORIES / TRUST / TESTIMONIALS: no extra config */}
                    {['categories', 'trust', 'testimonials'].includes(section.type) && (
                      <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
                        This section has no configurable content — it is rendered automatically on the mobile app.
                      </p>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Live preview (right 1/3) ──────────────────────────────── */}
        <div>
          <div className="glass p-5" style={{ borderRadius: 16, position: 'sticky', top: 20 }}>
            <h3 className="serif text-lg mb-4">Mobile Preview</h3>
            <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', aspectRatio: '9/18', overflow: 'hidden', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.filter((s) => s.visible).map((s) => (
                <div key={s.id}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{s.title || SECTION_LABELS[s.type]}</div>
                  {s.type === 'hero' && (
                    <div style={{ height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                      {s.slides?.[0]?.imageUrl
                        ? <img src={s.slides[0].imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={() => {}} />
                        : <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(0,200,100,0.2), rgba(0,120,255,0.2))' }} />}
                    </div>
                  )}
                  {s.type === 'categories' && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      {['All', 'Strength', 'Cardio', 'Yoga'].map((c) => (
                        <div key={c} style={{ height: 20, borderRadius: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '0 8px', fontSize: 8, color: 'var(--t2)', display: 'flex', alignItems: 'center' }}>{c}</div>
                      ))}
                    </div>
                  )}
                  {(s.type === 'featured_gyms' || s.type === 'products') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: 28, borderRadius: 7, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
                      ))}
                    </div>
                  )}
                  {(s.type === 'trust' || s.type === 'testimonials') && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 22, borderRadius: 7, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {sorted.filter((s) => s.visible).length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--t3)' }}>All sections hidden</div>
              )}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>
              {sorted.filter((s) => s.visible).length} of {sorted.length} sections visible
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}


type SectionConfig = {
  order: number;
  name: string;
  type: string;
  status: 'Active' | 'Draft';
  items: number;
};

// Maps backend section ids to display metadata
const SECTION_META: Record<string, { name: string; type: string; items: number }> = {
  hero:          { name: 'Hero Banner Carousel', type: 'Carousel', items: 3 },
  featured_gyms: { name: 'Featured Gyms',        type: 'Grid',     items: 6 },
  plans:         { name: 'Choose a Plan',         type: 'Grid',     items: 4 },
  stats:         { name: 'Stats',                 type: 'List',     items: 0 },
};

const DEFAULT_SECTIONS: SectionConfig[] = [
  { order: 1, name: 'Hero Banner Carousel', type: 'Carousel', status: 'Active', items: 3 },
  { order: 2, name: 'Featured Gyms', type: 'Grid', status: 'Active', items: 6 },
  { order: 3, name: 'Workout Categories', type: 'Horizontal Scroll', status: 'Active', items: 8 },
  { order: 4, name: 'Store Picks', type: 'Grid', status: 'Active', items: 4 },
  { order: 5, name: 'Trending Near You', type: 'List', status: 'Draft', items: 0 },
  { order: 6, name: 'Member Testimonials', type: 'Carousel', status: 'Active', items: 5 },
];

function backendToUi(backendSections: any[]): SectionConfig[] {
  return [...backendSections]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const meta = SECTION_META[s.id] ?? { name: s.title || s.id, type: s.type || 'List', items: 0 };
      return {
        order: s.order + 1,
        name: meta.name,
        type: meta.type,
        status: s.visible ? 'Active' : 'Draft',
        items: meta.items,
      };
    });
}

function uiToBackend(sections: SectionConfig[], original: any[]): any[] {
  return original.map((s) => {
    const uiItem = sections.find((u) => u.order === s.order + 1);
    if (!uiItem) return s;
    return { ...s, visible: uiItem.status === 'Active' };
  });
}

export default function HomepagePage() {
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [backendSections, setBackendSections] = useState<any[]>([]);
  const [featuredGyms, setFeaturedGyms] = useState<any[]>([]);
  const [gymsLoading, setGymsLoading] = useState(true);

  // Load config from backend on mount
  useEffect(() => {
    api.get('/homepage/config')
      .then((data: any) => {
        if (data?.sections?.length) {
          setBackendSections(data.sections);
          setSections(backendToUi(data.sections));
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const saveToApi = useCallback(async (updated: SectionConfig[]) => {
    const newBackend = uiToBackend(updated, backendSections);
    try {
      await api.put('/homepage/config', { sections: newBackend });
    } catch { /* ignore save errors */ }
  }, [backendSections]);

  const loadFeaturedGyms = useCallback(async () => {
    setGymsLoading(true);
    try {
      const res: any = await api.get('/gyms?page=1&limit=6');
      const arr = Array.isArray(res) ? res : res?.data ?? [];
      setFeaturedGyms(arr.slice(0, 6));
    } catch {
      setFeaturedGyms([]);
    } finally {
      setGymsLoading(false);
    }
  }, []);

  useEffect(() => { loadFeaturedGyms(); }, [loadFeaturedGyms]);

  const toggleStatus = (order: number) => {
    setSections((prev) => {
      const updated: SectionConfig[] = prev.map((s) =>
        s.order === order ? { ...s, status: (s.status === 'Active' ? 'Draft' : 'Active') as 'Active' | 'Draft' } : s
      );
      saveToApi(updated);
      const section = updated.find((s) => s.order === order);
      toast(`"${section?.name}" set to ${section?.status}`);
      return updated;
    });
  };

  const activeSections = sections.filter((s) => s.status === 'Active');

  return (
    <Shell title="Homepage Builder">
      {/* Info banner */}
      <div className="card p-4 mb-6 flex items-start gap-3" style={{ borderColor: 'rgba(100,160,255,0.3)', background: 'rgba(100,160,255,0.06)' }}>
        <Info size={16} style={{ color: '#64A0FF', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--t)' }}>Homepage Builder</strong> — changes made here are reflected in the mobile
          app's featured sections. Toggle sections between Active and Draft to control what users see.
          Visibility config is stored locally; connect a CMS API for team-wide changes.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Sections table */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="serif text-lg" style={{ margin: 0 }}>Sections</h3>
              <p style={{ fontSize: 12, color: 'var(--t3)', margin: '4px 0 0' }}>
                {activeSections.length} of {sections.length} active
              </p>
            </div>
          </div>
          <table className="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Section</th>
                <th>Type</th>
                <th>Items</th>
                <th>Status</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.order}>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.order}</td>
                  <td className="font-semibold text-white">{s.name}</td>
                  <td><span className="accent-pill">{s.type}</span></td>
                  <td style={{ color: 'var(--t2)' }}>{s.items > 0 ? s.items : '—'}</td>
                  <td>
                    <span className={s.status === 'Active' ? 'badge-active' : 'badge-pending'}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleStatus(s.order)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      title={`Set to ${s.status === 'Active' ? 'Draft' : 'Active'}`}
                    >
                      {s.status === 'Active'
                        ? <ToggleRight size={22} style={{ color: 'var(--accent)' }} />
                        : <ToggleLeft size={22} style={{ color: 'var(--t3)' }} />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Featured Gyms preview */}
          <div style={{ marginTop: 28 }}>
            <h4 className="kicker" style={{ marginBottom: 12 }}>Current Featured Gyms (live from API)</h4>
            {gymsLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse" style={{ height: 60, borderRadius: 10, background: 'var(--surface)' }} />
                ))}
              </div>
            ) : featuredGyms.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--t3)' }}>No featured gyms found from API.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {featuredGyms.map((gym, i) => (
                  <div key={gym.id ?? i} className="glass p-3" style={{ borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t)', marginBottom: 2 }}>{gym.name ?? 'Unnamed Gym'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{gym.city ?? gym.location ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Phone preview */}
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Preview</h3>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', aspectRatio: '9/16' }}>
            <div className="p-4 space-y-3">
              {activeSections.map((s) => {
                if (s.type === 'Carousel') {
                  return (
                    <div key={s.order}>
                      <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.name}</div>
                      <div style={{ height: 52, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-glow, rgba(0,200,100,0.2)), rgba(0,120,255,0.2))' }} />
                    </div>
                  );
                }
                if (s.type === 'Grid') {
                  return (
                    <div key={s.order}>
                      <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {Array.from({ length: Math.min(s.items, 4) }).map((_, i) => (
                          <div key={i} style={{ height: 32, borderRadius: 6, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={s.order}>
                    <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: 4, overflowX: 'hidden' }}>
                      {Array.from({ length: Math.min(s.items || 3, 3) }).map((_, i) => (
                        <div key={i} style={{ height: 24, flex: '0 0 40%', borderRadius: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {activeSections.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, color: 'var(--t3)' }}>
                  No active sections
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
