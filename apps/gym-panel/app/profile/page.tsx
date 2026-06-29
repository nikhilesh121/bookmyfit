'use client';

import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Star, Check, AlertTriangle, Image as ImageIcon, Video, Trash2, Plus, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import LocationFields from '../../components/LocationFields';

interface FormState {
  displayName: string;
  description: string;
  address: string;
  country: string;
  state: string;
  city: string;
  area: string;
  pinCode: string;
  phone: string;
  email: string;
  website: string;
  lat: string;
  lng: string;
}

interface CategoryOption {
  id: string;
  _id?: string;
  name: string;
}

const MAX_PROFILE_PHOTOS = 12;
const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseGymCoordinates(latValue: string, lngValue: string) {
  const latText = latValue.trim();
  const lngText = lngValue.trim();
  if (!latText || !lngText) {
    throw new Error('Use GPS or enter both latitude and longitude before saving');
  }
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Latitude must be a number between -90 and 90');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Longitude must be a number between -180 and 180');
  }
  if (lat === 0 && lng === 0) {
    throw new Error('Use the real gym location, not 0 latitude and 0 longitude');
  }
  return { lat, lng };
}

export default function ProfilePage() {
  const [form, setForm] = useState<FormState>({
    displayName: '',
    description: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    area: '',
    pinCode: '',
    phone: '',
    email: '',
    website: '',
    lat: '',
    lng: '',
  });

  const [gymId, setGymId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerTier, setPartnerTier] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [essentials, setEssentials] = useState<string[]>([]);
  const [newEssential, setNewEssential] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [data, catData] = await Promise.all([
          api.get('/gyms/my-gym'),
          api.get('/master/categories'),
        ]);
        const categoryList = Array.isArray(catData) ? catData : catData?.data || [];
        setCategories(categoryList.map((category: CategoryOption) => ({
          ...category,
          id: category.id || category._id || category.name,
        })));
        setSelectedCategories(Array.isArray(data.categories) ? data.categories : []);
        const coverPhoto = typeof data.coverPhoto === 'string' && data.coverPhoto.trim()
          ? data.coverPhoto
          : (typeof data.coverImage === 'string' && data.coverImage.trim() ? data.coverImage : null);
        const photoList = [
          ...(coverPhoto ? [coverPhoto] : []),
          ...(Array.isArray(data.photos)
            ? data.photos
            : (Array.isArray(data.images) ? data.images : [])),
        ];
        const cleanPhotos = photoList
          .filter((url: any): url is string => typeof url === 'string' && url.trim().length > 0)
          .map((url: string) => url.trim());
        setPhotos([...new Set<string>(cleanPhotos)]);
        setVideos(Array.isArray(data.videos) ? data.videos.filter((url: any) => typeof url === 'string' && url.trim()).map((url: string) => url.trim()) : []);
        setEssentials(Array.isArray(data.essentials) ? data.essentials.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()) : []);
        setGymId(data._id || data.id || '');
        setPartnerTier(data.partnerTier || data.tier || '');
        setRating(data.rating || data.avgRating || null);
        setForm({
          displayName: data.name || data.displayName || '',
          description: data.description || '',
          address: data.address || '',
          country: data.country || 'India',
          state: data.state || '',
          city: data.city || '',
          area: data.area || '',
          pinCode: data.pinCode || data.pincode || '',
          phone: data.phone || data.contactPhone || '',
          email: data.email || data.contactEmail || '',
          website: data.website || '',
          lat: data.lat != null ? String(data.lat) : '',
          lng: data.lng != null ? String(data.lng) : '',
        });
      } catch (e: any) {
        setError(e?.message || 'Could not load gym profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (selectedCategories.length === 0) throw new Error('Select at least one workout category');
      const endpoint = gymId ? `/gyms/${gymId}` : '/gyms/my-gym';
      await api.put(endpoint, {
        name: form.displayName,
        description: form.description,
        address: form.address,
        country: form.country,
        state: form.state,
        city: form.city,
        area: form.area,
        pinCode: form.pinCode,
        contactPhone: form.phone,
        contactEmail: form.email,
        website: form.website,
        categories: selectedCategories,
        coverPhoto: photos[0] || null,
        photos,
        videos,
        essentials,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => (
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    ));
  };

  const addMediaUrl = (kind: 'photo' | 'video') => {
    const value = (kind === 'photo' ? newPhotoUrl : newVideoUrl).trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      setError('Use a valid http or https media URL');
      return;
    }
    if (kind === 'photo') {
      if (!photos.includes(value) && photos.length >= MAX_PROFILE_PHOTOS) {
        setError(`You can add up to ${MAX_PROFILE_PHOTOS} profile photos.`);
        return;
      }
      setError(null);
      setPhotos((prev) => [...new Set([...prev, value])].slice(0, MAX_PROFILE_PHOTOS));
      setNewPhotoUrl('');
    } else {
      setError(null);
      setVideos((prev) => [...new Set([...prev, value])]);
      setNewVideoUrl('');
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!gymId) throw new Error('Gym profile is still loading. Please try again.');
    const body = new FormData();
    body.append('file', file);
    const uploaded = await api.postForm<{ url?: string }>(`/gyms/${gymId}/profile-photos/upload`, body);
    if (!uploaded?.url) throw new Error(`${file.name}: upload did not return an image URL`);
    return uploaded.url;
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setError(null);
    setProcessingPhotos(true);

    try {
      const selectedFiles = Array.from(files);
      const remainingSlots = Math.max(MAX_PROFILE_PHOTOS - photos.length, 0);
      const acceptedFiles = selectedFiles.slice(0, remainingSlots);
      const skipped: string[] = [];

      if (remainingSlots === 0) {
        setError(`You can add up to ${MAX_PROFILE_PHOTOS} profile photos.`);
        return;
      }

      if (selectedFiles.length > remainingSlots) {
        const skippedCount = selectedFiles.length - remainingSlots;
        skipped.push(`${skippedCount} image${skippedCount === 1 ? '' : 's'} skipped because the profile can hold ${MAX_PROFILE_PHOTOS} photos`);
      }

      const uploadedUrls: string[] = [];
      for (const file of acceptedFiles) {
        if (!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) {
          skipped.push(`${file.name}: JPG, PNG or WebP only`);
          continue;
        }
        if (file.size > MAX_PROFILE_IMAGE_BYTES) {
          skipped.push(`${file.name}: over 10 MB`);
          continue;
        }
        uploadedUrls.push(await uploadProfilePhoto(file));
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...new Set([...prev, ...uploadedUrls])].slice(0, MAX_PROFILE_PHOTOS));
      }

      if (skipped.length > 0) {
        setError(`Some images were skipped. ${skipped.slice(0, 3).join('; ')}${skipped.length > 3 ? '; ...' : ''}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not upload selected images.');
    } finally {
      setProcessingPhotos(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((item) => item !== url));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [photo] = next.splice(index, 1);
      next.splice(targetIndex, 0, photo);
      return next;
    });
  };

  const makeCoverPhoto = (url: string) => {
    setPhotos((prev) => [url, ...prev.filter((item) => item !== url)]);
  };

  const addEssential = () => {
    const value = newEssential.trim();
    if (!value) return;
    setEssentials((prev) => (prev.some((x) => x.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setNewEssential('');
  };

  const removeEssential = (item: string) => {
    setEssentials((prev) => prev.filter((x) => x !== item));
  };

  const ESSENTIAL_SUGGESTIONS = ['Towel', 'Water Bottle', 'Workout Shoes', 'ID Proof', 'Membership QR Code'];

  const hasValidLocation = (() => {
    try {
      parseGymCoordinates(form.lat, form.lng);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <Shell title="Gym Profile">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="glass p-6 flex flex-col items-center gap-4">
          {loading ? (
            <>
              <div className="w-20 h-20 rounded-full animate-pulse" style={{ background: 'var(--surface)' }} />
              <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
              <div className="w-32 h-3 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
              <div className="w-full space-y-3 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-4 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
                ))}
              </div>
            </>
          ) : (
            <>
              {photos[0] ? (
                <div
                  className="w-24 h-24 rounded-2xl"
                  style={{
                    backgroundImage: `url(${photos[0]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '2px solid var(--accent)',
                  }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface)', border: '2px solid var(--accent)' }}
                >
                  <Building2 size={32} style={{ color: 'var(--accent)' }} />
                </div>
              )}

              <div className="text-xs text-center" style={{ color: 'var(--t3)' }}>
                {photos.length} image{photos.length === 1 ? '' : 's'} and {videos.length} video{videos.length === 1 ? '' : 's'} on profile
              </div>

              <div className="text-center">
                <p className="serif text-lg font-bold" style={{ color: 'var(--t)' }}>
                  {form.displayName || '--'}
                </p>
              </div>

              {partnerTier && <span className="accent-pill">{partnerTier}</span>}

              {rating !== null && (
                <div className="flex items-center gap-1">
                  <Star size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--t)' }}>{Number(rating).toFixed(1)}</span>
                </div>
              )}

              <div className="w-full space-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                  <MapPin size={14} />
                  <span>{form.address || '--'}{form.area ? `, ${form.area}` : ''}{form.city ? `, ${form.city}` : ''}{form.state ? `, ${form.state}` : ''}</span>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: hasValidLocation ? 'rgba(61,255,84,0.07)' : 'rgba(255,180,0,0.07)',
                    border: hasValidLocation ? '1px solid rgba(61,255,84,0.16)' : '1px solid rgba(255,180,0,0.22)',
                  }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: hasValidLocation ? 'var(--accent)' : '#FFB400' }}>
                    {hasValidLocation ? 'Nearby discovery ready' : 'Location required'}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
                    {hasValidLocation
                      ? `Lat ${form.lat}, Lng ${form.lng}`
                      : 'Set GPS coordinates in Settings so users can find this gym near them.'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                  <Phone size={14} />
                  <span>{form.phone || '--'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                  <Mail size={14} />
                  <span>{form.email || '--'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                  <Globe size={14} />
                  <span>{form.website || '--'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 glass p-6">
          <p className="serif text-lg font-bold mb-5" style={{ color: 'var(--t)' }}>Edit Profile</p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--error)' }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              {/* Display Name */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                  Display Name
                </label>
                <input
                  className="glass-input w-full"
                  value={form.displayName}
                  onChange={handleChange('displayName')}
                  placeholder="Gym display name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                  Description
                </label>
                <textarea
                  className="glass-input w-full h-20 resize-none"
                  value={form.description}
                  onChange={handleChange('description')}
                  placeholder="Brief description of your gym"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--t2)' }}>
                  Gym Essentials <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(what members should carry)</span>
                </label>
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="glass-input flex-1 min-w-0"
                      placeholder="e.g. Towel, Water Bottle, ID Proof..."
                      value={newEssential}
                      onChange={(e) => setNewEssential(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEssential())}
                    />
                    <button className="btn btn-ghost flex items-center gap-1" type="button" onClick={addEssential}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {essentials.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {essentials.map((item) => (
                        <span
                          key={item}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                          style={{ background: 'rgba(61,255,84,0.08)', border: '1px solid rgba(61,255,84,0.18)', color: 'var(--t)' }}
                        >
                          {item}
                          <button type="button" onClick={() => removeEssential(item)} style={{ color: '#FF8080', lineHeight: 1 }} title="Remove">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {ESSENTIAL_SUGGESTIONS.filter((s) => !essentials.some((e) => e.toLowerCase() === s.toLowerCase())).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEssentials((prev) => [...prev, s])}
                        className="text-xs"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.18)', color: 'var(--t3)', borderRadius: 8, padding: '5px 10px' }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                  {essentials.length === 0 && (
                    <div className="text-xs" style={{ color: 'var(--t3)' }}>
                      No essentials added yet. These appear on the gym details page in the app.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--t2)' }}>
                  Workout Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = selectedCategories.includes(category.name);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.name)}
                        className={active ? 'btn btn-primary text-xs' : 'btn btn-ghost text-xs'}
                        style={{ padding: '8px 12px' }}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>
                      Admin has not created workout categories yet.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--t2)' }}>
                  Profile Photos & Videos
                </label>
                <div
                  className="rounded-xl p-4 space-y-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
                    Photos appear in the user app gym profile. Add up to {MAX_PROFILE_PHOTOS} JPG, PNG or WebP images, 1200x800 px recommended, under 10 MB each. First image is the cover.
                    Videos should be MP4/WebM links, 16:9, up to 45 seconds.
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoFiles(e.target.files)}
                    />
                    <button
                      className="btn btn-primary flex items-center justify-center gap-2"
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={processingPhotos || photos.length >= MAX_PROFILE_PHOTOS}
                    >
                      <Upload size={14} />
                      {processingPhotos ? 'Adding...' : 'Upload Images'}
                    </button>
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>
                      {photos.length}/{MAX_PROFILE_PHOTOS} photos added
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="glass-input flex-1 min-w-0"
                      placeholder="Or paste image URL..."
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMediaUrl('photo')}
                    />
                    <button className="btn btn-ghost flex items-center gap-1" type="button" onClick={() => addMediaUrl('photo')}>
                      <Plus size={14} /> Image
                    </button>
                  </div>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {photos.map((url, index) => (
                        <div key={`${url.slice(0, 80)}-${index}`} className="relative rounded-xl overflow-hidden" style={{ height: 116, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <img src={url} alt={`Gym profile photo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {index === 0 ? (
                            <span className="absolute left-2 top-2 accent-pill text-[10px]">Cover</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => makeCoverPhoto(url)}
                              className="absolute left-2 top-2 rounded-lg p-1"
                              style={{ background: 'rgba(0,0,0,0.72)', color: 'var(--accent)' }}
                              title="Make cover"
                            >
                              <Star size={13} />
                            </button>
                          )}
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => movePhoto(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg p-1"
                              style={{ background: 'rgba(0,0,0,0.72)', color: index === 0 ? 'rgba(255,255,255,0.35)' : '#fff' }}
                              title="Move image up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(index, 1)}
                              disabled={index === photos.length - 1}
                              className="rounded-lg p-1"
                              style={{ background: 'rgba(0,0,0,0.72)', color: index === photos.length - 1 ? 'rgba(255,255,255,0.35)' : '#fff' }}
                              title="Move image down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(url)}
                              className="rounded-lg p-1"
                              style={{ background: 'rgba(0,0,0,0.72)', color: '#FF8080' }}
                              title="Remove image"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="glass-input flex-1 min-w-0"
                      placeholder="Paste video URL..."
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMediaUrl('video')}
                    />
                    <button className="btn btn-ghost flex items-center gap-1" type="button" onClick={() => addMediaUrl('video')}>
                      <Plus size={14} /> Video
                    </button>
                  </div>
                  {videos.length > 0 && (
                    <div className="space-y-2">
                      {videos.map((url) => (
                        <div key={url} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Video size={15} style={{ color: 'var(--accent)' }} />
                          <span className="text-xs flex-1 truncate" style={{ color: 'var(--t2)' }}>{url}</span>
                          <button type="button" onClick={() => setVideos((prev) => prev.filter((item) => item !== url))} style={{ color: '#FF8080' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {photos.length === 0 && videos.length === 0 && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--t3)' }}>
                      <ImageIcon size={14} /> No media added yet. User app will show the default gym image until photos are added.
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                  Address
                </label>
                <input
                  className="glass-input w-full"
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder="Street address"
                />
              </div>

              <LocationFields
                value={{ country: form.country, state: form.state, city: form.city }}
                onChange={(location) => setForm((prev) => ({ ...prev, ...location }))}
                inputClassName="glass-input w-full"
                gridClassName="grid grid-cols-1 md:grid-cols-3 gap-4"
              />

              {/* Area + Pin Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                    Area
                  </label>
                  <input
                    className="glass-input w-full"
                    value={form.area}
                    onChange={handleChange('area')}
                    placeholder="Area / locality"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                    Pin Code
                  </label>
                  <input
                    className="glass-input w-full"
                    value={form.pinCode}
                    onChange={handleChange('pinCode')}
                    placeholder="Pin code"
                  />
                </div>
              </div>

              <div
                className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
                  Gym location is managed from Settings. Gym users can submit it once; admin can correct it later.
                </div>
                <a href="/settings" className="btn btn-ghost text-xs">Manage Location</a>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                    Phone
                  </label>
                  <input
                    className="glass-input w-full"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                    Email
                  </label>
                  <input
                    className="glass-input w-full"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="contact@yourgym.com"
                    type="email"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>
                  Website
                </label>
                <input
                  className="glass-input w-full"
                  value={form.website}
                  onChange={handleChange('website')}
                  placeholder="www.yourgym.com"
                />
              </div>

              {/* Save Button */}
              <button
                className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={16} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>

              {saved && (
                <div className="flex items-center gap-2 text-sm mt-2" style={{ color: 'var(--accent)' }}>
                  <Check size={14} />
                  Profile saved successfully.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm mt-2" style={{ color: 'var(--error)' }}>
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
