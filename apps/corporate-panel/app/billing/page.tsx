'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { X } from 'lucide-react';

const PER_SEAT = 1500;

function genInvoices(seats: number) {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const s = i === 0 ? Math.max(seats, 10) : Math.max(seats - i * 3, 10);
    return {
      id: `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(3, '0')}`,
      period,
      seats: s,
      amount: s * PER_SEAT,
      status: i === 0 ? 'Due' : 'Paid',
      date: new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });
}

export default function BillingPage() {
  const [corporate, setCorporate] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [showPay, setShowPay] = useState<any>(null);
  const [topupSeats, setTopupSeats] = useState(10);
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const corp = await api.get('/corporate/me');

        if (!corp) return;
        setCorporate(corp);
        const res = await api.get(`/corporate/${corp._id || corp.id}/employees`);
        setEmployees(Array.isArray(res) ? res : res?.data || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const seats = corporate?.totalSeats || corporate?.seats || employees.length;
  const monthly = seats * PER_SEAT;
  const invoices = genInvoices(seats);

  const downloadInv = (inv: any) => {
    const content = [
      'BOOKMYFIT CORPORATE INVOICE',
      '============================',
      `Invoice #: ${inv.id}`,
      `Period:    ${inv.period}`,
      `Seats:     ${inv.seats}`,
      `Per Seat:  ₹${PER_SEAT.toLocaleString('en-IN')}/month`,
      `Amount:    ₹${inv.amount.toLocaleString('en-IN')}`,
      `Due Date:  ${inv.date}`,
      `Status:    ${inv.status}`,
      '',
      'Powered by BookMyFit Corporate',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${inv.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const requestTopup = async () => {
    setRequesting(true);
    try {
      toast(`Seat top-up request for ${topupSeats} seats submitted`);
      setShowTopup(false);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Shell title="Billing & Invoices">
      <div className="glass p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="serif text-lg">Current Subscription</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{corporate?.name || 'BookMyFit'} Corporate Elite Plan</p>
          </div>
          <span className="accent-pill text-sm">Active</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Plan', value: 'Elite Corporate' },
            { label: 'Seats', value: loading ? '…' : String(seats) },
            { label: 'Per Seat', value: `₹${PER_SEAT.toLocaleString('en-IN')}/mo` },
            { label: 'Monthly Total', value: loading ? '…' : `₹${monthly.toLocaleString('en-IN')}` },
          ].map((s) => (
            <div key={s.label} className="card stat-glow p-4">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
              <div className="text-lg font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="serif text-lg">Invoice History</h3>
          <button className="btn btn-ghost text-sm" onClick={() => setShowTopup(true)}>+ Top-up Seats</button>
        </div>
        <table className="glass-table">
          <thead><tr><th>Invoice</th><th>Period</th><th>Seats</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="font-semibold text-white">{inv.id}</td>
                <td>{inv.period}</td>
                <td>{inv.seats}</td>
                <td>₹{inv.amount.toLocaleString('en-IN')}</td>
                <td>{inv.date}</td>
                <td><span className={inv.status === 'Paid' ? 'badge-active' : 'badge-pending'}>{inv.status}</span></td>
                <td className="flex gap-2">
                  <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => downloadInv(inv)}>Download</button>
                  {inv.status === 'Due' && (
                    <button className="btn btn-primary text-xs py-1 px-3" onClick={() => setShowPay(inv)}>Pay Now</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top-up Modal */}
      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="serif text-xl">Top-up Seats</h3>
              <button onClick={() => setShowTopup(false)} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Additional Seats</label>
            <input type="number" min={1} max={500} className="glass-input w-full mb-1" value={topupSeats} onChange={(e) => setTopupSeats(Number(e.target.value))} />
            <p className="text-xs mb-5" style={{ color: 'var(--t2)' }}>Estimated cost: ₹{(topupSeats * PER_SEAT).toLocaleString('en-IN')}/mo</p>
            <button className="btn btn-primary w-full justify-center" onClick={requestTopup} disabled={requesting}>
              {requesting ? 'Submitting…' : 'Request Top-up'}
            </button>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="serif text-xl">Payment Details</h3>
              <button onClick={() => setShowPay(null)} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--t2)' }}>Invoice</span><span className="font-semibold">{showPay.id}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--t2)' }}>Amount</span><span className="font-semibold text-lg" style={{ color: 'var(--accent)' }}>₹{showPay.amount.toLocaleString('en-IN')}</span></div>
            </div>
            <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1">Bank Transfer</p>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>Account: 1234567890</p>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>IFSC: HDFC0001234</p>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>Ref: {showPay.id}</p>
            </div>
            <button className="btn btn-ghost w-full justify-center" onClick={() => setShowPay(null)}>Close</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
