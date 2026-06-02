'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { loadCorporateWithEmployees } from '../../lib/corporate';
import { useToast } from '../../components/Toast';
import { X } from 'lucide-react';

declare global {
  interface Window {
    Cashfree?: any;
  }
}

function money(value: number) {
  return `Rs ${Math.round(value || 0).toLocaleString('en-IN')}`;
}

function loadCashfreeSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser is required'));
    if (window.Cashfree) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-cashfree-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Cashfree SDK failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.dataset.cashfreeSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Cashfree SDK failed to load'));
    document.head.appendChild(script);
  });
}

export default function BillingPage() {
  const [corporate, setCorporate] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [topupSeats, setTopupSeats] = useState(10);
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { corporate: corp, employees: employeeList } = await loadCorporateWithEmployees();
      if (!corp) return;
      setCorporate(corp);
      setEmployees(employeeList);
    } catch (e: any) {
      toast(e.message || 'Failed to load billing', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCheckout = async (payload: any) => {
    const payment = payload?.payment || payload;
    const paymentSessionId = payment?.paymentSessionId;
    if (!paymentSessionId) {
      toast(`Payment order created: ${payload?.orderId || payment?.orderId || 'pending'}`, 'info');
      return;
    }
    await loadCashfreeSdk();
    const mode = payment?.cashfreeMode === 'production' ? 'production' : 'sandbox';
    const cashfree = window.Cashfree({ mode });
    await cashfree.checkout({ paymentSessionId, redirectTarget: '_self' });
  };

  const createSeatPayment = async (additionalSeats = 0) => {
    setRequesting(true);
    try {
      const payload = additionalSeats > 0
        ? await api.post('/corporate/me/topup-request', { additionalSeats })
        : await api.post('/corporate/me/seat-payment', {});
      toast(payload?.message || 'Payment order created');
      await startCheckout(payload);
    } catch (e: any) {
      toast(e.message || 'Unable to create payment order', 'error');
    } finally {
      setRequesting(false);
      setShowTopup(false);
    }
  };

  const verifyPending = async () => {
    const orderId = corporate?.pendingSeatOrderId;
    if (!orderId) return;
    setRequesting(true);
    try {
      const res: any = await api.post(`/payments/verify/${orderId}`, {});
      toast(res?.paid ? 'Payment verified and seats updated' : `Payment status: ${res?.paymentStatus || 'pending'}`);
      load();
    } catch (e: any) {
      toast(e.message || 'Payment verification failed', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const seats = Number(corporate?.totalSeats || 0);
  const assigned = Number(corporate?.assignedSeats || employees.filter((employee) => employee.status === 'active').length || 0);
  const pricePerSeat = Number(corporate?.pricePerSeat || 999);
  const monthly = seats * pricePerSeat;
  const billingStatus = String(corporate?.billingStatus || 'pending_payment');
  const needsPayment = !['active', 'trial'].includes(billingStatus);

  return (
    <Shell title="Billing & Invoices">
      <div className="glass p-6 mb-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="serif text-lg">Current Corporate Subscription</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{corporate?.companyName || 'BookMyFit'} Corporate Multi-Gym Access</p>
          </div>
          <span className={billingStatus === 'active' ? 'badge-active' : 'badge-pending'}>{billingStatus}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Seats', value: loading ? '...' : String(seats) },
            { label: 'Assigned', value: loading ? '...' : String(assigned) },
            { label: 'Per Seat', value: `${money(pricePerSeat)}/mo` },
            { label: 'Monthly Total', value: loading ? '...' : money(monthly) },
          ].map((s) => (
            <div key={s.label} className="card stat-glow p-4">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--t2)' }}>{s.label}</div>
              <div className="text-lg font-bold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5 flex-wrap">
          {needsPayment && !corporate?.pendingSeatOrderId && (
            <button className="btn btn-primary" disabled={requesting || seats <= 0} onClick={() => createSeatPayment(0)}>
              {requesting ? 'Creating payment...' : `Pay ${money(monthly)}`}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowTopup(true)} disabled={requesting}>Top-up Seats</button>
          {corporate?.pendingSeatOrderId && (
            <button className="btn btn-primary" disabled={requesting} onClick={verifyPending}>
              {requesting ? 'Checking...' : 'Verify Pending Payment'}
            </button>
          )}
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="serif text-lg">Payment Records</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Only real Cashfree corporate seat orders are shown here.</p>
        </div>
        <table className="glass-table">
          <thead><tr><th>Type</th><th>Order</th><th>Seats</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {corporate?.pendingSeatOrderId ? (
              <tr>
                <td>Pending seat payment</td>
                <td className="font-mono text-xs">{corporate.pendingSeatOrderId}</td>
                <td>{Number(corporate.pendingSeatRequest || 0) || seats}</td>
                <td>{money((Number(corporate.pendingSeatRequest || 0) || seats) * pricePerSeat)}</td>
                <td><span className="badge-pending">Pending</span></td>
                <td><button className="btn btn-ghost text-xs" onClick={verifyPending}>Verify</button></td>
              </tr>
            ) : null}
            {corporate?.lastSeatPaymentOrderId ? (
              <tr>
                <td>Last paid seat order</td>
                <td className="font-mono text-xs">{corporate.lastSeatPaymentOrderId}</td>
                <td>{seats}</td>
                <td>{money(monthly)}</td>
                <td><span className="badge-active">Paid</span></td>
                <td>--</td>
              </tr>
            ) : null}
            {!corporate?.pendingSeatOrderId && !corporate?.lastSeatPaymentOrderId ? (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: 'var(--t2)' }}>No corporate payment records yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass p-7 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="serif text-xl">Top-up Seats</h3>
              <button onClick={() => setShowTopup(false)} style={{ color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>Additional Seats</label>
            <input type="number" min={1} max={500} className="glass-input w-full mb-1" value={topupSeats} onChange={(e) => setTopupSeats(Math.max(1, Number(e.target.value) || 1))} />
            <p className="text-xs mb-5" style={{ color: 'var(--t2)' }}>Payable now: {money(topupSeats * pricePerSeat)}</p>
            <button className="btn btn-primary w-full justify-center" onClick={() => createSeatPayment(topupSeats)} disabled={requesting}>
              {requesting ? 'Creating payment...' : 'Pay Top-up'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
