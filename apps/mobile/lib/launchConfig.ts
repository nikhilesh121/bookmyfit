import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './api';

export type LaunchSlide = {
  id?: string;
  imageUrl: string;
  image?: string;
  title: string;
  description: string;
  subtitle?: string;
  kicker?: string;
  aurora?: string[];
};

export type LaunchConfig = {
  splash: {
    minDurationMs: number;
    logoUrl?: string;
    imageUrl?: string;
    title: string;
    subtitle: string;
    backgroundColor?: string;
    showSpinner?: boolean;
  };
  onboarding: {
    kicker: string;
    slides: LaunchSlide[];
  };
  branding?: {
    logoUrl?: string;
    logoText?: string;
    shortText?: string;
  };
};

const CACHE_KEY = 'bmf_launch_config_v1';

export function launchMediaUrl(value?: string) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (/^(https?:|data:|file:)/i.test(clean)) return clean;
  if (clean.startsWith('/')) return `${API_BASE}${clean}`;
  return clean;
}

export const DEFAULT_LAUNCH_CONFIG: LaunchConfig = {
  splash: {
    minDurationMs: 1400,
    logoUrl: '',
    imageUrl: '',
    title: 'BookMyFit',
    subtitle: 'Opening BookMyFit...',
    backgroundColor: '#060606',
    showSpinner: true,
  },
  onboarding: {
    kicker: 'BOOKMYFIT',
    slides: [
      {
        id: 'train-anywhere',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        aurora: ['rgba(120,40,200,0.45)', 'rgba(255,120,40,0.25)'],
        title: 'Train Anywhere',
        description: 'One subscription. Access gyms across your city.',
      },
      {
        id: 'qr-check-in',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        aurora: ['rgba(0,140,255,0.35)', 'rgba(120,40,200,0.30)'],
        title: 'QR Check-In',
        description: 'Book a slot and get a secure QR code for the gym desk.',
      },
      {
        id: 'track-progress',
        imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        aurora: ['rgba(0,212,106,0.20)', 'rgba(0,140,255,0.30)'],
        title: 'Track Progress',
        description: 'See your visits, memberships, trainer add-ons, and bookings.',
      },
    ],
  },
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timer) };
}

function normalizeSlide(slide: any, index: number): LaunchSlide {
  const fallback = DEFAULT_LAUNCH_CONFIG.onboarding.slides[index % DEFAULT_LAUNCH_CONFIG.onboarding.slides.length];
  const description = String(slide?.description || slide?.subtitle || fallback.description).trim();
  return {
    id: String(slide?.id || fallback.id || `slide-${index + 1}`),
    imageUrl: String(slide?.imageUrl || slide?.image || fallback.imageUrl).trim(),
    image: String(slide?.image || slide?.imageUrl || fallback.imageUrl).trim(),
    title: String(slide?.title || fallback.title).trim(),
    description,
    subtitle: description,
    kicker: String(slide?.kicker || '').trim(),
    aurora: Array.isArray(slide?.aurora) && slide.aurora.length >= 2 ? slide.aurora : fallback.aurora,
  };
}

export function normalizeLaunchConfig(value: any): LaunchConfig {
  const fallback = DEFAULT_LAUNCH_CONFIG;
  const rawSlides = Array.isArray(value?.onboarding?.slides) ? value.onboarding.slides : [];
  const sourceSlides = rawSlides.length ? rawSlides : fallback.onboarding.slides;
  const slides = sourceSlides.map(normalizeSlide);
  while (slides.length < 3) {
    slides.push(normalizeSlide(fallback.onboarding.slides[slides.length], slides.length));
  }

  const minDuration = Number(value?.splash?.minDurationMs ?? value?.splash?.durationMs);
  return {
    splash: {
      minDurationMs: Number.isFinite(minDuration) ? Math.min(10000, Math.max(500, Math.round(minDuration))) : fallback.splash.minDurationMs,
      logoUrl: String(value?.splash?.logoUrl || value?.branding?.logoUrl || '').trim(),
      imageUrl: String(value?.splash?.imageUrl || '').trim(),
      title: String(value?.splash?.title || value?.branding?.logoText || fallback.splash.title).trim(),
      subtitle: String(value?.splash?.subtitle || value?.splash?.message || fallback.splash.subtitle).trim(),
      backgroundColor: String(value?.splash?.backgroundColor || fallback.splash.backgroundColor).trim(),
      showSpinner: value?.splash?.showSpinner !== false,
    },
    onboarding: {
      kicker: String(value?.onboarding?.kicker || fallback.onboarding.kicker).trim(),
      slides,
    },
    branding: value?.branding || {},
  };
}

async function cachedLaunchConfig() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? normalizeLaunchConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function loadLaunchConfig(timeoutMs = 1600): Promise<LaunchConfig> {
  const cached = await cachedLaunchConfig();
  const fallback = cached || DEFAULT_LAUNCH_CONFIG;
  const { controller, done } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/v1/mobile/launch-config`, { signal: controller.signal });
    if (!res.ok) return fallback;
    const data = await res.json();
    const normalized = normalizeLaunchConfig(data);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(normalized)).catch(() => {});
    return normalized;
  } catch {
    return fallback;
  } finally {
    done();
  }
}
