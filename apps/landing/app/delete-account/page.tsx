import Link from 'next/link';

export const metadata = {
  title: 'Delete Account | BookMyFit',
  description: 'Request deletion of your BookMyFit member account and personal profile details.',
};

export default function DeleteAccountPage() {
  const subject = encodeURIComponent('BookMyFit account deletion request');
  const body = encodeURIComponent(
    'Please delete my BookMyFit member account.\n\nRegistered phone number:\nRegistered email, if any:\nFull name:\n\nI understand transaction records may be retained where required by law, payment processing, fraud prevention, and accounting rules.',
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: '#060606',
      color: '#fff',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '48px 20px',
    }}>
      <section style={{
        maxWidth: 760,
        margin: '0 auto',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.055)',
        padding: '32px',
      }}>
        <Link href="/" style={{ color: '#ccff00', textDecoration: 'none', fontWeight: 700 }}>
          BookMyFit
        </Link>
        <h1 style={{ fontSize: 36, lineHeight: 1.12, margin: '28px 0 12px' }}>
          Delete your BookMyFit account
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 16, lineHeight: 1.7 }}>
          You can delete your BookMyFit member account from inside the mobile app from
          Profile - Delete Account. If you cannot access the app, you can request deletion
          from this page.
        </p>

        <div style={{ marginTop: 24, display: 'grid', gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 14, background: 'rgba(0,212,106,0.10)', border: '1px solid rgba(0,212,106,0.26)' }}>
            <strong>What will be removed</strong>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
              Your member login access and personal profile identifiers such as phone, email,
              name, and device login details will be removed or anonymized.
            </p>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <strong>What may be retained</strong>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
              Payment, invoice, booking, safety, fraud-prevention, and accounting records may
              be retained for the period required by law or business compliance.
            </p>
          </div>
        </div>

        <a
          href={`mailto:support@bookmyfit.in?subject=${subject}&body=${body}`}
          style={{
            display: 'inline-flex',
            marginTop: 28,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: '#ccff00',
            color: '#050505',
            fontWeight: 800,
            padding: '0 22px',
            textDecoration: 'none',
          }}
        >
          Request account deletion
        </a>

        <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.52)', fontSize: 13, lineHeight: 1.6 }}>
          Email: support@bookmyfit.in. We may contact you to verify ownership before completing
          the deletion request.
        </p>
      </section>
    </main>
  );
}
