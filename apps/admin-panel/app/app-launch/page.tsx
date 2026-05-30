'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

type Slide = {
  id?: string;
  imageUrl: string;
  title: string;
  description: string;
  aurora?: string[];
};

type LaunchConfig = {
  _version?: number;
  splash: {
    minDurationMs: number;
    logoUrl: string;
    imageUrl: string;
    title: string;
    subtitle: string;
    backgroundColor: string;
    showSpinner: boolean;
  };
  onboarding: {
    kicker: string;
    slides: Slide[];
  };
};

const DEFAULT_CONFIG: LaunchConfig = {
  _version: 1,
  splash: {
    minDurationMs: 1400,
    logoUrl: '',
    imageUrl: '',
    title: 'BookMyFit',
    subtitle: 'Opening BookMyFit...',
    backgroundColor: '#060606',
    showSpinner: true,
  },
  onboarding: {
    kicker: 'BOOKMYFIT',
    slides: [
      {
        id: 'train-anywhere',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        title: 'Train Anywhere',
        description: 'One subscription. Access gyms across your city.',
        aurora: ['rgba(120,40,200,0.45)', 'rgba(255,120,40,0.25)'],
      },
      {
        id: 'qr-check-in',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        title: 'QR Check-In',
        description: 'Book a slot and get a secure QR code for the gym desk.',
        aurora: ['rgba(0,140,255,0.35)', 'rgba(120,40,200,0.30)'],
      },
      {
        id: 'track-progress',
        imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        title: 'Track Progress',
        description: 'See your visits, memberships, trainer add-ons, and bookings.',
        aurora: ['rgba(0,212,106,0.20)', 'rgba(0,140,255,0.30)'],
      },
    ],
  },
};

function cloneDefault(): LaunchConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeConfig(value: any): LaunchConfig {
  const base = cloneDefault();
  const slides = Array.isArray(value?.onboarding?.slides) && value.onboarding.slides.length
    ? value.onboarding.slides
    : base.onboarding.slides;
  return {
    _version: 1,
    splash: {
      ...base.splash,
      ...(value?.splash || {}),
      minDurationMs: Math.max(500, Math.min(10000, Number(value?.splash?.minDurationMs) || base.splash.minDurationMs)),
      showSpinner: value?.splash?.showSpinner !== false,
    },
    onboarding: {
      kicker: value?.onboarding?.kicker || base.onboarding.kicker,
      slides: slides.map((slide: any, index: number) => ({
        id: slide.id || `slide-${index + 1}`,
        imageUrl: slide.imageUrl || slide.image || '',
        title: slide.title || '',
        description: slide.description || slide.subtitle || '',
        aurora: Array.isArray(slide.aurora) && slide.aurora.length >= 2 ? slide.aurora : base.onboarding.slides[index % base.onboarding.slides.length].aurora,
      })),
    },
  };
}

function newSlide(index: number): Slide {
  return {
    id: `slide-${Date.now()}`,
    imageUrl: '',
    title: `Onboarding Page ${index + 1}`,
    description: '',
    aurora: ['rgba(0,212,106,0.22)', 'rgba(255,30,90,0.16)'],
  };
}

export default function AppLaunchPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LaunchConfig>(cloneDefault);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/admin/mobile-launch-config')
      .then((data) => { if (alive) setConfig(normalizeConfig(data)); })
      .catch((err: any) => toast(err?.message || 'Could not load app launch content', 'error'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [toast]);

  const slides = config.onboarding.slides;
  const activeSlide = slides[selected] || slides[0];
  const canDelete = slides.length > 3;

  const validation = useMemo(() => {
    if (!config.splash.title.trim()) return 'Splash title is required';
    if (!config.splash.subtitle.trim()) return 'Splash description is required';
    if (slides.length < 3) return 'Minimum 3 onboarding pages are required';
    const bad = slides.findIndex((slide) => !slide.title.trim() || !slide.description.trim());
    if (bad >= 0) return `Onboarding page ${bad + 1} needs title and description`;
    return '';
  }, [config.splash.subtitle, config.splash.title, slides]);

  const updateSplash = (key: keyof LaunchConfig['splash'], value: string | number | boolean) => {
    setConfig((prev) => ({ ...prev, splash: { ...prev.splash, [key]: value } }));
  };

  const updateSlide = (index: number, key: keyof Slide, value: string) => {
    setConfig((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        slides: prev.onboarding.slides.map((slide, i) => i === index ? { ...slide, [key]: value } : slide),
      },
    }));
  };

  const addSlide = () => {
    setConfig((prev) => {
      const next = [...prev.onboarding.slides, newSlide(prev.onboarding.slides.length)];
      setSelected(next.length - 1);
      return { ...prev, onboarding: { ...prev.onboarding, slides: next } };
    });
  };

  const deleteSlide = (index: number) => {
    if (!canDelete) {
      toast('Minimum 3 onboarding pages are required', 'error');
      return;
    }
    setConfig((prev) => {
      const next = prev.onboarding.slides.filter((_, i) => i !== index);
      setSelected(Math.max(0, Math.min(index, next.length - 1)));
      return { ...prev, onboarding: { ...prev.onboarding, slides: next } };
    });
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setConfig((prev) => {
      const next = [...prev.onboarding.slides];
      [next[index], next[target]] = [next[target], next[index]];
      setSelected(target);
      return { ...prev, onboarding: { ...prev.onboarding, slides: next } };
    });
  };

  const resetDefaults = () => {
    setConfig(cloneDefault());
    setSelected(0);
    toast('Defaults loaded. Click Save to publish them.', 'info');
  };

  const save = async () => {
    if (validation) {
      toast(validation, 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await api.put('/admin/mobile-launch-config', config);
      setConfig(normalizeConfig(saved));
      toast('App launch content saved');
    } catch (err: any) {
      toast(err?.message || 'Failed to save app launch content', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="App Launch">
      <div className="card p-4 mb-6 flex items-start justify-between gap-4 flex-wrap" style={{ borderColor: 'rgba(100,160,255,0.3)', background: 'rgba(100,160,255,0.06)' }}>
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--t)' }}>Splash and onboarding content</strong> controls what users see when they open the mobile app.
          The splash appears on every app launch. Onboarding appears for new users until they tap Get Started.
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button className="btn btn-ghost" onClick={resetDefaults}><RotateCcw size={14} /> Defaults</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || Boolean(validation)}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass p-6">Loading app launch content...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="glass p-6">
              <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                <div>
                  <h3 className="serif text-lg mb-2">Splash Screen</h3>
                  <p className="text-sm" style={{ color: 'var(--t2)' }}>
                    Set the image, text, and minimum display time shown every time users open the app.
                  </p>
                </div>
                <span className="accent-pill">{Math.round(config.splash.minDurationMs / 100) / 10}s</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="kicker block mb-1">Logo Image URL</label>
                  <input className="glass-input w-full" value={config.splash.logoUrl} onChange={(e) => updateSplash('logoUrl', e.target.value)} placeholder="Optional. Uses global logo if blank." />
                </div>
                <div>
                  <label className="kicker block mb-1">Background Image URL</label>
                  <input className="glass-input w-full" value={config.splash.imageUrl} onChange={(e) => updateSplash('imageUrl', e.target.value)} placeholder="Optional splash background image" />
                </div>
                <div>
                  <label className="kicker block mb-1">Title</label>
                  <input className="glass-input w-full" value={config.splash.title} onChange={(e) => updateSplash('title', e.target.value)} maxLength={80} />
                </div>
                <div>
                  <label className="kicker block mb-1">Background Color</label>
                  <input className="glass-input w-full" value={config.splash.backgroundColor} onChange={(e) => updateSplash('backgroundColor', e.target.value)} placeholder="#060606" />
                </div>
                <div className="md:col-span-2">
                  <label className="kicker block mb-1">Description</label>
                  <input className="glass-input w-full" value={config.splash.subtitle} onChange={(e) => updateSplash('subtitle', e.target.value)} maxLength={180} />
                </div>
                <div>
                  <label className="kicker block mb-1">Minimum Display Time</label>
                  <input className="glass-input w-full" type="number" min={500} max={10000} step={100} value={config.splash.minDurationMs} onChange={(e) => updateSplash('minDurationMs', Number(e.target.value))} />
                </div>
                <label className="flex items-center gap-3 text-sm pt-6" style={{ color: 'var(--t2)' }}>
                  <input type="checkbox" checked={config.splash.showSpinner} onChange={(e) => updateSplash('showSpinner', e.target.checked)} />
                  Show loading spinner
                </label>
              </div>
            </div>

            <div className="glass p-6">
              <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                <div>
                  <h3 className="serif text-lg mb-2">Onboarding Pages</h3>
                  <p className="text-sm" style={{ color: 'var(--t2)' }}>
                    Minimum 3 pages are required. You can add more pages, reorder them, and edit every image/title/description.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={addSlide}><Plus size={14} /> Add Page</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
                <div className="space-y-3">
                  {slides.map((slide, index) => (
                    <button
                      key={`${slide.id}-${index}`}
                      type="button"
                      onClick={() => setSelected(index)}
                      className="glass w-full text-left p-3"
                      style={{
                        borderRadius: 12,
                        borderColor: selected === index ? 'var(--accent-border)' : 'var(--glass-border)',
                        background: selected === index ? 'rgba(204,255,0,0.10)' : 'var(--glass-bg)',
                      }}
                    >
                      <div className="flex gap-3">
                        <div style={{ width: 58, height: 58, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                          {slide.imageUrl ? <img src={slide.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={22} style={{ margin: 18, color: 'var(--t3)' }} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="kicker mb-1">Page {index + 1}</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title || 'Untitled'}</div>
                          <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 3 }}>{slide.description ? `${slide.description.slice(0, 46)}${slide.description.length > 46 ? '...' : ''}` : 'Description required'}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {activeSlide && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h4 className="serif text-lg">Edit Page {selected + 1}</h4>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={() => moveSlide(selected, -1)} disabled={selected === 0}><ArrowUp size={14} /></button>
                        <button className="btn btn-ghost" onClick={() => moveSlide(selected, 1)} disabled={selected === slides.length - 1}><ArrowDown size={14} /></button>
                        <button className="btn btn-ghost" onClick={() => deleteSlide(selected)} disabled={!canDelete} style={{ color: '#ff6b6b', opacity: canDelete ? 1 : 0.45 }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="kicker block mb-1">Image URL</label>
                        <input className="glass-input w-full" value={activeSlide.imageUrl} onChange={(e) => updateSlide(selected, 'imageUrl', e.target.value)} placeholder="https://.../onboarding.jpg" />
                      </div>
                      <div>
                        <label className="kicker block mb-1">Title</label>
                        <input className="glass-input w-full" value={activeSlide.title} onChange={(e) => updateSlide(selected, 'title', e.target.value)} maxLength={80} />
                      </div>
                      <div>
                        <label className="kicker block mb-1">Description</label>
                        <textarea className="glass-input w-full" rows={4} value={activeSlide.description} onChange={(e) => updateSlide(selected, 'description', e.target.value)} maxLength={260} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="serif text-lg mb-4">Phone Preview</h3>
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', aspectRatio: '9/16', background: config.splash.backgroundColor || '#060606' }}>
              <div style={{ height: '44%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {config.splash.imageUrl ? <img src={config.splash.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} /> : null}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(204,255,0,0.18), rgba(255,30,90,0.08), transparent)' }} />
                <div style={{ position: 'relative', textAlign: 'center', padding: 18 }}>
                  {config.splash.logoUrl ? <img src={config.splash.logoUrl} alt="" style={{ width: 150, maxHeight: 64, objectFit: 'contain', margin: '0 auto 12px' }} /> : <div className="accent-pill mb-3">BMF</div>}
                  <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{config.splash.title}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 12, marginTop: 6 }}>{config.splash.subtitle}</div>
                </div>
              </div>
              <div style={{ height: '56%', position: 'relative', background: '#080808' }}>
                {activeSlide?.imageUrl ? <img src={activeSlide.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} /> : null}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.86))' }} />
                <div style={{ position: 'absolute', left: 22, right: 22, bottom: 32 }}>
                  <div className="kicker mb-2" style={{ color: 'var(--accent)' }}>{config.onboarding.kicker}</div>
                  <div style={{ color: '#fff', fontSize: 26, fontFamily: 'var(--serif)', lineHeight: 1.05 }}>{activeSlide?.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.45, marginTop: 8 }}>{activeSlide?.description}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 18 }}>
                    {slides.map((_, index) => <span key={index} style={{ width: index === selected ? 20 : 6, height: 6, borderRadius: 999, background: index === selected ? 'var(--accent)' : 'rgba(255,255,255,0.25)' }} />)}
                  </div>
                </div>
              </div>
            </div>
            {validation ? <div className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{validation}</div> : <div className="mt-4 text-sm" style={{ color: 'var(--success)' }}>Ready to publish</div>}
          </div>
        </div>
      )}
    </Shell>
  );
}
