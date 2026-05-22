'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  X, CheckCircle, Plus, Upload, Image as ImageIcon, Dumbbell, Activity,
  Zap, Sparkles, Lock, Wifi, Flame, Music, Waves, ParkingCircle, Snowflake,
  UserCheck, ShowerHead, Flower, Badge, Apple, Bike, HeartPulse, AirVent,
} from 'lucide-react';

interface Category { id: string; name: string; iconUrl?: string | null; }
interface Amenity {
  id: string;
  name: string;
  iconUrl?: string | null;
  status?: string;
  isActive?: boolean;
  requestedBy?: string;
  requestedByGymId?: string | null;
  requestedByUserId?: string | null;
}

type CatalogKind = 'category' | 'amenity';
type IconPreset = { key: string; label: string; Icon: any };

const MAX_ICON_BYTES = 80 * 1024;

const ICON_PRESETS: IconPreset[] = [
  { key: 'lucide:dumbbell', label: 'Gym', Icon: Dumbbell },
  { key: 'lucide:activity', label: 'Cardio', Icon: Activity },
  { key: 'lucide:zap', label: 'HIIT', Icon: Zap },
  { key: 'lucide:sparkles', label: 'Amenity', Icon: Sparkles },
  { key: 'lucide:lock-keyhole', label: 'Locker', Icon: Lock },
  { key: 'lucide:wifi', label: 'WiFi', Icon: Wifi },
  { key: 'lucide:flame', label: 'Sauna', Icon: Flame },
  { key: 'lucide:music', label: 'Dance', Icon: Music },
  { key: 'lucide:waves', label: 'Pool', Icon: Waves },
  { key: 'lucide:parking-circle', label: 'Parking', Icon: ParkingCircle },
  { key: 'lucide:snowflake', label: 'AC', Icon: Snowflake },
  { key: 'lucide:user-round-check', label: 'Trainer', Icon: UserCheck },
  { key: 'lucide:shower-head', label: 'Shower', Icon: ShowerHead },
  { key: 'lucide:flower', label: 'Yoga', Icon: Flower },
  { key: 'lucide:badge', label: 'Boxing', Icon: Badge },
  { key: 'lucide:apple', label: 'Nutrition', Icon: Apple },
  { key: 'lucide:bike', label: 'Cycle', Icon: Bike },
  { key: 'lucide:heart-pulse', label: 'Recovery', Icon: HeartPulse },
  { key: 'lucide:air-vent', label: 'Air Flow', Icon: AirVent },
];

const iconMap = new Map(ICON_PRESETS.map((preset) => [preset.key, preset.Icon]));

function requestSourceLabel(amenity: Amenity) {
  if (amenity.requestedBy) return `from ${amenity.requestedBy}`;
  if (amenity.requestedByGymId) return `from gym ${amenity.requestedByGymId.slice(0, 8)}`;
  if (amenity.requestedByUserId) return `from user ${amenity.requestedByUserId.slice(0, 8)}`;
  return 'from gym request';
}

function defaultIcon(kind: CatalogKind) {
  return kind === 'amenity' ? 'lucide:sparkles' : 'lucide:dumbbell';
}

function IconPreview({ iconUrl, size = 28 }: { iconUrl?: string | null; size?: number }) {
  const value = String(iconUrl || '').trim();
  const Icon = iconMap.get(value) || (value.startsWith('lucide:') ? Sparkles : null);
  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(204,255,0,0.10)',
    border: '1px solid rgba(204,255,0,0.18)',
    flexShrink: 0,
    overflow: 'hidden',
  };
  if (Icon) {
    return <span style={boxStyle}><Icon size={Math.max(14, size - 12)} color="var(--accent)" /></span>;
  }
  if (value) {
    return (
      <span style={boxStyle}>
        <img src={value} alt="" style={{ width: size - 10, height: size - 10, objectFit: 'contain' }} />
      </span>
    );
  }
  return <span style={boxStyle}><ImageIcon size={Math.max(14, size - 12)} color="var(--accent)" /></span>;
}

function IconPicker({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(svg\+xml|png|webp|jpeg)$/.test(file.type)) {
      onError('Use SVG, PNG, JPG, or WebP icons only');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      onError('Icon file must be under 80 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ''));
    reader.onerror = () => onError('Could not read icon file');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <IconPreview iconUrl={value} size={38} />
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--t)' }}>Icon</div>
          <div className="text-[11px]" style={{ color: 'var(--t3)' }}>Use 64x64 square SVG/PNG/WebP, under 80 KB.</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ICON_PRESETS.map((preset) => {
          const active = value === preset.key;
          const Icon = preset.Icon;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(preset.key)}
              title={preset.label}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition"
              style={{
                background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: active ? '#000' : 'var(--t2)',
                border: active ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <Icon size={16} />
            </button>
          );
        })}
        <label
          className="h-9 px-3 rounded-lg flex items-center gap-2 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--t)' }}
        >
          <Upload size={14} />
          <span className="text-xs">Upload</span>
          <input className="hidden" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onChange={handleUpload} />
        </label>
      </div>
      <input
        className="glass-input w-full"
        placeholder="Or paste icon image URL..."
        value={value.startsWith('lucide:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl" style={{ width: 124, height: 42, background: 'var(--surface)' }} />
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [pending, setPending] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState('');
  const [newAmen, setNewAmen] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('lucide:dumbbell');
  const [newAmenIcon, setNewAmenIcon] = useState('lucide:sparkles');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<{ kind: CatalogKind; id: string; name: string; iconUrl: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catsResult, amensResult] = await Promise.allSettled([
        api.get('/master/categories'),
        api.get('/master/amenities/all'),
      ]);
      if (catsResult.status === 'rejected') throw catsResult.reason;
      const cats = catsResult.value;
      const amens = amensResult.status === 'fulfilled' ? amensResult.value : [];
      const catArr: Category[] = Array.isArray(cats) ? cats : Array.isArray(cats?.data) ? cats.data : [];
      const amenArr: Amenity[] = Array.isArray(amens) ? amens : Array.isArray(amens?.data) ? amens.data : [];
      setCategories(catArr);
      setAmenities(amenArr.filter((a) => (a.status || 'approved') === 'approved' && a.isActive !== false));
      setPending(amenArr.filter((a) => a.status === 'pending'));
      if (amensResult.status === 'rejected') toast(amensResult.reason?.message || 'Amenities could not load', 'error');
    } catch (e: any) {
      toast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/master/categories', { name: newCat.trim(), iconUrl: newCatIcon || 'lucide:dumbbell' });
      toast('Category added successfully');
      setNewCat('');
      setNewCatIcon('lucide:dumbbell');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to add category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const addAmenity = async () => {
    if (!newAmen.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/master/amenities', { name: newAmen.trim(), iconUrl: newAmenIcon || 'lucide:sparkles' });
      toast('Amenity added successfully');
      setNewAmen('');
      setNewAmenIcon('lucide:sparkles');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to add amenity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEditing = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast(`${editing.kind === 'category' ? 'Category' : 'Amenity'} name is required`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = editing.kind === 'category' ? '/master/categories' : '/master/amenities';
      await api.put(`${endpoint}/${editing.id}`, {
        name: editing.name.trim(),
        iconUrl: editing.iconUrl || defaultIcon(editing.kind),
      });
      toast(`${editing.kind === 'category' ? 'Category' : 'Amenity'} updated`);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast(e.message || `Failed to update ${editing.kind}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      await api.post(`/master/amenities/${id}/approve`);
      toast('Amenity request approved');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to approve', 'error');
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await api.del(`/master/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast('Category removed', 'info');
    } catch (e: any) {
      toast(e.message || 'Failed to remove category', 'error');
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await api.del(`/master/amenities/${id}`);
      toast('Amenity request rejected', 'info');
      await load();
    } catch (e: any) {
      toast(e.message || 'Failed to reject', 'error');
    }
  };

  const removeAmenity = async (id: string) => {
    try {
      await api.del(`/master/amenities/${id}`);
      setAmenities((prev) => prev.filter((a) => a.id !== id));
      setPending((prev) => prev.filter((a) => a.id !== id));
      toast('Amenity removed', 'info');
    } catch (e: any) {
      toast(e.message || 'Failed to remove amenity', 'error');
    }
  };

  return (
    <Shell title="Categories & Amenities">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass p-6">
          <h3 className="serif text-lg mb-1">Workout Categories / Session Names</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>
            Gyms choose these categories for profile filtering and special session names.
          </p>
          <div className="grid gap-3 mb-5">
            <input
              className="glass-input w-full"
              placeholder="New category name..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <IconPicker value={newCatIcon} onChange={setNewCatIcon} onError={(msg) => toast(msg, 'error')} />
            <button className="btn btn-primary flex items-center justify-center gap-1" onClick={addCategory} disabled={submitting || !newCat.trim()}>
              <Plus size={14} /> Add Category
            </button>
          </div>
          {loading ? <Skeleton /> : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <div key={c.id} className="card px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--border)' }}>
                  <IconPreview iconUrl={c.iconUrl} />
                  <span className="text-[13px] text-white font-medium">{c.name}</span>
                  <button onClick={() => setEditing({ kind: 'category', id: c.id, name: c.name, iconUrl: c.iconUrl || defaultIcon('category') })} className="text-[11px]" style={{ color: 'var(--accent)' }}>
                    Edit
                  </button>
                  <button onClick={() => removeCategory(c.id)} style={{ color: 'rgba(255,100,100,0.7)', lineHeight: 1 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && <p style={{ color: 'var(--t3)', fontSize: 13 }}>No categories yet</p>}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h3 className="serif text-lg mb-1">Amenities</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>
            Gyms can select approved amenities; new gym requests appear below for admin approval.
          </p>
          <div className="grid gap-3 mb-5">
            <input
              className="glass-input w-full"
              placeholder="New amenity name..."
              value={newAmen}
              onChange={(e) => setNewAmen(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
            />
            <IconPicker value={newAmenIcon} onChange={setNewAmenIcon} onError={(msg) => toast(msg, 'error')} />
            <button className="btn btn-primary flex items-center justify-center gap-1" onClick={addAmenity} disabled={submitting || !newAmen.trim()}>
              <Plus size={14} /> Add Amenity
            </button>
          </div>
          {loading ? <Skeleton /> : (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <div key={a.id} className="card px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--border)' }}>
                  <IconPreview iconUrl={a.iconUrl} />
                  <span className="text-[13px] text-white font-medium">{a.name}</span>
                  <button onClick={() => setEditing({ kind: 'amenity', id: a.id, name: a.name, iconUrl: a.iconUrl || defaultIcon('amenity') })} className="text-[11px]" style={{ color: 'var(--accent)' }}>
                    Edit
                  </button>
                  <button onClick={() => removeAmenity(a.id)} style={{ color: 'rgba(255,100,100,0.7)', lineHeight: 1 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {amenities.length === 0 && <p style={{ color: 'var(--t3)', fontSize: 13 }}>No amenities yet</p>}
            </div>
          )}
        </div>
      </div>

      <div className="glass p-6 mt-5">
        <h3 className="serif text-lg mb-4">Pending Amenity Requests</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--surface)' }} />)}
          </div>
        ) : pending.length === 0 ? (
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <IconPreview iconUrl={r.iconUrl} />
                  <div className="min-w-0">
                    <span className="text-white font-semibold text-[13px]">{r.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--t2)' }}>{requestSourceLabel(r)}</span>
                    <span className="ml-2 accent-pill">Amenity</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary text-xs flex items-center gap-1" onClick={() => approveRequest(r.id)}>
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button className="btn btn-ghost text-xs flex items-center gap-1" onClick={() => rejectRequest(r.id)}>
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <div className="glass p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="serif text-lg mb-1">Edit {editing.kind === 'category' ? 'Category' : 'Amenity'}</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>
              Update the name and icon used anywhere the app receives this master data.
            </p>
            <div className="mb-4">
              <label className="kicker block mb-1">{editing.kind === 'category' ? 'Category Name' : 'Amenity Name'}</label>
              <input
                className="glass-input w-full"
                value={editing.name}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder={editing.kind === 'category' ? 'Category name' : 'Amenity name'}
              />
            </div>
            <IconPicker
              value={editing.iconUrl}
              onChange={(iconUrl) => setEditing((prev) => prev ? { ...prev, iconUrl } : prev)}
              onError={(msg) => toast(msg, 'error')}
            />
            <div className="flex gap-3 mt-5">
              <button className="btn btn-ghost flex-1" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={saveEditing} disabled={submitting || !editing.name.trim()}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
