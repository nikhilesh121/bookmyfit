'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Printer, QrCode, RefreshCw } from 'lucide-react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';

type GymQr = {
  gymId: string;
  gymName: string;
  token: string;
  type: string;
};

export default function GymQrPage() {
  const [data, setData] = useState<GymQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    setMessage('');
    api.get<GymQr>('/qr/gym-code')
      .then(setData)
      .catch((err: any) => setMessage(err?.message || 'Could not load gym QR.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const copyToken = async () => {
    if (!data?.token) return;
    await navigator.clipboard?.writeText(data.token);
    setMessage('Gym QR token copied.');
    setTimeout(() => setMessage(''), 2200);
  };

  const downloadQr = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas || !data) return;
    const link = document.createElement('a');
    link.download = `${data.gymName || 'gym'}-bookmyfit-qr.png`.replace(/[^\w.-]+/g, '-');
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Shell title="Gym QR">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) minmax(320px, 1fr)', gap: 22, alignItems: 'start' }}>
        <section className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.25)', display: 'grid', placeItems: 'center' }}>
              <QrCode size={22} color="var(--accent)" />
            </div>
            <div>
              <h2 className="serif" style={{ fontSize: 24, margin: 0 }}>Fixed Gym QR</h2>
              <p style={{ margin: '3px 0 0', color: 'var(--t2)', fontSize: 13 }}>Members can scan this to check in.</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 340, display: 'grid', placeItems: 'center', color: 'var(--t2)' }}>Loading QR...</div>
          ) : data?.token ? (
            <div ref={qrWrapRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ background: '#fff', padding: 18, borderRadius: 18, boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
                <QRCodeCanvas value={data.token} size={260} bgColor="#ffffff" fgColor="#000000" includeMargin />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{data.gymName}</div>
                <div style={{ color: 'var(--t2)', fontSize: 12, marginTop: 3 }}>BookMyFit member self check-in</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn" onClick={downloadQr} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Download size={15} /> Download
                </button>
                <button className="btn" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Printer size={15} /> Print
                </button>
                <button className="btn" onClick={copyToken} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Copy size={15} /> Copy
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: '#ff7777', padding: 16, border: '1px solid rgba(255,80,80,0.25)', borderRadius: 14 }}>{message || 'QR unavailable.'}</div>
          )}
        </section>

        <section className="card" style={{ padding: 24 }}>
          <h2 className="serif" style={{ fontSize: 22, marginTop: 0 }}>How It Works</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              ['Single Gym Pass', 'No booking is needed. The member scans this fixed QR, or shows their membership QR for staff to scan.'],
              ['Multi Gym Pass', 'The member must book a slot first. Scanning this QR marks the booked visit attended and records the per-visit payout.'],
              ['1-Day Pass', 'The selected day and slot still apply. Scanning this QR works only inside the booked check-in window.'],
            ].map(([title, body], index) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(204,255,0,0.12)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{index + 1}</div>
                <div>
                  <div style={{ fontWeight: 800 }}>{title}</div>
                  <p style={{ color: 'var(--t2)', lineHeight: 1.55, margin: '5px 0 0', fontSize: 13 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
          {message ? <p style={{ color: 'var(--accent)', marginTop: 18 }}>{message}</p> : null}
          <button className="btn" onClick={load} style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </section>
      </div>
    </Shell>
  );
}
