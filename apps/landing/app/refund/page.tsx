import Link from 'next/link';

export const metadata = {
  title: 'Refund Policy | BookMyFit',
  description: 'Refund and cancellation policy for BookMyFit subscriptions, passes, and bookings.',
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

export default function RefundPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#060606',
      color: '#fff',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '48px 20px',
    }}>
      <section style={{
        maxWidth: 860,
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
          Refund Policy
        </h1>
        <p style={mutedText}>
          Last updated: 1 June 2026. This policy explains how BookMyFit handles
          refunds, cancellations, failed payments, and duplicate payments.
        </p>

        <div style={{ marginTop: 26, display: 'grid', gap: 16 }}>
          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Subscriptions and passes</h2>
            <p style={mutedText}>
              Gym subscriptions, multi-gym passes, day passes, trainer add-ons, and
              wellness bookings are generally final once purchased or activated, unless a
              refund is required by law or specifically approved by BookMyFit support.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Session cancellation</h2>
            <p style={mutedText}>
              If cancellation is available in the app for a session booking, it must be
              completed before the displayed cut-off time. Cancelled bookings do not
              automatically create a cash refund unless BookMyFit support confirms one.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Failed or duplicate payment</h2>
            <p style={mutedText}>
              If money is debited but the booking or subscription is not created, contact
              support@bookmyfit.in with your registered phone number, order ID, payment
              reference, amount, and payment date. We will verify the payment status with
              the payment provider and either activate the eligible service or process the
              applicable reversal/refund.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Partner availability</h2>
            <p style={mutedText}>
              If a partner cannot provide a confirmed service, BookMyFit support may help
              with rescheduling, alternate service availability, account credit, or refund
              review based on the case.
            </p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>Contact</h2>
            <p style={mutedText}>
              Email support@bookmyfit.in for payment and refund support. Include the
              registered phone number and payment/order details so we can verify quickly.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
