import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | BookMyFit',
  description: 'BookMyFit privacy policy for the mobile app, website, and partner portals.',
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

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p style={mutedText}>
          Last updated: 1 June 2026. This Privacy Policy explains how BookMyFit
          collects, uses, shares, protects, and deletes data for the BookMyFit
          mobile app, website, admin console, gym partner portal, and related
          services.
        </p>

        <div style={{ marginTop: 26, display: 'grid', gap: 16 }}>
          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Developer and contact</h2>
            <p style={mutedText}>
              App name: BookMyFit. Package name: in.bookmyfit.app. Privacy contact:
              support@bookmyfit.in.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Data we collect</h2>
            <p style={mutedText}>
              We collect account details such as name, phone number, email if provided,
              profile details, login state, and support messages. We collect booking and
              service data such as gym subscriptions, wellness bookings, day passes,
              trainer add-ons, check-ins, QR/manual verification codes, ratings, reviews,
              invoices, and order status.
            </p>
            <p style={mutedText}>
              With your permission, we use device location to show nearby gyms, wellness
              partners, trainers, and distance-based sorting. Camera access is used for QR
              scanning and check-in verification. Payment details such as card, UPI, or
              bank information are handled by payment providers; BookMyFit stores payment
              references, order IDs, invoice details, and payment status needed to provide
              the service.
            </p>
            <p style={mutedText}>
              We may also collect technical data such as IP address, device type, app
              version, error logs, fraud-prevention signals, and notification or session
              tokens needed to keep the service reliable and secure.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>How we use data</h2>
            <p style={mutedText}>
              We use data to create and secure accounts, show nearby fitness and wellness
              options, process subscriptions and bookings, generate invoices, complete QR
              or manual check-ins, show membership history, support gyms and wellness
              partners, process support requests, prevent fraud, comply with law, and
              improve app performance.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Sharing</h2>
            <p style={mutedText}>
              We share only the data needed to operate BookMyFit. Gym and wellness
              partners may receive booking, check-in, member name or member ID, selected
              trainer, plan, and service details needed to serve the user. Payment
              processors, hosting providers, analytics or crash-reporting tools, and
              support tools may process data for us. We may disclose data when required
              for legal, accounting, safety, fraud prevention, or regulatory reasons.
            </p>
            <p style={mutedText}>
              We do not sell personal and sensitive user data.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Security</h2>
            <p style={mutedText}>
              We use HTTPS, access controls, account authentication, operational logging,
              and data minimisation practices to protect user data. No system is perfectly
              secure, so users should also keep their device and login access protected.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Retention and deletion</h2>
            <p style={mutedText}>
              We keep account data while the account is active or as needed to provide
              services. Users can delete their BookMyFit member account from Profile -
              Delete Account in the mobile app or request deletion at{' '}
              <Link href="/delete-account" style={{ color: '#ccff00' }}>
                bookmyfit.in/delete-account
              </Link>
              . When deletion is completed, personal profile identifiers are removed or
              anonymized.
            </p>
            <p style={mutedText}>
              Some records, such as invoices, payment references, booking records,
              settlement records, safety records, fraud-prevention records, and accounting
              records, may be retained where required by law or legitimate business
              compliance. Where retention is required, we limit use of retained data to
              those purposes.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Your choices</h2>
            <p style={mutedText}>
              You can update profile details in the app where available, withdraw device
              permissions from Android settings, request support at support@bookmyfit.in,
              and request account deletion from the app or website. Turning off location
              may reduce nearby gym and wellness sorting accuracy.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Children</h2>
            <p style={mutedText}>
              BookMyFit is not directed to children under 13. Users who are minors should
              use the service only with parent or guardian involvement where required.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Changes</h2>
            <p style={mutedText}>
              We may update this policy as BookMyFit changes. The latest policy will be
              published on this page with the updated date.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
