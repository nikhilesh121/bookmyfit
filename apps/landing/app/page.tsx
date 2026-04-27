import ScrollReveal from '../components/ScrollReveal';
import StatCounter from '../components/StatCounter';
import EarlyAccessForm from '../components/EarlyAccessForm';
import FaqAccordion from '../components/FaqAccordion';

/* ─── SVG helpers ───────────────────────────────── */
const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const Star = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ─── QR code visual pattern (8×8) ─────────────── */
const QR = [1,1,1,0,0,1,1,1, 1,0,1,0,0,1,0,1, 1,1,1,0,0,1,1,1, 0,0,0,1,0,0,0,0, 1,1,0,0,1,1,0,1, 0,0,1,1,0,0,1,0, 1,0,1,0,1,1,1,1, 1,1,0,0,0,1,0,1];

/* ─── Data ──────────────────────────────────────── */
const STATS = [
  { num: '1,000+', label: 'Partner Gyms' },
  { num: '50+',    label: 'Cities Covered' },
  { num: '₹599',   label: 'From / Month' },
  { num: '<3s',    label: 'QR Check-in' },
];

const FEATURES = [
  { title: 'Multi-Gym Access',      desc: 'One QR code, any partner gym, any city. Scan in and work out — zero friction.',                                                                path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { title: 'AI-Verified Check-in',  desc: 'Instant entry in under 3 seconds. AI reads your QR, logs the visit, and opens the gate — no tokens, no paper.',                               path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { title: 'Session Intelligence',  desc: 'Every visit auto-logged. Track streaks, consistency, and frequency with rich personal dashboards.',                                             path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'PT & Video Library',    desc: 'Book personal training at partner gyms or stream 500+ on-demand workout videos — anytime, anywhere.',                                           path: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
];

const HOW = [
  { n: '01', title: 'Sign up with your phone',  desc: 'OTP login — no passwords, no friction. Your account is live in under 60 seconds.' },
  { n: '02', title: 'Choose your plan',          desc: 'From Individual (₹599) to Max (₹3,999). Every plan includes unlimited daily visits to your chosen gyms.' },
  { n: '03', title: 'Scan and work out',          desc: 'Open the app, tap QR, walk into any partner gym. AI-verified entry in under 3 seconds.' },
  { n: '04', title: 'Track and grow',            desc: 'Every session auto-logged. View your streak, book PT trainers, stream workout videos — all in one place.' },
];

const PLANS = [
  { name: 'Individual', tagline: 'Your home gym, perfected',           price: '₹599',   sub: 'Single gym access',          features: ['1 partner gym of your choice','Unlimited daily visits','QR check-in','Session history & streaks','Workout video library'],                              popular: false },
  { name: 'Elite',      tagline: 'For the city-hopping professional',  price: '₹1,499', sub: 'Access up to 5 gyms',        features: ['Up to 5 gyms in our network','Multi-city access','Full video library','Priority support','Workout analytics'],                                        popular: true  },
  { name: 'Max',        tagline: 'No limits, anywhere',                price: '₹3,999', sub: 'Unlimited gym access',       features: ['Unlimited gyms across India','1 visit/day per gym','PT session add-ons','Concierge support','Early feature access'],                                   popular: false },
];

const GYM_PERKS = [
  { title: 'Zero Upfront Cost',       desc: 'No fees, no hardware. List your gym and start earning from member visits from day one.' },
  { title: 'Real-time Dashboard',     desc: 'Track check-ins, revenue, and member activity from a clean partner portal. Full transparency.' },
  { title: 'Automated Settlements',  desc: 'Monthly payouts to your bank. Raise disputes and download invoices in one click.' },
];

const CORP_PERKS = [
  { title: 'Per-Seat Billing',    desc: 'Pay only for active employees. Add or remove seats any time. No annual commitments.' },
  { title: 'Nationwide Access',   desc: 'Employees in different cities? One plan unlocks all partner gyms across India.' },
  { title: 'Wellness Analytics',  desc: "See who is using it, when, and where. Prove wellness ROI to your leadership with rich usage reports." },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma',    role: 'Product Manager',     city: 'Bangalore',  text: "I travel between offices every week. BookMyFit lets me hit a top gym near any location. QR check-in is seamless.",                                    plan: 'Elite Plan',    initials: 'PS' },
  { name: 'Ananya Krishnan', role: 'Marketing Director',  city: 'Chennai',    text: "The corporate plan transformed our wellness programme. Setup took 10 minutes. Our team loves having gym choices instead of being locked to one location.", plan: 'Corporate',     initials: 'AK' },
  { name: 'Vikram Singh',    role: 'Gym Owner',           city: 'Pune',       text: "BookMyFit brings new members every week with zero marketing spend. The dashboard is clean and settlements are always on time.",                            plan: 'Gym Partner',   initials: 'VS' },
  { name: 'Deepa Nair',      role: 'Software Engineer',   city: 'Hyderabad',  text: "I move apartments frequently. With the Max plan I never worry about finding a new gym — covered in any city, any neighbourhood.",                        plan: 'Max Plan',      initials: 'DN' },
];

const CITIES = ['Mumbai','Bangalore','Delhi','Chennai','Pune','Hyderabad','Kolkata','Ahmedabad','Jaipur','Kochi','Indore','Surat','Chandigarh','Lucknow','Bhubaneswar','Coimbatore'];

const FAQS = [
  { q: 'Can I visit any gym, any time?',                ans: 'Yes. With Elite and Max plans you can visit any partner gym in any city. Individual plan gives you unlimited access to 1 gym of your choice. All plans support 1 visit per gym per day.' },
  { q: 'How does QR check-in work?',                   ans: 'Open the BookMyFit app and tap "Check In". Your unique QR code appears — show it to the gym reception or hold it up to the scanner. Entry is verified in under 3 seconds. No tokens, no paper.' },
  { q: 'Is there a lock-in period?',                   ans: 'No. All plans are monthly. Cancel any time from within the app before your next billing date — no questions asked, no cancellation fee.' },
  { q: 'When does my subscription start?',             ans: 'Your subscription is active from the moment your payment is confirmed. You can walk into any partner gym right away.' },
  { q: 'Do corporate plans work differently?',         ans: 'Yes. HR teams get a dedicated portal to add/remove employees, track usage, and manage billing. Employees download the app, log in with their work email, and get instant access. You pay only for active seats.' },
  { q: 'How do gym owners get paid?',                  ans: 'Partner gyms receive monthly settlements directly to their bank account for every verified member visit. Payouts are transparent — view a full breakdown on your partner dashboard and raise disputes if needed.' },
  { q: 'Which cities are covered?',                    ans: 'We are launching in Bangalore, Mumbai, Delhi, Hyderabad, Pune, and Chennai first. Expansion to 50+ cities is planned through 2025. Enter your city on the early-access form to get notified.' },
  { q: 'Is there a free trial?',                       ans: 'Early-access members get 3 months free on any plan before full launch. Sign up above to secure your spot.' },
];

const GYM_URL  = process.env.NEXT_PUBLIC_GYM_URL  || '/onboard?tab=gym';
const CORP_URL = process.env.NEXT_PUBLIC_CORP_URL  || '/onboard?tab=corporate';

/* ─── Layout constants ──────────────────────────── */
const sec:    React.CSSProperties = { padding: '72px 5vw', position: 'relative', zIndex: 1 };
const secAlt: React.CSSProperties = { ...sec, background: 'rgba(255,255,255,0.012)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' };
const H2:     React.CSSProperties = { fontFamily: 'var(--serif)', fontSize: 'clamp(34px,5vw,58px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.06 };
const Sub:    React.CSSProperties = { fontSize: 17, color: 'var(--t2)', lineHeight: 1.7, maxWidth: 520 };

/* ─── Page ──────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <ScrollReveal />
      <div className="aurora aurora-1" aria-hidden="true" />
      <div className="aurora aurora-2" aria-hidden="true" />
      <div className="aurora aurora-3" aria-hidden="true" />

      {/* ── Navbar ──────────────────────────────── */}
      <nav aria-label="Main navigation" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5vw', height: 64, background: 'rgba(6,6,6,0.45)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, letterSpacing: -1, textDecoration: 'none', color: '#fff' }}>
          Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {([['#features','Features'],['#plans','Plans'],['#for-gyms','For Gyms'],['#for-corporates','Corporates'],['#faq','FAQ']] as [string,string][]).map(([href, label]) => (
            <a key={href} href={href} className="nav-link hidden sm:block">{label}</a>
          ))}
          <a href="#early-access" className="btn btn-primary" style={{ padding: '9px 22px', fontSize: 13 }}>Early Access</a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 5vw 56px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <div className="hero-grid" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '7vw', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1200, width: '100%', position: 'relative', zIndex: 1 }}>

          {/* ── Left copy ── */}
          <div style={{ flex: '1 1 480px', maxWidth: 600 }}>
            <div className="hero-animate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 1.6s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)' }}>Early Access — Limited Spots</span>
            </div>

            <h1 className="hero-animate hero-animate-delay-1" style={{ ...H2, fontSize: 'clamp(46px,7.5vw,88px)', marginBottom: 24, maxWidth: 640 }}>
              India&apos;s fitness<br />
              <em style={{ fontStyle: 'italic', fontWeight: 400 }} className="gradient-text">everywhere</em> you go.
            </h1>

            <p className="hero-animate hero-animate-delay-2" style={{ ...Sub, fontSize: 19, marginBottom: 42 }}>
              One subscription. 1,000+ premium gyms. AI-powered QR check-in. Stop being locked to one location — work out anywhere in India.
            </p>

            <div className="hero-animate hero-animate-delay-3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <a href="#early-access" className="btn btn-primary btn-lg" style={{ gap: 10 }}>Join the Waitlist — Free <Arrow /></a>
              <a href="#how-it-works" className="btn btn-ghost btn-lg">See how it works</a>
            </div>

            <div className="hero-animate hero-animate-delay-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}>
              {(['App Store', 'Google Play'] as const).map((label) => (
                <a key={label} href="#early-access" aria-label={`Coming soon on ${label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 20px', textDecoration: 'none', color: '#fff', minWidth: 154, transition: 'all 0.2s' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                    {label === 'App Store' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.35.2.74.24 1.12.13l.08-.05 10.72-6.01-2.34-2.34-9.58 8.27zm-1.18-20.5v17.48l9.08-8.74L2 3.26zM20.07 10.3l-2.32-1.3-2.62 2.52 2.62 2.52 2.35-1.32c.67-.38.67-1.04-.03-1.42zM4.3.11L15.02 6.12l-2.34 2.34L3.1.24 4.3.11z"/></svg>
                    )}
                  </span>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Coming soon on</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                  </div>
                </a>
              ))}
            </div>

            <div className="hero-animate hero-animate-delay-5" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 32 }}>
              {STATS.map((st) => (
                <div key={st.label}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>{st.num}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 5 }}>{st.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right visual ── */}
          <div className="hero-animate hero-animate-delay-2" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Toast notification floating above */}
            <div className="toast-float" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,15,15,0.92)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 16, padding: '10px 16px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(204,255,0,0.1)' }}>
              <span style={{ width: 28, height: 28, background: 'rgba(204,255,0,0.12)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCFF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Check-in verified ✓</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Iron House Gym · 2s ago</div>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="phone-frame float" style={{ width: 260, background: 'rgba(12,12,12,0.92)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 36, padding: '0 18px 24px', backdropFilter: 'blur(28px)', boxShadow: '0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(204,255,0,0.07)' }}>
              {/* Notch */}
              <div style={{ width: 72, height: 22, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 14px 14px', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                <span style={{ width: 22, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
              </div>
              {/* App header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700 }}>BookMyFit</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: 'var(--accent)', background: 'rgba(204,255,0,0.1)', padding: '3px 8px', borderRadius: 100 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />Elite
                </span>
              </div>
              {/* QR code */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, marginBottom: 16, border: '1px solid rgba(204,255,0,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 3.5 }}>
                  {QR.map((v, i) => (
                    <div key={i} style={{ aspectRatio: '1', background: v ? (i % 7 === 0 ? '#CCFF00' : 'rgba(255,255,255,0.82)') : 'transparent', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
              {/* Gym info */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 5 }}>Active session at</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Iron House Gym</div>
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>Mumbai, Bandra West</div>
              </div>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 100, fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, animation: 'pulse-dot 1.8s infinite' }} />Valid today
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>18 sessions this month</div>
              </div>
            </div>

            {/* Stat pills row */}
            <div style={{ display: 'flex', gap: 10, width: 260 }}>
              {[{ l: 'Streak', v: '7', u: 'days 🔥' }, { l: 'This week', v: '4', u: 'sessions' }, { l: 'Saved', v: '₹2.4k', u: 'vs single gym' }].map((s) => (
                <div key={s.l} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 10px' }}>
                  <div style={{ fontSize: 8, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 3 }}>{s.u}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Cities marquee ───────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '18px 0', overflow: 'hidden', position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', gap: 0, width: 'max-content' }} className="marquee-track">
          {[...CITIES, ...CITIES].map((city, i) => (
            <span key={i} style={{ padding: '0 24px', fontSize: 13, color: 'var(--t3)', fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.55 }} />{city}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────── */}
      <section id="features" style={sec}>
        <p className="kicker reveal">Platform</p>
        <h2 style={{ ...H2, marginBottom: 12 }} className="reveal">
          Everything you need<br />to stay fit, <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>anywhere</em>
        </h2>
        <p style={{ ...Sub, marginBottom: 28 }} className="reveal">
          Built for the modern professional who refuses to be locked to a single location.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
          {FEATURES.map((f, i) => (
            <article key={f.title} className={`glass-card reveal reveal-delay-${(i % 4) + 1}`} style={{ padding: '24px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div className="icon-box" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.path} />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Multi-gym explainer ──────────────────── */}
      <section id="multigym" style={secAlt}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '4vw', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <p className="kicker reveal">The BookMyFit Advantage</p>
            <h2 style={{ ...H2, marginBottom: 20 }} className="reveal">
              One network.<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>Every city.</em>
            </h2>
            <p style={{ ...Sub, marginBottom: 28 }} className="reveal">
              Traditional memberships lock you to one location. Move neighbourhoods? New city for work? Travelling? You are stuck paying for a gym you cannot use.
            </p>
            <p style={{ ...Sub, marginBottom: 24 }} className="reveal">
              BookMyFit works the other way. Your subscription travels with you. Every partner gym across 50+ cities accepts your QR code — the Spotify model for fitness.
            </p>
            <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Access any partner gym, any day, any city','Switch gyms based on your location or mood','One QR code everywhere — no re-registration','Corporate accounts manage hundreds of employees at once'].map((pt) => (
                <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}><Check /></span>
                  <span style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.55 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="compare-old">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,90,90,0.75)', marginBottom: 16 }}>The old way</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Locked to 1 gym forever','Useless when you travel or relocate','Rigid annual contracts','No flexibility on plan changes'].map((x) => (
                  <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'rgba(255,90,90,0.6)', fontWeight: 700, fontSize: 17 }}>—</span>
                    <span style={{ fontSize: 14, color: 'var(--t2)' }}>{x}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="compare-new">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>The BookMyFit way</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['1,000+ gyms across all of India','Works in every city you visit or move to','Cancel any month — zero commitment','Upgrade or downgrade freely at any time'].map((x) => (
                  <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}><Check /></span>
                    <span style={{ fontSize: 14, color: 'var(--t)' }}>{x}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                { end: 1000, suffix: '+', label: 'Partner gyms' },
                { end: 50,   suffix: '+', label: 'Cities live'  },
                { end: 3,    suffix: '',  label: 'Plan tiers'   },
                { end: 99,   suffix: '%', label: 'Uptime SLA'   },
              ] as { end: number; suffix: string; label: string }[]).map((s) => (
                <StatCounter key={s.label} end={s.end} suffix={s.suffix} label={s.label} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section id="how-it-works" style={sec}>
        <p className="kicker reveal">Simple by Design</p>
        <h2 style={{ ...H2, marginBottom: 16 }} className="reveal">
          Four steps to <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>fitness freedom</em>
        </h2>
        <p style={{ ...Sub, marginBottom: 44 }} className="reveal">No contracts, no queues, no confusion. Ready in minutes.</p>
        <div className="steps-grid">
          {HOW.map((h, i) => (
            <div key={h.n} className={`step-connector reveal reveal-delay-${i + 1}`} style={{ padding: '0 16px 0 0' }}>
              <article style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 22px', height: '100%', position: 'relative', overflow: 'hidden', transition: 'border-color 0.3s, transform 0.3s' }}>
                {/* Big ghost number bg */}
                <div style={{ fontFamily: 'var(--serif)', fontSize: 96, fontWeight: 900, color: 'rgba(204,255,0,0.04)', position: 'absolute', bottom: -18, right: -4, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{h.n}</div>
                {/* Step badge */}
                <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(204,255,0,0.18), rgba(204,255,0,0.06))', border: '1px solid rgba(204,255,0,0.28)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 900, color: 'var(--accent)', marginBottom: 20 }}>{h.n}</div>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, lineHeight: 1.35 }}>{h.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.72, margin: 0 }}>{h.desc}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plans ────────────────────────────────── */}
      <section id="plans" style={secAlt}>
        <p className="kicker reveal">Pricing</p>
        <h2 style={{ ...H2, marginBottom: 12 }} className="reveal">
          Choose your <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>level</em>
        </h2>
        <p style={{ ...Sub, marginBottom: 36 }} className="reveal">All plans include unlimited visits. No hidden fees. Cancel any month.</p>

        <div className="pricing-grid reveal" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {PLANS.map((plan) => (
            <article key={plan.name}
              className={plan.popular ? 'glass-card-featured featured-glow' : 'glass-card'}
              style={{ padding: '32px 28px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {plan.popular && <div className="plan-badge">Most Popular</div>}
              <div style={{ marginTop: plan.popular ? 10 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: plan.popular ? 'var(--accent)' : 'rgba(255,255,255,0.35)', background: plan.popular ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${plan.popular ? 'rgba(204,255,0,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 100, display: 'inline-block', padding: '3px 12px', marginBottom: 14 }}>{plan.sub}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 22 }}>{plan.tagline}</div>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-2px', color: plan.popular ? 'var(--accent)' : '#fff' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: 'var(--t2)' }}>/month</span>
                </div>
                <hr className="gradient-divider" style={{ marginBottom: 22 }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                      <span style={{ color: 'var(--accent)', flexShrink: 0, width: 16, height: 16, background: 'rgba(204,255,0,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check /></span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="#early-access" className={plan.popular ? 'btn btn-primary' : 'btn btn-ghost'} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>
                Get Early Access
              </a>
            </article>
          ))}
        </div>
        <p className="reveal" style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--t3)' }}>
          🎁 Early-access members get <strong style={{ color: 'var(--accent)' }}>3 months free</strong> on any plan before launch
        </p>
      </section>

      {/* ── For Gyms ─────────────────────────────── */}
      <section id="for-gyms" style={sec}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '4vw', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <p className="kicker reveal">Gym Partners</p>
            <h2 style={{ ...H2, marginBottom: 16 }} className="reveal">
              Grow your gym.<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>We bring members.</em>
            </h2>
            <p style={{ ...Sub, marginBottom: 24 }} className="reveal">Join 1,000+ gym partners earning from every BookMyFit member who walks through your door. Zero upfront cost, zero technical complexity.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {GYM_PERKS.map((p) => (
                <div key={p.title} className="reveal" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div className="icon-box" style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.65 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="reveal" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <a href={GYM_URL} className="btn btn-primary btn-lg">Register Your Gym</a>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>Live within 2–3 business days</span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="dash-card reveal float">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Gym Dashboard</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)', background: 'rgba(204,255,0,0.08)', padding: '3px 10px', borderRadius: 100 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />Live
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[{ l: "Today's Check-ins", v: '47' },{ l: 'Monthly Revenue', v: '₹1.2L' },{ l: 'Active Members', v: '312' },{ l: 'Settlement Due', v: '₹48K' }].map((s) => (
                <div key={s.l} className="dash-stat">
                  <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{s.l}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Recent Check-ins</div>
              {['Ananya K.', 'Rahul M.', 'Deepa N.'].map((n, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>{n[0]}</div>
                    <span style={{ fontSize: 13 }}>{n}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(204,255,0,0.08)', padding: '2px 9px', borderRadius: 100 }}>Checked in</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Corporates ───────────────────────── */}
      <section id="for-corporates" style={secAlt}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '4vw', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          {/* HR portal preview */}
          <div className="dash-card reveal float">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Corporate Portal</span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>Q1 2025</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[{ l: 'Employees', v: '148' },{ l: 'Active Seats', v: '131' },{ l: 'Monthly Bill', v: '₹1.3L' }].map((s) => (
                <div key={s.l} className="dash-stat">
                  <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>{s.l}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: 'var(--t2)' }}>Seat utilisation</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>88.5%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 6 }}>
                <div style={{ width: '88.5%', height: '100%', background: 'var(--accent)', borderRadius: 100 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '9px 0', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.18)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add seats</div>
              <div style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>View report</div>
            </div>
          </div>

          <div>
            <p className="kicker reveal">Corporate Wellness</p>
            <h2 style={{ ...H2, marginBottom: 16 }} className="reveal">
              Healthy teams.<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>₹999 per employee.</em>
            </h2>
            <p style={{ ...Sub, marginBottom: 24 }} className="reveal">Give every employee unlimited multi-gym access from one HR dashboard. We handle billing per seat — you focus on culture and retention.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {CORP_PERKS.map((p) => (
                <div key={p.title} className="reveal" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div className="icon-box" style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.65 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="reveal" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <a href={CORP_URL} className="btn btn-primary btn-lg">Register Your Company</a>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>Starting at ₹999 / employee / month</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────── */}
      <section style={sec}>
        <p className="kicker reveal">Social Proof</p>
        <h2 style={{ ...H2, marginBottom: 16 }} className="reveal">
          Loved by fitness <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }} className="text-glow">professionals</em>
        </h2>
        <p style={{ ...Sub, marginBottom: 36 }} className="reveal">Join thousands of users who have made BookMyFit their fitness companion.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {TESTIMONIALS.map((t, i) => (
            <article key={t.name} className={`testi-card reveal reveal-delay-${(i % 4) + 1}`}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                {Array(5).fill(0).map((_, j) => <Star key={j} />)}
              </div>
              <p style={{ fontSize: 14, color: 'var(--t)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 18 }}>&ldquo;{t.text}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar-grad" style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{t.role} · {t.city}</div>
                  </div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.15)', padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.plan}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────── */}
      <section id="faq" style={sec}>
        <p className="kicker reveal">FAQ</p>
        <h2 style={{ ...H2, marginBottom: 12, textAlign: 'center' }} className="reveal">
          Questions <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>answered</em>
        </h2>
        <p style={{ ...Sub, marginBottom: 36, textAlign: 'center', margin: '0 auto 36px' }} className="reveal">
          Everything you need to know before you sign up.
        </p>
        <FaqAccordion items={FAQS} />
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section id="early-access" style={{ padding: '60px 5vw', position: 'relative', zIndex: 1 }}>
        <div className="reveal" style={{ background: 'linear-gradient(135deg, rgba(204,255,0,0.07) 0%, rgba(0,80,255,0.05) 50%, rgba(204,255,0,0.04) 100%)', border: '1px solid rgba(204,255,0,0.15)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 32, padding: 'clamp(32px,5vw,56px) 5vw', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 100, padding: '5px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 26 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-dot 1.6s ease-in-out infinite' }} />Limited Spots Available
          </div>
          <h2 style={{ ...H2, fontSize: 'clamp(30px,5vw,52px)', marginBottom: 16 }}>
            Get early access<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>before launch</em>
          </h2>
          <p style={{ ...Sub, margin: '0 auto 40px', textAlign: 'center' }}>
            Be the first to know when BookMyFit launches in your city.<br />Early users get 3 months free on any plan.
          </p>
          <EarlyAccessForm />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            <a href={GYM_URL}  className="btn btn-ghost">I own a gym — Onboard my gym</a>
            <a href={CORP_URL} className="btn btn-ghost">I&apos;m in HR — Register my company</a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer role="contentinfo" style={{ borderTop: '1px solid var(--border)', padding: '40px 5vw', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
          {/* Brand */}
          <div style={{ maxWidth: 260 }}>
            <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              Book<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t2)' }}>My</em>Fit
            </a>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.65 }}>One QR code. Every gym in India. Unlimited access, zero friction.</p>
            {/* Social */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {[
                { href: 'https://instagram.com/bookmyfit', label: 'Instagram', d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                { href: 'https://twitter.com/bookmyfit', label: 'X / Twitter', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { href: 'https://linkedin.com/company/bookmyfit', label: 'LinkedIn', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
              ].map(({ href, label, d }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="social-icon"
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', transition: 'all 0.2s', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
                </a>
              ))}
            </div>
          </div>
          {/* Links columns */}
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>Product</p>
              {[['#features','Features'],['#plans','Pricing'],['#how-it-works','How it works'],['#faq','FAQ']].map(([href, label]) => (
                <a key={href} href={href} className="nav-link" style={{ display: 'block', marginBottom: 9, fontSize: 13 }}>{label}</a>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>Partners</p>
              {[['/onboard?tab=gym','List your gym'],['/onboard?tab=corporate','Corporate plans'],['#for-gyms','Gym benefits'],['#for-corporates','HR benefits']].map(([href, label]) => (
                <a key={href} href={href} className="nav-link" style={{ display: 'block', marginBottom: 9, fontSize: 13 }}>{label}</a>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>Legal</p>
              {[['mailto:hello@bookmyfit.in','Contact us'],['/privacy','Privacy Policy'],['/terms','Terms of Service'],['/refund','Refund Policy']].map(([href, label]) => (
                <a key={href} href={href} className="nav-link" style={{ display: 'block', marginBottom: 9, fontSize: 13 }}>{label}</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>© 2025 BookMyFit Technologies Pvt Ltd · All rights reserved</p>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>Made with ❤️ in India 🇮🇳</p>
        </div>
      </footer>
    </>
  );
}
