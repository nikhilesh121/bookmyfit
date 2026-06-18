'use client';

import { useEffect, useMemo } from 'react';

type PageProps = {
  params: {
    id: string;
  };
};

const ANDROID_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
  'https://play.google.com/store/apps/details?id=in.bookmyfit.app';

const IOS_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_URL ||
  'https://apps.apple.com/search?term=BookMyFit';

function getStoreUrl() {
  if (typeof navigator === 'undefined') return ANDROID_STORE_URL;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return IOS_STORE_URL;
  if (/Android/i.test(ua)) return ANDROID_STORE_URL;
  return ANDROID_STORE_URL;
}

export default function GymDeepLinkPage({ params }: PageProps) {
  const gymId = decodeURIComponent(params.id || '');
  const deepLink = useMemo(() => `bookmyfit://gym/${encodeURIComponent(gymId)}`, [gymId]);
  const storeUrl = useMemo(() => getStoreUrl(), []);

  useEffect(() => {
    let openedApp = false;
    const markOpened = () => {
      openedApp = true;
    };

    document.addEventListener('visibilitychange', markOpened, { once: true });
    window.location.href = deepLink;

    const fallback = window.setTimeout(() => {
      if (!openedApp && !document.hidden) {
        window.location.href = storeUrl;
      }
    }, 1300);

    return () => {
      window.clearTimeout(fallback);
      document.removeEventListener('visibilitychange', markOpened);
    };
  }, [deepLink, storeUrl]);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logoMark}>B</div>
        <p style={styles.kicker}>BookMyFit</p>
        <h1 style={styles.title}>Opening gym details</h1>
        <p style={styles.copy}>
          If BookMyFit is installed, this link opens the selected gym in the app. Otherwise, install the app and try again.
        </p>
        <div style={styles.actions}>
          <a href={deepLink} style={styles.primary}>Open in App</a>
          <a href={storeUrl} style={styles.secondary}>Download App</a>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    color: '#fff',
    background:
      'radial-gradient(circle at 22% 18%, rgba(204,255,0,0.16), transparent 28%), radial-gradient(circle at 78% 82%, rgba(0,120,255,0.14), transparent 30%), #070708',
    fontFamily: 'var(--sans), system-ui, sans-serif',
  },
  card: {
    width: 'min(100%, 440px)',
    padding: 28,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.055)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.42)',
    textAlign: 'center',
  },
  logoMark: {
    width: 72,
    height: 72,
    margin: '0 auto 18px',
    borderRadius: 22,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(204,255,0,0.12)',
    border: '1px solid rgba(204,255,0,0.32)',
    color: '#CCFF00',
    fontWeight: 900,
    fontSize: 34,
  },
  kicker: {
    color: '#CCFF00',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: 800,
    margin: 0,
  },
  title: {
    margin: '12px 0 10px',
    fontSize: 32,
    lineHeight: 1.08,
    fontWeight: 900,
  },
  copy: {
    margin: '0 auto 24px',
    maxWidth: 340,
    color: 'rgba(255,255,255,0.64)',
    lineHeight: 1.6,
    fontSize: 15,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primary: {
    padding: '13px 22px',
    borderRadius: 999,
    background: '#CCFF00',
    color: '#050505',
    fontWeight: 900,
    textDecoration: 'none',
  },
  secondary: {
    padding: '12px 20px',
    borderRadius: 999,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.06)',
    fontWeight: 800,
    textDecoration: 'none',
  },
};
