import ScrollReveal from '../components/ScrollReveal';
import EarlyAccessForm from '../components/EarlyAccessForm';

/* ─── data ─────────────────────────────────────────────── */
const STATS = [
  { num: '1,000+', label: 'Gym Partners' },
  { num: '50+', label: 'Cities' },
  { num: '₹599', label: 'Starts From' },
  { num: 'QR', label: 'Check-in' },
];

const HOW = [
  { n: '01', icon: '📱', title: 'Download & Sign up', desc: 'Create your account with just your phone number. OTP login — no passwords to remember.' },
  { n: '02', icon: '💳', title: 'Pick a Plan', desc: 'Choose from Individual (₹599) to Max (₹3,999). Every plan includes unlimited visits to your chosen gyms.' },
  { n: '03', icon: '⚡', title: 'Scan & Workout', desc: 'Show your QR code at any BookMyFit partner gym. Instant AI-verified check-in. No tokens, no paper.' },
  { n: '04', icon: '🏆', title: 'Track & Earn', desc: 'Monitor sessions, earn loyalty points, book PT trainers, and stream workout videos — all in one app.' },
];

const PLANS = [
  { name: 'Individual', sub: '1 Gym Access', price: '₹599', per: '/month', color: '#fff', features: ['Access to 1 home gym', 'Unlimited daily visits', 'QR check-in', 'Session history'], popular: false },
  { name: 'Elite', sub: '5+ Gyms Access', price: '₹1,499', per: '/month', color: 'var(--accent)', features: ['Access to 5 premium gyms', 'Multi-city access', 'Video workout library', 'All Premium gyms'], popular: true },
  { name: 'Pro', sub: '10 Gyms Unlimited', price: '₹2,499', per: '/month', color: '#fff', features: ['Access to 10 elite gyms', 'PT session add-on', 'Full video library', 'Priority support'], popular: false },
  { name: 'Max', sub: 'Everything Unlimited', price: '₹3,999', per: '/month', color: '#fff', features: ['Unlimited gyms across India', 'Unlimited PT sessions', 'Concierge support', 'All Elite locations'], popular: false },
];

const GYM_PERKS = [
  { icon: '💰', title: 'Zero Upfront Cost', desc: 'No integration fees. No hardware. We pay you per member visit-day at your configured rate. Revenue on day one.' },
  { icon: '📊', title: 'Real-time Dashboard', desc: 'Track check-ins, revenue, members, and settlements from a powerful gym partner portal. Full transparency, always.' },
  { icon: '🔐', title: 'Automated Settlements', desc: 'Monthly settlements deposited directly to your bank account. Raise disputes and download invoices with one click.' },
];

const CORP_PERKS = [
  { icon: '👥', title: 'Per-Employee Billing', desc: 'Pay only for active employees. Add or remove seats from your HR dashboard any time. No annual commitments.' },
  { icon: '🗺️', title: '1,000+ Gyms Nationwide', desc: 'Employees working from different cities? No problem. One plan gives access to all partner gyms across India.' },
  { icon: '📈', title: 'Usage Analytics', desc: 'See who\'s using it, when, and where. Powerful reports help you demonstrate wellness ROI to leadership.' },
];

const TESTIMONIALS = [
  { avatar: 'PS', name: 'Priya Sharma', role: 'Software Engineer, Bangalore', text: 'BookMyFit changed how I work out. I travel between offices and can now hit a premium gym near any location. The QR check-in is seamless!' },
  { avatar: 'RM', name: 'Rahul Mehta', role: 'Entrepreneur, Mumbai', text: "Worth every rupee. The Elite plan gives me access to 5 top gyms — I switch based on my schedule. No more being tied to one place!" },
  { avatar: 'AK', name: 'Ananya Krishnan', role: 'Marketing Lead, Chennai', text: "I used to pay ₹3,000/month for a single gym. With BookMyFit Pro I get 10 premium gyms and PT sessions. Best fitness investment ever." },
];

const GYM_PANEL_URL = process.env.NEXT_PUBLIC_GYM_URL || 'http://localhost:3001/signup';
const CORP_PANEL_URL = process.env.NEXT_PUBLIC_CORP_URL || 'http://localhost:3002/signup';

/* ─── styles helpers ────────────────────────────────────── */
const s = {
  section: { padding: '100px 5vw', position: 'relative' as const, zIndex: 1 },
  sectionAlt: { padding: '100px 5vw', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' as const, zIndex: 1 },
  h2: { fontFamily: 'var(--serif)', fontSize: 'clamp(32px,5vw,54px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 } as React.CSSProperties,
  sub: { fontSize: 17, color: 'var(--t2)', maxWidth: 560, marginBottom: 56 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px' } as React.CSSProperties,
  cardTitle: { fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  cardDesc: { fontSize: 14, color: 'var(--t2)', lineHeight: 1.65 } as React.CSSProperties,
};

/* ─── page ──────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <ScrollReveal />

      {/* Aurora blobs */}
      <div className="aurora aurora-1" aria-hidden="true" />
      <div className="aurora aurora-2" aria-hidden="true" />
      <div className="aurora aurora-3" aria-hidden="true" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 5vw', height: 68,
          background: 'rgba(6,6,6,0.78)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, letterSpacing: -1, textDecoration: 'none', color: '#fff' }}>
          Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[['#how-it-works','How it works'],['#plans','Plans'],['#for-gyms','For Gyms'],['#for-corporates','For Corporates']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 14, color: 'var(--t2)', textDecoration: 'none' }}
               className="hidden sm:block">{label}</a>
          ))}
          <a href="#early-access" className="btn btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
            Get Early Access
          </a>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        id="home"
        aria-labelledby="hero-heading"
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '140px 5vw 80px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(61,255,84,0.1)', border: '1px solid rgba(61,255,84,0.25)', borderRadius: 100,
          padding: '6px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 28,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block' }} />
          🚀 Early Access — Limited Spots
        </div>

        <h1
          id="hero-heading"
          style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px,8vw,88px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 24, maxWidth: 900 }}
        >
          India&apos;s fitness<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>everywhere</em> you go.
        </h1>

        <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'var(--t2)', maxWidth: 580, margin: '0 auto 44px', fontWeight: 400 }}>
          One subscription. 1,000+ premium gyms. AI-powered check-in. Stop being tied to one gym — BookMyFit gives you the freedom to work out anywhere in India.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 52 }}>
          <a href="#early-access" className="btn btn-primary btn-lg">🔥 Join Waitlist — It&apos;s Free</a>
          <a href="#how-it-works" className="btn btn-ghost btn-lg">See how it works</a>
        </div>

        {/* App download badges */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
          {[
            { icon: '🍎', small: 'Coming soon on', strong: 'App Store', label: 'Download on App Store' },
            { icon: '🤖', small: 'Coming soon on', strong: 'Google Play', label: 'Get it on Google Play' },
          ].map((b) => (
            <a key={b.strong} href="#early-access" aria-label={b.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 20px', textDecoration: 'none', color: '#fff', minWidth: 160 }}>
              <span style={{ fontSize: 26 }}>{b.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.small}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{b.strong}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          {STATS.map((st) => (
            <div key={st.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 900, color: 'var(--accent)' }}>{st.num}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{st.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" style={s.section} aria-labelledby="how-heading">
        <p className="kicker reveal">Simple by design</p>
        <h2 id="how-heading" style={s.h2} className="reveal">
          Three steps to <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>freedom</em>
        </h2>
        <p style={s.sub} className="reveal">No contracts, no queues, no confusion. Download, subscribe, check in.</p>
        <div style={s.grid4}>
          {HOW.map((h) => (
            <article key={h.n} className="glass-card reveal" style={{ padding: '32px 28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 900, color: 'rgba(61,255,84,0.07)', position: 'absolute', top: 12, right: 20, lineHeight: 1, userSelect: 'none' }}>{h.n}</div>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{h.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{h.title}</h3>
              <p style={s.cardDesc}>{h.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Plans ──────────────────────────────────────────── */}
      <section id="plans" style={s.sectionAlt} aria-labelledby="plans-heading">
        <p className="kicker reveal">Pricing</p>
        <h2 id="plans-heading" style={s.h2} className="reveal">
          Choose your <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>level</em>
        </h2>
        <p style={s.sub} className="reveal">All plans include unlimited visits. No hidden fees. Cancel anytime.</p>
        <div style={s.grid3}>
          {PLANS.map((p) => (
            <article
              key={p.name}
              className="glass-card reveal"
              style={{ padding: '28px 24px', position: 'relative', ...(p.popular && { borderColor: 'rgba(61,255,84,0.4)' }) }}
            >
              {p.popular && (
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '0 0 10px 10px' }}>
                  Most Popular
                </div>
              )}
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 20 }}>{p.sub}</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: p.color, marginBottom: 4 }}>
                {p.price} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--t2)' }}>{p.per}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0' }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#early-access" className={`btn ${p.popular ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', justifyContent: 'center' }}>
                Get Early Access
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ── For Gyms ───────────────────────────────────────── */}
      <section id="for-gyms" style={s.section} aria-labelledby="gyms-heading">
        <p className="kicker reveal">Gym Partners</p>
        <h2 id="gyms-heading" style={s.h2} className="reveal">
          Grow your gym.<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>We handle members.</em>
        </h2>
        <p style={s.sub} className="reveal">Join 1,000+ gym partners earning from every BookMyFit member who walks through your door — zero upfront cost.</p>
        <div style={s.grid2}>
          {GYM_PERKS.map((p) => (
            <article key={p.title} className="glass-card reveal" style={{ padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{p.icon}</div>
              <h3 style={s.cardTitle}>{p.title}</h3>
              <p style={s.cardDesc}>{p.desc}</p>
            </article>
          ))}
        </div>
        <div className="reveal" style={{ textAlign: 'center', marginTop: 44 }}>
          <a href={GYM_PANEL_URL} className="btn btn-primary btn-lg" aria-label="Register your gym on BookMyFit">
            🏋️ Register Your Gym →
          </a>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 12 }}>Gym listing goes live after KYC verification (typically 2–3 business days).</p>
        </div>
      </section>

      {/* ── For Corporates ─────────────────────────────────── */}
      <section id="for-corporates" style={s.sectionAlt} aria-labelledby="corporate-heading">
        <p className="kicker reveal">Corporate Wellness</p>
        <h2 id="corporate-heading" style={s.h2} className="reveal">
          Healthy teams.<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>₹999 per employee.</em>
        </h2>
        <p style={s.sub} className="reveal">Give every employee unlimited multi-gym access. We handle billing per seat, you focus on culture.</p>
        <div style={s.grid2}>
          {CORP_PERKS.map((p) => (
            <article key={p.title} className="glass-card reveal" style={{ padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{p.icon}</div>
              <h3 style={s.cardTitle}>{p.title}</h3>
              <p style={s.cardDesc}>{p.desc}</p>
            </article>
          ))}
        </div>
        <div className="reveal" style={{ textAlign: 'center', marginTop: 44 }}>
          <a href={CORP_PANEL_URL} className="btn btn-primary btn-lg" aria-label="Register your company on BookMyFit">
            🏢 Register Your Company →
          </a>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 12 }}>Starting from ₹999/employee/month. Add employees from your dashboard.</p>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section style={s.section} aria-labelledby="testimonials-heading">
        <p className="kicker reveal">Social Proof</p>
        <h2 id="testimonials-heading" style={s.h2} className="reveal">
          Loved by <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>fitness people</em>
        </h2>
        <p style={s.sub} className="reveal">Join thousands of professionals who&apos;ve made BookMyFit their fitness companion.</p>
        <div style={s.grid2}>
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className="glass-card reveal" style={{ padding: 28 }}>
              <div style={{ fontSize: 14, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }} aria-label="5 out of 5 stars">★★★★★</div>
              <p style={{ fontSize: 15, color: 'var(--t)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 20 }}>&ldquo;{t.text}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(61,255,84,0.15)', border: '1px solid rgba(61,255,84,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{t.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Early Access CTA ───────────────────────────────── */}
      <section id="early-access" style={{ padding: '80px 5vw', position: 'relative', zIndex: 1 }} aria-labelledby="early-access-heading">
        <div
          className="reveal"
          style={{
            background: 'linear-gradient(135deg, rgba(61,255,84,0.06) 0%, rgba(0,120,255,0.06) 100%)',
            border: '1px solid rgba(61,255,84,0.15)',
            borderRadius: 28, padding: '64px 40px',
            textAlign: 'center', maxWidth: 680, margin: '0 auto',
          }}
        >
          <p className="kicker" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>⚡ Limited Spots Available</p>
          <h2 id="early-access-heading" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 12 }}>
            Get early access<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>before launch</em>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--t2)', marginBottom: 36 }}>
            Be the first to know when BookMyFit launches in your city.<br />Early users get 3 months free on any plan.
          </p>

          <EarlyAccessForm />

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            <a href={GYM_PANEL_URL} className="btn btn-ghost" aria-label="Onboard your gym">
              🏋️ I own a gym — Onboard my gym
            </a>
            <a href={CORP_PANEL_URL} className="btn btn-ghost" aria-label="Register your company">
              🏢 I&apos;m in HR — Register my company
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        role="contentinfo"
        style={{ borderTop: '1px solid var(--border)', padding: '36px 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}
      >
        <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 900, color: '#fff', textDecoration: 'none' }}>
          Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit
        </a>
        <nav aria-label="Footer navigation" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[['#how-it-works','How it works'],['#plans','Plans'],['#for-gyms','For Gyms'],['#for-corporates','For Corporates'],['mailto:hello@bookmyfit.in','Contact']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <p style={{ fontSize: 12, color: 'var(--t3)' }}>© 2025 BookMyFit. All rights reserved.</p>
      </footer>
    </>
  );
}
