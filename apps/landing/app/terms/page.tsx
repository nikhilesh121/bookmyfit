import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | BookMyFit',
  description: 'Terms for using BookMyFit memberships, bookings, check-ins, and partner services.',
};

const cardStyle = {
  padding: 18,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
} as const;

const mutedText = {
  color: 'rgba(255,255,255,0.68)',
  lineHeight: 1.65,
} as const;

export default function TermsPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#060606',
      color: '#fff',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '48px 20px',
    }}>
      <section style={{
        maxWidth: 900,
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
          Terms of Service
        </h1>
        <p style={mutedText}>
          Last updated: 1 June 2026. These terms apply when you use the BookMyFit
          app, website, gym partner portal, admin console, and related services.
        </p>

        <div style={{ marginTop: 26, display: 'grid', gap: 16 }}>
          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Use of BookMyFit</h2>
            <p style={mutedText}>
              BookMyFit helps users discover gyms, wellness partners, trainers, passes,
              subscriptions, and bookings. You agree to provide accurate account and
              booking information and to use the service only for lawful purposes.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Bookings and check-ins</h2>
            <p style={mutedText}>
              QR codes, manual booking IDs, and check-in records are used to verify visits.
              A booking or pass may be refused if it is expired, cancelled, already used,
              linked to another gym, or violates partner rules.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Partner services</h2>
            <p style={mutedText}>
              Gyms, wellness partners, and trainers are independent service providers.
              BookMyFit may facilitate discovery, booking, payments, and records, but the
              partner remains responsible for providing services safely and professionally.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Payments</h2>
            <p style={mutedText}>
              Prices, subscriptions, trainer add-ons, and wellness services are shown
              before checkout. Payments may be processed by third-party payment providers.
              Failed, duplicate, or disputed payments should be reported to
              support@bookmyfit.in with the order details.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Account deletion</h2>
            <p style={mutedText}>
              You can request account deletion from the app or at{' '}
              <Link href="/delete-account" style={{ color: '#ccff00' }}>
                bookmyfit.in/delete-account
              </Link>
              . Some transaction, accounting, safety, and fraud-prevention records may be
              retained as explained in the Privacy Policy.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Contact</h2>
            <p style={mutedText}>
              For account, payment, booking, or policy questions, contact
              support@bookmyfit.in.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
