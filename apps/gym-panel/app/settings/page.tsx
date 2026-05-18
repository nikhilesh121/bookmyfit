'use client';

import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useEffect, useState } from 'react';
import { Settings, Bell, Shield, Edit2, Check, AlertTriangle, Eye, EyeOff, MapPin, Navigation } from 'lucide-react';

function parseGymCoordinates(latValue: string, lngValue: string) {
  const latText = latValue.trim();
  const lngText = lngValue.trim();
  if (!latText || !lngText) {
    throw new Error('Use GPS or enter both latitude and longitude for your gym location.');
  }
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Latitude must be a number between -90 and 90.');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Longitude must be a number between -180 and 180.');
  }
  if (lat === 0 && lng === 0) {
    throw new Error('Use the real gym location, not 0 latitude and 0 longitude.');
  }
  return { lat, lng };
}

function hasValidGymLocation(latValue: string, lngValue: string) {
  try {
    parseGymCoordinates(latValue, lngValue);
    return true;
  } catch {
    return false;
  }
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="relative cursor-pointer select-none"
      style={{
        width: 40,
        height: 20,
        borderRadius: 10,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'white',
          left: on ? 22 : 2,
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input w-full pr-10"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--t2)' }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function SkeletonField() {
  return (
    <div
      className="h-9 rounded-xl animate-pulse"
      style={{ background: 'rgba(255,255,255,0.07)' }}
    />
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState('');

  // General Info state
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [gymName, setGymName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Edit mode per group
  const [editingContact, setEditingContact] = useState(false);

  // Temp buffers for cancel
  const [tempCity, setTempCity] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const [toast, setToast] = useState('');

  // Notification toggles
  const [notifCheckin, setNotifCheckin] = useState(true);
  const [notifCapacity, setNotifCapacity] = useState(true);
  const [notifSettlement, setNotifSettlement] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    async function loadGym() {
      try {
        const res = await api.get('/gyms/my-gym');
        const data = res?.data ?? res;
        setGymId(data._id || data.id || '');
        setGymName(data.name ?? 'My Gym');
        setCity(data.city ?? '');
        setContactEmail(data.contactEmail ?? '');
        setContactPhone(data.contactPhone ?? '');
        setLat(data.lat != null ? String(data.lat) : '');
        setLng(data.lng != null ? String(data.lng) : '');
      } catch {
        showToast('Could not load gym settings.');
      } finally {
        setLoading(false);
      }
    }
    loadGym();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function startEditContact() {
    setTempCity(city);
    setTempEmail(contactEmail);
    setTempPhone(contactPhone);
    setEditingContact(true);
  }

  function cancelContact() {
    setCity(tempCity);
    setContactEmail(tempEmail);
    setContactPhone(tempPhone);
    setEditingContact(false);
  }

  async function saveContact() {
    try {
      const endpoint = gymId ? `/gyms/${gymId}` : '/gyms/my-gym';
      await api.put(endpoint, {
        city,
        contactEmail,
        contactPhone,
      });
    } catch (e: any) {
      showToast(e?.message || 'Contact details were not saved.');
      return;
    }
    setEditingContact(false);
    showToast('Contact details saved.');
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      showToast('GPS is not available in this browser. Enter coordinates manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setLocating(false);
        showToast('Could not read current location. Enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function submitLocation() {
    setSavingLocation(true);
    try {
      const location = parseGymCoordinates(lat, lng);
      const updated = await api.put('/gyms/my-gym/location', location);
      const data = updated?.data ?? updated;
      setLat(data.lat != null ? String(data.lat) : String(location.lat));
      setLng(data.lng != null ? String(data.lng) : String(location.lng));
      showToast('Gym location submitted.');
    } catch (e: any) {
      showToast(e?.message || 'Gym location was not saved.');
    } finally {
      setSavingLocation(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All fields are required.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirm password do not match.');
      return;
    }
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwSuccess('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err: any) {
      setPwError(err?.message || 'Password update failed.');
    }
  }

  const labelStyle: React.CSSProperties = { color: 'var(--t2)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 };
  const locationSubmitted = hasValidGymLocation(lat, lng);

  return (
    <Shell title="Gym Settings">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 4px 24px rgba(61,255,84,0.25)' }}
        >
          {toast}
        </div>
      )}

      {/* Section A - General Info */}
      <div className="glass p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} style={{ color: 'var(--accent)' }} />
          <span className="serif text-lg text-white">General Information</span>
        </div>

        {/* Gym Name (readonly) */}
        <div className="mb-5">
          <label style={labelStyle}>Gym Name</label>
          {loading ? (
            <SkeletonField />
          ) : (
            <input
              className="glass-input w-full"
              value={gymName}
              readOnly
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Gym name cannot be changed. Contact support if needed.</p>
        </div>

        {/* Contact fields */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--t)' }}>Contact Details</span>
            {!editingContact ? (
              <button
                className="btn btn-ghost flex items-center gap-1 text-xs"
                onClick={startEditContact}
                disabled={loading}
              >
                <Edit2 size={13} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button className="btn btn-primary flex items-center gap-1 text-xs" onClick={saveContact}>
                  <Check size={13} /> Save
                </button>
                <button className="btn btn-ghost text-xs" onClick={cancelContact}>Cancel</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SkeletonField />
              <SkeletonField />
              <SkeletonField />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label style={labelStyle}>City</label>
                <input
                  className="glass-input w-full"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  readOnly={!editingContact}
                  style={!editingContact ? { opacity: 0.7 } : {}}
                />
              </div>
              <div>
                <label style={labelStyle}>Contact Email</label>
                <input
                  className="glass-input w-full"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  readOnly={!editingContact}
                  style={!editingContact ? { opacity: 0.7 } : {}}
                />
              </div>
              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input
                  className="glass-input w-full"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  readOnly={!editingContact}
                  style={!editingContact ? { opacity: 0.7 } : {}}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t)' }}>
              <MapPin size={15} style={{ color: locationSubmitted ? 'var(--accent)' : '#FFB400' }} />
              Gym Location
            </span>
            <span
              className={locationSubmitted ? 'badge-active' : 'badge-pending'}
              style={{ fontSize: 10 }}
            >
              {locationSubmitted ? 'Submitted' : 'Required'}
            </span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SkeletonField />
              <SkeletonField />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Latitude</label>
                  <input
                    className="glass-input w-full"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    readOnly={locationSubmitted}
                    placeholder="20.296100"
                    style={locationSubmitted ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Longitude</label>
                  <input
                    className="glass-input w-full"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    readOnly={locationSubmitted}
                    placeholder="85.824500"
                    style={locationSubmitted ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  />
                </div>
              </div>
              <div
                className="rounded-xl p-3 mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                style={{
                  background: locationSubmitted ? 'rgba(61,255,84,0.06)' : 'rgba(255,180,0,0.06)',
                  border: locationSubmitted ? '1px solid rgba(61,255,84,0.16)' : '1px solid rgba(255,180,0,0.2)',
                }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
                  {locationSubmitted
                    ? 'Location is locked for gym users. Contact admin if latitude or longitude needs correction.'
                    : 'Submit this once so users can find your gym nearby. You can use GPS or enter coordinates manually.'}
                </p>
                {!locationSubmitted && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs flex items-center gap-1"
                      onClick={useCurrentLocation}
                      disabled={locating || savingLocation}
                    >
                      <Navigation size={13} />
                      {locating ? 'Reading GPS...' : 'Use GPS'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary text-xs"
                      onClick={submitLocation}
                      disabled={savingLocation}
                    >
                      {savingLocation ? 'Submitting...' : 'Submit Location'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(61,255,84,0.06)', border: '1px solid rgba(61,255,84,0.16)' }}
        >
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t)' }}>Operating Hours</div>
          <p className="text-xs mb-3" style={{ color: 'var(--t2)' }}>
            Opening, closing, and break-time setup is managed from one place so gym workout slots stay consistent.
          </p>
          <a href="/schedule" className="btn btn-ghost inline-flex text-xs">Manage Operating Hours</a>
        </div>
      </div>

      {/* Section B - Notification Preferences */}
      <div className="glass p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={18} style={{ color: 'var(--accent)' }} />
          <span className="serif text-lg text-white">Notification Preferences</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'New check-in alerts', value: notifCheckin, set: setNotifCheckin },
            { label: 'Low capacity alerts', value: notifCapacity, set: setNotifCapacity },
            { label: 'Settlement notifications', value: notifSettlement, set: setNotifSettlement },
            { label: 'Marketing emails', value: notifMarketing, set: setNotifMarketing },
          ].map(({ label, value, set }) => (
            <div
              key={label}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--t)' }}>{label}</span>
              <Toggle on={value} onToggle={() => set((v) => !v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Section D - Security */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <span className="serif text-lg text-white">Security</span>
        </div>
        <form onSubmit={handlePasswordSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label style={labelStyle}>Current Password</label>
              <PasswordField placeholder="Current password" value={currentPw} onChange={setCurrentPw} />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <PasswordField placeholder="New password" value={newPw} onChange={setNewPw} />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <PasswordField placeholder="Confirm new password" value={confirmPw} onChange={setConfirmPw} />
            </div>
          </div>
          {pwError && (
            <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--error)' }}>
              <AlertTriangle size={14} />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--accent)' }}>
              <Check size={14} />
              {pwSuccess}
            </div>
          )}
          <button type="submit" className="btn btn-primary">Update Password</button>
        </form>
      </div>
    </Shell>
  );
}
