'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { X, CheckCircle, Plus } from 'lucide-react';

interface Category { id: string; name: string; }
interface Amenity { id: string; name: string; status?: string; requestedBy?: string; }

function Skeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl" style={{ width: 100, height: 36, background: 'var(--surface)' }} />
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
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [cats, amens] = await Promise.all([
        api.get('/master/categories'),
        api.get('/master/amenities'),
      ]);
      const catArr: Category[] = Array.isArray(cats) ? cats : cats?.data ?? [];
      const amenArr: Amenity[] = Array.isArray(amens) ? amens : amens?.data ?? [];
      setCategories(catArr);
      setAmenities(amenArr.filter((a) => a.status !== 'pending'));
      setPending(amenArr.filter((a) => a.status === 'pending'));
    } catch (e: any) {
      toast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/master/categories', { name: newCat.trim() });
      toast('Category added successfully');
      setNewCat('');
      load();
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
      await api.post('/master/amenities', { name: newAmen.trim() });
      toast('Amenity added successfully');
      setNewAmen('');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to add amenity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      await api.post(`/master/amenities/${id}/approve`);
      toast('Amenity request approved');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to approve', 'error');
    }
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast('Category removed', 'info');
  };

  const removeAmenity = (id: string) => {
    setAmenities((prev) => prev.filter((a) => a.id !== id));
    toast('Amenity removed', 'info');
  };

  return (
    <Shell title="Categories & Amenities">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Categories */}
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Workout Categories</h3>
          <div className="flex gap-2 mb-4">
            <input
              className="glass-input flex-1"
              placeholder="New category name..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button className="btn btn-primary flex items-center gap-1" onClick={addCategory} disabled={submitting || !newCat.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>
          {loading ? <Skeleton /> : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <div key={c.id} className="card px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--border)' }}>
                  <span className="text-[13px] text-white font-medium">{c.name}</span>
                  <button onClick={() => removeCategory(c.id)} style={{ color: 'rgba(255,100,100,0.7)', lineHeight: 1 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && <p style={{ color: 'var(--t3)', fontSize: 13 }}>No categories yet</p>}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div className="glass p-6">
          <h3 className="serif text-lg mb-4">Amenities</h3>
          <div className="flex gap-2 mb-4">
            <input
              className="glass-input flex-1"
              placeholder="New amenity name..."
              value={newAmen}
              onChange={(e) => setNewAmen(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
            />
            <button className="btn btn-primary flex items-center gap-1" onClick={addAmenity} disabled={submitting || !newAmen.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>
          {loading ? <Skeleton /> : (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <div key={a.id} className="card px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--border)' }}>
                  <span className="text-[13px] text-white font-medium">{a.name}</span>
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

      {/* Pending Requests */}
      <div className="glass p-6 mt-5">
        <h3 className="serif text-lg mb-4">Pending Amenity Requests</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--surface)' }} />)}
          </div>
        ) : pending.length === 0 ? (
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <span className="text-white font-semibold text-[13px]">{r.name}</span>
                  {r.requestedBy && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--t2)' }}>from {r.requestedBy}</span>
                  )}
                  <span className="ml-2 accent-pill">Amenity</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary text-xs flex items-center gap-1" onClick={() => approveRequest(r.id)}>
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button className="btn btn-ghost text-xs flex items-center gap-1" onClick={() => removeAmenity(r.id)}>
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
