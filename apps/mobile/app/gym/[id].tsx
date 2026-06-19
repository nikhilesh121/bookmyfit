import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, Share, Linking, Image, FlatList, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { colors, fonts, radius } from '../../theme/brand';
import {
  IconArrowLeft, IconStar, IconPin, IconArrowRight, IconCheck, IconClock,
  IconDumbbell, IconShare, IconLock, IconRefresh, IconGlobe,
  IconShield, IconHeadphones, IconBolt, IconPlay,
} from '../../components/Icons';
import { gymsApi, subscriptionsApi, api, API_BASE } from '../../lib/api';
import { accessLabelForSubscription, getActiveSubscriptionAccess, normalizeSubscriptionList, subscriptionPlanType } from '../../lib/subscriptionAccess';
import AuroraBackground from '../../components/AuroraBackground';
import { DEFAULT_GYM_IMAGE, firstImage, imageList } from '../../lib/imageFallbacks';
import { applyPassCommission } from '../../lib/passPricing';

const { width } = Dimensions.get('window');

const TIER_COLORS: Record<string, string> = {
  Elite: '#00D46A',
  Premium: '#9B00FF',
  Standard: '#FF8A00',
};
const TIER_AURORA: Record<string, string> = {
  Elite: 'rgba(0,212,106,0.22)',
  Premium: 'rgba(155,0,255,0.22)',
  Standard: 'rgba(255,138,0,0.18)',
};

function tierLabel(value: any): 'Elite' | 'Premium' | 'Standard' {
  const key = String(value || '').toLowerCase();
  if (key.includes('elite') || key.includes('corporate')) return 'Elite';
  if (key.includes('premium')) return 'Premium';
  return 'Standard';
}

function AmenityIcon({ label, iconUrl }: { label: string; iconUrl?: string | null }) {
  const customIcon = String(iconUrl || '').trim();
  if (customIcon && !customIcon.startsWith('lucide:')) {
    const iconImage = firstImage(customIcon);
    if (iconImage) return <Image source={{ uri: iconImage }} style={{ width: 16, height: 16 }} resizeMode="contain" />;
  }

  const value = `${label} ${customIcon}`.toLowerCase();
  let Icon = IconShield;

  if (value.includes('locker') || value.includes('changing') || value.includes('lock-keyhole')) Icon = IconLock;
  else if (value.includes('wifi') || value.includes('internet')) Icon = IconGlobe;
  else if (value.includes('parking') || value.includes('location') || value.includes('parking-circle')) Icon = IconPin;
  else if (value.includes('shower') || value.includes('wash') || value.includes('water') || value.includes('waves')) Icon = IconRefresh;
  else if (value.includes('trainer') || value.includes('coach') || value.includes('user-round-check')) Icon = IconHeadphones;
  else if (value.includes('ac') || value.includes('air') || value.includes('steam') || value.includes('sauna') || value.includes('snowflake') || value.includes('flame') || value.includes('air-vent')) Icon = IconBolt;
  else if (value.includes('equipment') || value.includes('weight') || value.includes('cardio') || value.includes('gym') || value.includes('dumbbell') || value.includes('activity') || value.includes('bike')) Icon = IconDumbbell;
  else if (value.includes('sparkles') || value.includes('flower') || value.includes('badge') || value.includes('apple') || value.includes('nutrition') || value.includes('recovery') || value.includes('heart-pulse')) Icon = IconShield;

  return <Icon size={16} color={colors.accent} />;
}

function positiveNumber(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function planMonths(plan: any) {
  return Math.max(1, Math.round(Number(plan?.durationDays || plan?.days || 30) / 30));
}

function minMonthlyPlanPrice(plans: any[], commission?: any) {
  const monthlyPrices = plans
    .filter((plan) => plan?.isActive !== false)
    .map((plan) => {
      const salePrice = positiveNumber(plan?.checkoutSalePrice) || applyPassCommission(positiveNumber(plan?.salePrice) || positiveNumber(plan?.price || plan?.basePrice), commission);
      const checkoutPrice = salePrice;
      return checkoutPrice ? checkoutPrice / planMonths(plan) : null;
    })
    .filter((price): price is number => !!price);

  return monthlyPrices.length ? Math.min(...monthlyPrices) : null;
}

function formatDateLabel(value: any) {
  if (!value) return '';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatClockTime(value: any) {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return String(value);

  const hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return String(value);

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatClockRange(start?: any, end?: any, fallback?: any) {
  if (start && end) return `${formatClockTime(start)} - ${formatClockTime(end)}`;

  const text = fallback ? String(fallback) : '';
  const parts = text.split(/\s*[-–]\s*/);
  if (parts.length === 2 && /^\d{1,2}:\d{2}$/.test(parts[0]) && /^\d{1,2}:\d{2}$/.test(parts[1])) {
    return `${formatClockTime(parts[0])} - ${formatClockTime(parts[1])}`;
  }
  return text;
}

function toTextArray(value: any): string[] {
  const raw = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    if (text.startsWith('{') && text.endsWith('}')) {
      const matches = text.slice(1, -1).match(/"((?:\\.|[^"\\])*)"|[^,]+/g) || [];
      return matches.map((item) => item.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'));
    }
    return text.split(',');
  })();
  return [...new Set(raw
    .map((item: any) => (typeof item === 'string' ? item : (item?.name || item?.label || item?.title || '')))
    .map((item: string) => item.trim())
    .filter(Boolean))];
}

function videoUrlList(...values: any[]): string[] {
  const videos: string[] = [];
  const clean = (value: any): string => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const url = clean(item);
        if (url && !videos.includes(url)) videos.push(url);
      });
      return '';
    }
    if (value && typeof value === 'object') {
      return clean(value.url || value.uri || value.videoUrl || value.video_url || value.mediaUrl || value.media_url || value.path);
    }
    if (typeof value !== 'string') return '';
    const url = value.trim();
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || /^data:video\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    if (/^(uploads|media|files|storage|assets)\//i.test(url) || /\.(mp4|mov|m4v|webm|m3u8)(\?.*)?$/i.test(url)) {
      return `${API_BASE}/${url.replace(/^\/+/, '')}`;
    }
    return '';
  };
  values.forEach((value) => {
    const url = clean(value);
    if (url && !videos.includes(url)) videos.push(url);
  });
  return videos;
}

function coordinate(...values: any[]): number | null {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num !== 0) return num;
  }
  return null;
}

function ratingNumber(value: any): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.min(5, Math.max(0, num));
}

function firstRatingNumber(...values: any[]): number | null {
  for (const value of values) {
    const rating = ratingNumber(value);
    if (rating !== null) return rating;
  }
  return null;
}

function countNumber(value: any): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function firstCountNumber(...values: any[]): number | null {
  for (const value of values) {
    const count = countNumber(value);
    if (count !== null) return count;
  }
  return null;
}

function reviewCountLabel(count: number) {
  return `${count} ${count === 1 ? 'review' : 'reviews'}`;
}

function normalizeRatingList(data: any): any[] {
  const list = Array.isArray(data)
    ? data
    : data?.ratings || data?.reviews || data?.items || data?.results || data?.data?.ratings || data?.data?.reviews || data?.data || [];
  return Array.isArray(list) ? list : [];
}

function ratingFromReview(item: any): number | null {
  return firstRatingNumber(item?.stars, item?.rating, item?.score, item?.value);
}

function ratingSummaryFromResponse(data: any, list: any[]) {
  const source = Array.isArray(data)
    ? {}
    : data?.summary || data?.stats || data?.meta || data?.data?.summary || data?.data || data || {};
  const explicitRating = firstRatingNumber(
    source?.averageRating,
    source?.avgRating,
    source?.rating,
    source?.meanRating,
  );
  const explicitCount = firstCountNumber(
    source?.ratingCount,
    source?.ratingsCount,
    source?.reviewCount,
    source?.reviewsCount,
    source?.count,
    source?.total,
  );
  const scores = list.map(ratingFromReview).filter((value): value is number => value !== null);
  const count = explicitCount ?? scores.length;
  const rating = explicitRating ?? (scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null);
  return { rating, count };
}

function SkeletonRect({ h, style }: { h: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' }, style]} />;
}

export default function GymDetail() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 34);
  const { id, fallbackName, fallbackAddress, fallbackRating, fallbackReviewCount, fallbackTier, fallbackImg } = useLocalSearchParams<{
    id: string;
    fallbackName?: string;
    fallbackAddress?: string;
    fallbackRating?: string;
    fallbackReviewCount?: string;
    fallbackTier?: string;
    fallbackImg?: string;
  }>();
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'About' | 'Sessions' | 'Trainers' | 'Reviews'>('About');
  const [activeSub, setActiveSub] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState<{ rating: number | null; count: number; loaded: boolean }>({ rating: null, count: 0, loaded: false });
  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [gymPlansLoading, setGymPlansLoading] = useState(false);
  const [passPricingConfig, setPassPricingConfig] = useState<any>(null);
  const [sessionSlots, setSessionSlots] = useState<any[]>([]);
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [slotDate, setSlotDate] = useState<string>(new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroListRef = useRef<FlatList<any>>(null);

  const fallbackGym = useCallback(() => {
    if (!id) return null;
    const hasFallbackData = [fallbackName, fallbackAddress, fallbackImg].some((value) => typeof value === 'string' && value.trim());
    if (!hasFallbackData) return null;
    const image = typeof fallbackImg === 'string' && fallbackImg.trim() ? fallbackImg : null;
    const reviewCount = firstCountNumber(fallbackReviewCount) || 0;
    const rating = reviewCount > 0 ? firstRatingNumber(fallbackRating) : null;
    return {
      id: String(id),
      name: fallbackName || 'Gym',
      address: fallbackAddress || '',
      rating,
      avgRating: rating,
      ratingCount: reviewCount,
      ratingsCount: reviewCount,
      reviewCount,
      tier: fallbackTier || 'Standard',
      coverPhoto: image,
      photos: image ? [image] : [],
    };
  }, [id, fallbackName, fallbackAddress, fallbackRating, fallbackReviewCount, fallbackTier, fallbackImg]);

  const loadSubscriptionAccess = useCallback(() => {
    if (!id) return;
    subscriptionsApi.mySubscriptions()
      .then((data: any) => {
        const access = getActiveSubscriptionAccess(normalizeSubscriptionList(data));
        setActiveSub(access.byGymId.get(String(id)) || access.multiGymSub || null);
      })
      .catch(() => setActiveSub(null));
  }, [id]);

  const loadRatings = useCallback(() => {
    if (!id) return;
    api.get(`/ratings/gym/${id}`)
      .then((data: any) => {
        const list = normalizeRatingList(data);
        const summary = ratingSummaryFromResponse(data, list);
        setReviews(list);
        setRatingSummary({ ...summary, loaded: true });
        setGym((current: any) => current ? {
          ...current,
          rating: summary.rating,
          avgRating: summary.rating,
          averageRating: summary.rating,
          ratingCount: summary.count,
          ratingsCount: summary.count,
          reviewCount: summary.count,
          reviewsCount: summary.count,
        } : current);
      })
      .catch(() => {
        setReviews([]);
        setRatingSummary({ rating: null, count: 0, loaded: false });
      });
  }, [id]);

  useFocusEffect(useCallback(() => {
    loadSubscriptionAccess();
    loadRatings();
  }, [loadSubscriptionAccess, loadRatings]));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setGymPlans([]);
    setRatingSummary({ rating: null, count: 0, loaded: false });
    gymsApi.getById(id as string)
      .then((data: any) => {
        const g = data?.gym || data;
        setGym(g && (g.id || g._id) ? g : fallbackGym());
      })
      .catch(() => setGym(fallbackGym()))
      .finally(() => setLoading(false));

    setGymPlansLoading(true);
    api.get(`/gym-plans/by-gym/${id}`)
      .then((data: any) => {
        const plans = Array.isArray(data) ? data : data?.plans || [];
        setGymPlans(plans);
      })
      .catch(() => setGymPlans([]))
      .finally(() => setGymPlansLoading(false));

    // Load sessions and session types for today
    loadSlots(id as string, new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);
    api.get(`/sessions/types/${id}`)
      .then((data: any) => {
        const list = (Array.isArray(data) ? data : []).filter((t: any) => t.id !== 'all');
        setSessionTypes(list);
      })
      .catch(() => setSessionTypes([]));

    api.get(`/trainers?gymId=${id}`)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.trainers || data?.data || [];
        setTrainers(list);
      })
      .catch(() => setTrainers([]));

    subscriptionsApi.plans()
      .then((data: any) => setPassPricingConfig(data || null))
      .catch(() => setPassPricingConfig(null));
  }, [id, fallbackGym]);

  const tier = tierLabel(gym?.tier || gym?.tierName || fallbackTier);
  const name = gym?.name || 'Gym';
  const backendReviewCount = firstCountNumber(gym?.ratingCount, gym?.ratingsCount, gym?.reviewCount, gym?.reviewsCount) || 0;
  const backendRating = backendReviewCount > 0 ? firstRatingNumber(gym?.rating, gym?.avgRating, gym?.averageRating) : null;
  const displayRating = ratingSummary.loaded ? ratingSummary.rating : backendRating;
  const displayReviewCount = ratingSummary.loaded ? ratingSummary.count : backendReviewCount;
  const address = gym?.address || gym?.location?.address || '';
  const contactPhone = gym?.contactPhone || gym?.phone || '';
  const contactEmail = gym?.contactEmail || gym?.email || '';
  const website = gym?.website || '';
  const hours = formatClockRange(gym?.openingTime, gym?.closingTime, gym?.openingHours || gym?.timings || '');
  const breakHours = formatClockRange(gym?.breakStartTime, gym?.breakEndTime, gym?.breakHours || null);
  const description = gym?.description || '';
  const amenities = toTextArray(gym?.amenities || gym?.amenityNames || gym?.facilities);
  const amenityItems = Array.isArray(gym?.amenityDetails) && gym.amenityDetails.length
    ? gym.amenityDetails.map((item: any) => ({ name: String(item?.name || item?.label || '').trim(), iconUrl: item?.iconUrl || item?.icon })).filter((item: any) => item.name)
    : amenities.map((name) => ({ name, iconUrl: null }));
  const categories = toTextArray(gym?.categories || gym?.tags);
  const categoryItems = Array.isArray(gym?.categoryDetails) && gym.categoryDetails.length
    ? gym.categoryDetails.map((item: any) => ({ name: String(item?.name || item?.label || '').trim(), iconUrl: item?.iconUrl || item?.icon })).filter((item: any) => item.name)
    : categories.map((name) => ({ name, iconUrl: null }));
  const galleryImages = imageList(gym?.coverPhoto, gym?.coverImage, gym?.photos, gym?.images, gym?.media, gym?.imageUrl, gym?.image, gym?.photo, gym?.img);
  const profileVideos = videoUrlList(gym?.videos, gym?.profileVideos, gym?.videoUrls);
  const fallbackHeroImage = galleryImages[0] || firstImage(fallbackImg) || DEFAULT_GYM_IMAGE;
  const heroImages = galleryImages.length ? galleryImages : [fallbackHeroImage];
  const heroItems = [
    ...heroImages.map((url) => ({ type: 'image', url })),
    ...profileVideos.map((url) => ({ type: 'video', url })),
  ];
  const subscriptionId = activeSub?._id || activeSub?.id;
  const activePlanType = subscriptionPlanType(activeSub);
  const activeSubLabel = activeSub ? accessLabelForSubscription(activeSub, activePlanType === 'multi_gym') : '';
  const activeUntil = formatDateLabel(activeSub?.endDate || activeSub?.validUntil);
  const startingMonthlyPrice = minMonthlyPlanPrice(gymPlans, passPricingConfig?.same_gym?.commission);
  const dayPassBasePrice = positiveNumber(gym?.dayPassPrice) || positiveNumber(gym?.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice) || null;
  const dayPassPrice = applyPassCommission(dayPassBasePrice, passPricingConfig?.day_pass?.commission);

  useEffect(() => {
    setHeroIndex(0);
    heroListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [gym?.id]);

  useEffect(() => {
    if (heroItems.length <= 1) return undefined;
    const timer = setInterval(() => {
      setHeroIndex((current) => {
        const next = (current + 1) % heroItems.length;
        try {
          heroListRef.current?.scrollToIndex?.({ index: next, animated: true });
        } catch {}
        return next;
      });
    }, 4200);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const gymLat = coordinate(gym?.lat, gym?.latitude, gym?.location?.lat);
  const gymLng = coordinate(gym?.lng, gym?.longitude, gym?.location?.lng);
  const mapUri = gymLat && gymLng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(gymLng - 0.012).toFixed(6)}%2C${(gymLat - 0.012).toFixed(6)}%2C${(gymLng + 0.012).toFixed(6)}%2C${(gymLat + 0.012).toFixed(6)}&layer=mapnik&marker=${gymLat}%2C${gymLng}`
    : '';
  const gymShareUrl = `https://bookmyfit.in/app/gym/${encodeURIComponent(String(id || gym?.id || gym?._id || ''))}`;

  const getDirections = async () => {
    const destinationText = gymLat && gymLng ? `${gymLat},${gymLng}` : `${name} ${address}`.trim();
    const destination = encodeURIComponent(destinationText || name);
    const label = encodeURIComponent(name);
    const urls = Platform.OS === 'ios'
      ? [
          `http://maps.apple.com/?daddr=${destination}`,
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
        ]
      : [
          `geo:0,0?q=${destination}(${label})`,
          `google.navigation:q=${destination}`,
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
        ];

    try {
      for (const url of urls) {
        const canOpen = url.startsWith('http') || await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      }
      await Linking.openURL(`https://maps.google.com/?q=${destination}`);
    } catch {
      Linking.openURL(`https://maps.google.com/?q=${destination}`).catch(() => {});
    }
  };

  const handleShare = () => {
    const message = [
      `Check out ${name} on BookMyFit.`,
      address ? `Address: ${address}` : '',
      displayRating !== null ? `Rating: ${displayRating.toFixed(1)} (${reviewCountLabel(displayReviewCount)})` : '',
      gymShareUrl,
    ].filter(Boolean).join('\n');
    Share.share({ title: `${name} on BookMyFit`, message, url: gymShareUrl }).catch(() => {});
  };

  const loadSlots = (gymId: string, date: string) => {
    api.get(`/sessions/slots/${gymId}?date=${date}`)
      .then((data: any) => {
        const slots = Array.isArray(data) ? data : [];
        setSessionSlots(slots);
      })
      .catch(() => setSessionSlots([]));
  };

  const bookSlot = async (slotId: string) => {
    if (!activeSub) {
      router.push({ pathname: '/plans', params: { gymId: id, gymName: name } } as any);
      return;
    }
    if (activePlanType === 'same_gym') {
      router.push({ pathname: '/qr', params: { subscriptionId: subscriptionId || '', gymId: id, gymName: name } } as any);
      return;
    }
    setBookingLoading(slotId);
    try {
      const res: any = await api.post('/sessions/book', { slotId, subscriptionId: activeSub?.id || activeSub?._id });
      router.push({
        pathname: '/(tabs)/bookings',
        params: {
          bookingCreated: '1',
          bookingId: res?.bookingQr?.bookingId || res?.id || '',
          bookingRef: res?.bookingQr?.bookingRef || res?.bookingRef || '',
          gymName: res?.bookingQr?.gymName || name,
        },
      } as any);
    } catch (e: any) {
      const { Alert } = require('react-native');
      const msg = (e?.message || '');
      if (msg.includes('subscription')) {
        Alert.alert('No Active Pass', 'You need an active pass to book sessions.', [
          { text: 'View Plans', onPress: () => router.push({ pathname: '/plans', params: { gymId: id, gymName: name } } as any) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Booking Failed', msg || 'Could not book this slot. Please try again.');
      }
    } finally {
      setBookingLoading(null);
    }
  };

  if (!loading && !gym) {
    return (
      <AuroraBackground variant="gym">
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Gym not found</Text>
          <Text style={[s.body, { textAlign: 'center', color: colors.t2, marginTop: 8 }]}>
            We could not load this gym from the server. Please try again.
          </Text>
          <TouchableOpacity style={[s.cta, { marginTop: 18 }]} onPress={() => router.back()}>
            <Text style={s.ctaText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground variant="gym">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <FlatList
            ref={heroListRef}
            data={heroItems}
            horizontal
            pagingEnabled
            scrollEnabled={heroItems.length > 1}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.type}-${item.url}-${index}`}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setHeroIndex(Math.max(0, Math.min(nextIndex, heroItems.length - 1)));
            }}
            renderItem={({ item, index }) => item.type === 'video' ? (
              <TouchableOpacity
                activeOpacity={0.88}
                style={s.heroVideoSlide}
                onPress={() => router.push({
                  pathname: '/video-player',
                  params: { url: item.url, title: `${name} video ${index - heroImages.length + 1}`, instructor: name },
                } as any)}
              >
                <ImageBackground source={{ uri: fallbackHeroImage }} style={s.heroVideoBackdrop} blurRadius={6} />
                <View style={s.heroVideoContent}>
                  <View style={s.heroPlayButton}><IconPlay size={26} color="#060606" /></View>
                  <Text style={s.heroPlayLabel}>Play gym video</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <ImageBackground source={{ uri: item.url || DEFAULT_GYM_IMAGE }} style={s.heroSlide} />
            )}
          />
          <View pointerEvents="none" style={[s.heroAurora, { backgroundColor: TIER_AURORA[tier] || TIER_AURORA.Elite }]} />
          <View pointerEvents="none" style={s.heroDark} />
          <SafeAreaView style={s.heroInner}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <IconArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.back} onPress={handleShare}>
              <IconShare size={18} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          {heroItems.length > 1 && (
            <View style={s.heroDots}>
              {heroItems.map((item, index) => (
                <View key={`${item.type}-dot-${index}`} style={[s.heroDot, heroIndex === index && s.heroDotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={[s.content, { paddingBottom: 96 + bottomInset }]}>
          {loading ? (
            <>
              <SkeletonRect h={20} style={{ width: 80, marginBottom: 10 }} />
              <SkeletonRect h={36} style={{ marginBottom: 10 }} />
              <SkeletonRect h={16} style={{ width: '60%', marginBottom: 20 }} />
              <SkeletonRect h={100} style={{ marginBottom: 16 }} />
            </>
          ) : (
            <>
              {/* Name & meta */}
              <View style={[s.tierBadge, { backgroundColor: (TIER_COLORS[tier] || colors.accent) + '22', borderColor: (TIER_COLORS[tier] || colors.accent) + '55' }]}>
                <Text style={[s.tierText, { color: TIER_COLORS[tier] || colors.accent }]}>{tier.toUpperCase()}</Text>
              </View>
              <Text style={s.gymName}>{name}</Text>
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  {displayRating !== null ? (
                    <>
                      <IconStar size={12} color={colors.star} />
                      <Text style={[s.metaText, { color: colors.star }]}>{displayRating.toFixed(1)}</Text>
                      <Text style={[s.metaText, { color: colors.t2 }]}>({reviewCountLabel(displayReviewCount)})</Text>
                    </>
                  ) : (
                    <Text style={[s.metaText, { color: colors.t2 }]}>No reviews yet</Text>
                  )}
                </View>
                <View style={s.metaItem}>
                  <IconPin size={12} color={colors.t} />
                  <Text style={s.metaText}>{address}</Text>
                </View>
              </View>

              {activeSub ? (
                <View style={s.activePassBanner}>
                  <View style={s.activePassIcon}>
                    <IconShield size={15} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activePassTitle}>{activeSubLabel}</Text>
                    <Text style={s.activePassText}>
                      {activePlanType === 'multi_gym'
                        ? 'Your multi-gym pass works at this gym.'
                        : `Your pass is active for ${name}${activeUntil ? ` until ${activeUntil}` : ''}.`}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Quick stats */}
              <View style={s.statsRow}>
                  {[
                    { icon: IconClock, label: hours, sub: 'Opening Hours' },
                    ...(breakHours ? [{ icon: IconClock, label: breakHours, sub: 'Break Time' }] : []),
                  ].map((st) => (
                  <View key={st.sub} style={s.statCard}>
                    <st.icon size={16} color={colors.accent} />
                    <View>
                      <Text style={s.statLabel} numberOfLines={2}>{st.label || '--'}</Text>
                      <Text style={s.statSub}>{st.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tabs */}
              <View style={s.tabRow}>
                {(['About', 'Sessions', 'Trainers', 'Reviews'] as const).map((tab) => (
                  <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                    <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sessions Tab */}
              {activeTab === 'Sessions' && (
                <>
                  <Text style={s.sectionTitle}>{activePlanType === 'same_gym' ? 'Membership Check-In' : 'Book a Session'}</Text>
                  {activePlanType === 'same_gym' ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { color: '#fff', fontFamily: fonts.sansBold, marginBottom: 6 }]}>
                        No slot booking needed for Same Gym Pass
                      </Text>
                      <Text style={[s.body, { color: colors.t2 }]}>
                        Visit {name} anytime during gym hours and show your membership QR at the desk. Each scan tracks your visit.
                      </Text>
                      <TouchableOpacity
                        style={[s.cta, { marginTop: 14 }]}
                        onPress={() => router.push({ pathname: '/qr', params: { subscriptionId: subscriptionId || '', gymId: id, gymName: name } } as any)}
                        activeOpacity={0.9}
                      >
                        <Text style={s.ctaText}>Show Membership QR</Text>
                        <IconArrowRight size={16} color="#000" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                  {/* Date selector — today + next 6 days */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                    {Array.from({ length: 7 }).map((_, d) => {
                      const dt = new Date(Date.now() + 5.5 * 3600 * 1000 + d * 86400000);
                      const ds = dt.toISOString().split('T')[0];
                      const isToday = d === 0;
                      const isSelected = ds === slotDate;
                      return (
                        <TouchableOpacity key={ds} onPress={() => { setSlotDate(ds); loadSlots(id as string, ds); }}
                          style={[s.datePill, isSelected && s.datePillActive]}>
                          <Text style={[s.datePillDay, isSelected && { color: colors.accent }]}>
                            {isToday ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </Text>
                          <Text style={[s.datePillNum, isSelected && { color: colors.accent }]}>
                            {dt.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Session type filter chips */}
                  {sessionTypes.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                      <TouchableOpacity
                        style={[s.typeChip, activeTypeFilter === 'all' && s.typeChipActive]}
                        onPress={() => setActiveTypeFilter('all')}
                      >
                        <Text style={[s.typeChipText, activeTypeFilter === 'all' && { color: colors.accent }]}>All</Text>
                      </TouchableOpacity>
                      {sessionTypes.map((st: any) => {
                        const stColor = st.color || colors.accent;
                        const isActive = activeTypeFilter === st.id;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            style={[s.typeChip, isActive && { borderColor: stColor + '88', backgroundColor: stColor + '18' }]}
                            onPress={() => setActiveTypeFilter(st.id)}
                          >
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: stColor, marginRight: 4 }} />
                            <Text style={[s.typeChipText, isActive && { color: stColor }]}>{st.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* 1 session/day notice */}
                  <View style={s.noticeRow}>
                    <Text style={s.noticeText}>Max 1 session per day per gym — Gym Workout or Special Class</Text>
                  </View>

                  {(() => {
                    const filteredSlots = activeTypeFilter === 'all'
                      ? sessionSlots
                      : sessionSlots.filter((slot: any) => {
                          const st = slot.sessionType;
                          if (!st) return false;
                          const filterId = activeTypeFilter.toLowerCase();
                          return (
                            st.id === activeTypeFilter ||
                            st.id?.toLowerCase() === filterId ||
                            st.name?.toLowerCase().includes(filterId) ||
                            filterId.includes(st.name?.toLowerCase() ?? '')
                          );
                        });

                    if (filteredSlots.length === 0) {
                      return (
                        <View style={s.glassCard}>
                          <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>
                            No sessions scheduled for this date. Try another date.
                          </Text>
                        </View>
                      );
                    }

                    return filteredSlots.map((slot: any) => {
                      const isBooked = slot.userBooked;
                      const isFull = slot.isFull;
                      const hasOtherBooking = slot.userHasBookingToday && !isBooked;
                      const isLoading = bookingLoading === slot.id;
                      const stColor = slot.sessionType?.color || colors.accent;
                      const typeName = slot.sessionType?.name || 'Gym Workout';
                      const instructor = slot.sessionType?.instructor;
                      const durationMin = slot.sessionType?.durationMinutes;
                      const spotsLeft = (slot.maxCapacity || 0) - (slot.bookedCount || 0);
                      const capacityPct = slot.maxCapacity > 0 ? Math.min((slot.bookedCount || 0) / slot.maxCapacity, 1) : 0;

                      return (
                        <View key={slot.id} style={[s.slotCard, isBooked && { borderColor: stColor + '55', backgroundColor: stColor + '08' }]}>
                          {/* Header row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: stColor, marginRight: 7 }} />
                            <Text style={[s.slotTypeName, { color: stColor }]}>{typeName.toUpperCase()}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={s.slotTime}>{formatClockRange(slot.startTime, slot.endTime)}</Text>
                          </View>
                          {/* Instructor + duration */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            {instructor ? (
                              <Text style={s.slotInstructor}>Instructor: {instructor}</Text>
                            ) : null}
                            {durationMin ? (
                              <Text style={s.slotDuration}>{durationMin} min</Text>
                            ) : null}
                          </View>
                          {/* Capacity bar + book button */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <View style={s.capacityBar}>
                                <View style={[s.capacityFill, { width: `${capacityPct * 100}%` as any, backgroundColor: isFull ? '#FF4444' : stColor }]} />
                              </View>
                              <Text style={s.slotCapacity}>
                                {isFull ? 'Full' : `${spotsLeft} spots left`} ({slot.bookedCount}/{slot.maxCapacity})
                              </Text>
                            </View>
                            {isBooked ? (
                              <View style={[s.slotBtn, { backgroundColor: stColor + '20', borderColor: stColor + '55' }]}>
                                <IconCheck size={13} color={stColor} />
                                <Text style={[s.slotBtnText, { color: stColor }]}>Booked</Text>
                              </View>
                            ) : isFull ? (
                              <View style={[s.slotBtn, { opacity: 0.4 }]}>
                                <Text style={s.slotBtnText}>Full</Text>
                              </View>
                            ) : hasOtherBooking ? (
                              <View style={[s.slotBtn, { opacity: 0.4 }]}>
                                <Text style={s.slotBtnText}>1/day limit</Text>
                              </View>
                            ) : (
                              <TouchableOpacity style={[s.slotBtn, { backgroundColor: stColor, borderColor: stColor }]} onPress={() => bookSlot(slot.id)} disabled={!!isLoading}>
                                <Text style={[s.slotBtnText, { color: '#060606' }]}>{isLoading ? '...' : 'Book Now'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    });
                  })()}

                  {!activeSub && (
                    <TouchableOpacity style={s.cta} onPress={() => router.push({ pathname: '/plans', params: { gymId: id, gymName: name } } as any)}>
                      <Text style={s.ctaText}>Subscribe to Book Sessions</Text>
                      <IconArrowRight size={16} color="#000" />
                    </TouchableOpacity>
                  )}
                    </>
                  )}
                </>
              )}

              {/* About Tab */}
              {activeTab === 'About' && (
                <>
                  <Text style={s.sectionTitle}>Location</Text>
                  <View style={s.mapCard}>
                    {mapUri ? (
                      <WebView
                        source={{ uri: mapUri }}
                        scrollEnabled={false}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1, backgroundColor: colors.surface }}
                      />
                    ) : (
                      <View style={s.mapPlaceholder}>
                        <IconPin size={22} color={colors.accent} />
                        <Text style={s.mapAddressText}>{address || 'Location not added yet'}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={s.mapDirOverlay} onPress={getDirections} activeOpacity={0.88}>
                      <IconPin size={14} color="#060606" />
                      <Text style={s.mapDirOverlayText}>Get Directions</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.sectionTitle}>Gym Details</Text>
                  <View style={s.glassCard}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Address</Text>
                      <Text style={s.detailValue}>{address || 'Not added yet'}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Hours</Text>
                      <Text style={s.detailValue}>{hours || 'Not added yet'}</Text>
                    </View>
                    {breakHours ? (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Break Time</Text>
                        <Text style={s.detailValue}>{breakHours}</Text>
                      </View>
                    ) : (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Break Time</Text>
                        <Text style={s.detailValue}>Not added yet</Text>
                      </View>
                    )}
                    <View style={[s.detailRow, { marginBottom: 0 }]}>
                      <Text style={s.detailLabel}>Description</Text>
                      <Text style={s.detailValue}>{description || 'Not added yet'}</Text>
                    </View>
                  </View>

                  {amenityItems.length > 0 && (
                    <>
                      <Text style={s.sectionTitle}>Amenities</Text>
                      <View style={s.amenityWrap}>
                        {amenityItems.map((item: any) => (
                          <View key={item.name} style={s.amenityPill}>
                            <View style={s.amenityIconBox}>
                              <AmenityIcon label={item.name} iconUrl={item.iconUrl} />
                            </View>
                            <Text style={s.amenityText} numberOfLines={2}>{item.name}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Trainers Tab */}
              {activeTab === 'Trainers' && (
                <>
                  <Text style={s.sectionTitle}>Personal Trainers</Text>
                  {trainers.length === 0 ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>No trainers listed for this gym yet.</Text>
                    </View>
                  ) : (
                    trainers.map((t: any) => (
                      <View key={t._id || t.id || t.name} style={s.trainerCard}>
                        <View style={s.trainerAvatar}>
                          <Text style={s.trainerInitial}>{(t.name || 'T')[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.trainerName} numberOfLines={1}>{t.name}</Text>
                          <Text style={s.trainerSessions}>{t.specialization || t.specialty || 'Personal training'}</Text>
                        </View>
                        <Text style={s.trainerPrice} numberOfLines={1}>
                          Rs {Number(t.monthlyPriceInr || t.monthlyPrice || t.pricePerSession || 0).toLocaleString('en-IN')}/mo
                        </Text>
                      </View>
                    ))
                  )}
                  <View style={s.glassCard}>
                    <Text style={[s.body, { textAlign: 'center' }]}>PT add-on available with Pro & Max plans</Text>
                  </View>
                </>
              )}

              {/* Reviews Tab */}
              {activeTab === 'Reviews' && (
                <>
                  <Text style={s.sectionTitle}>Reviews</Text>
                  <TouchableOpacity
                    style={s.reviewSubmitBtn}
                    activeOpacity={0.88}
                    onPress={() => router.push({ pathname: '/review', params: { gymId: id, gymName: name } } as any)}
                  >
                    <IconStar size={14} color="#060606" />
                    <Text style={s.reviewSubmitText}>Rate This Gym</Text>
                  </TouchableOpacity>
                  {reviews.length === 0 ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>No reviews yet. Be the first to review!</Text>
                    </View>
                  ) : (
                    reviews.map((r: any, i: number) => {
                      const reviewName = r.user?.name || r.name || r.userName || 'Member';
                      const reviewRating = firstRatingNumber(r.stars, r.rating) || 0;
                      const reviewText = r.comment || r.text || r.review || '';
                      const reviewDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : (r.date || '');
                      return (
                        <View key={r._id || r.id || i} style={s.reviewCard}>
                          <View style={s.reviewHeader}>
                            <View style={s.reviewAvatar}><Text style={s.reviewInitial}>{reviewName[0]}</Text></View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.reviewName}>{reviewName}</Text>
                              <Text style={s.reviewDate}>{reviewDate}</Text>
                            </View>
                            {reviewRating > 0 && (
                              <View style={s.reviewStars}>
                                {Array.from({ length: Math.min(Math.round(reviewRating), 5) }).map((_, j) => <IconStar key={j} size={10} />)}
                              </View>
                            )}
                          </View>
                          {!!reviewText && <Text style={s.reviewText}>{reviewText}</Text>}
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {!loading && (
        <View style={[s.footer, { paddingBottom: bottomInset + 14 }]}>
          {activeSub ? (
            <>
              <TouchableOpacity
                style={s.qrBtn}
                onPress={() => router.push({
                  pathname: '/subscription-detail',
                  params: {
                    subscriptionId: subscriptionId || '',
                    fallbackName: activePlanType === 'multi_gym' ? 'All Partner Gyms' : name,
                    fallbackPlan: activeSub?.planLabel || activeSub?.plan?.name || activeSubLabel || 'Pass',
                    fallbackStatus: activeSub?.status || 'active',
                    fallbackStart: activeSub?.startDate || '',
                    fallbackEnd: activeSub?.endDate || '',
                    fallbackPlanType: activePlanType || 'same_gym',
                    fallbackGymId: activePlanType === 'multi_gym' ? '' : String(id || ''),
                  },
                } as any)}
                activeOpacity={0.9}
              >
                <IconShield size={16} color="#fff" />
                <Text style={s.qrBtnText}>My Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cta}
                onPress={() => activePlanType === 'same_gym'
                  ? router.push({ pathname: '/qr', params: { subscriptionId: subscriptionId || '', gymId: id, gymName: name } } as any)
                  : router.push({ pathname: '/slots', params: { gymId: id } } as any)}
                activeOpacity={0.9}
              >
                <Text style={s.ctaText}>{activePlanType === 'same_gym' ? 'Show QR' : 'Book a Slot'}</Text>
                <IconArrowRight size={16} color="#000" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View>
                <Text style={s.footLabel}>{gymPlansLoading ? 'Pricing' : startingMonthlyPrice ? 'Starting from' : 'Membership'}</Text>
                {gymPlansLoading ? (
                  <Text style={s.footPrice}>Loading...</Text>
                ) : startingMonthlyPrice ? (
                  <Text style={s.footPrice}>
                    ₹{Math.round(startingMonthlyPrice).toLocaleString('en-IN')}
                    <Text style={s.footPer}>/mo</Text>
                  </Text>
                ) : (
                  <Text style={s.footPrice}>Plans</Text>
                )}
                {dayPassPrice ? (
                  <Text style={[s.footPer, { color: '#ff6b35', fontSize: 10 }]}>
                    Day pass from ₹{Math.round(dayPassPrice).toLocaleString('en-IN')}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push({ pathname: '/plans', params: { gymId: id, gymName: name } } as any)}
                activeOpacity={0.9}
              >
                <Text style={s.ctaText}>View Plans</Text>
                <IconArrowRight size={16} color="#000" />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  hero: { width, height: 260, position: 'relative', overflow: 'hidden', backgroundColor: colors.surface },
  heroSlide: { width, height: 260, backgroundColor: colors.surface },
  heroVideoSlide: { width, height: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', overflow: 'hidden' },
  heroVideoBackdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.36 },
  heroVideoContent: { alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 1 },
  heroPlayButton: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  heroPlayLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  heroAurora: { ...StyleSheet.absoluteFillObject, opacity: 0.85 },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroInner: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', zIndex: 4 },
  heroDots: { position: 'absolute', left: 0, right: 0, bottom: 14, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 4 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.38)' },
  heroDotActive: { width: 18, backgroundColor: colors.accent },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingTop: 16 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  tierText: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.5 },
  gymName: { fontFamily: fonts.serif, fontSize: 28, color: '#fff', letterSpacing: -0.8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t },
  activePassBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.lg, padding: 12, marginTop: 16,
  },
  activePassIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,212,106,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  activePassTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  activePassText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, marginTop: 2, lineHeight: 17 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: {
    flexGrow: 1, flexBasis: '47%', minWidth: 145, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 12,
  },
  statLabel: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff', lineHeight: 16 },
  statSub: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 4 },
  tabBtn: {
    flex: 1, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  tabBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  tabText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.t2 },
  tabTextActive: { color: colors.accent },
  sectionTitle: {
    fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 10,
  },
  glassCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.t3, textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 19, marginTop: 3 },
  mapCard: { height: 200, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.borderGlass },
  mapPlaceholder: { flex: 1, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  mapAddressText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, textAlign: 'center' },
  mapDirBtn: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  mapDirBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  mapDirOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  mapDirOverlayText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#060606' },
  mediaImageCard: {
    width: width - 68,
    height: 168,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    justifyContent: 'flex-start',
  },
  mediaCountBadge: {
    alignSelf: 'flex-end',
    margin: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  mediaCountText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#fff' },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.lg,
    padding: 12,
  },
  videoPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  videoPlayText: { color: colors.accent, fontFamily: fonts.sansBold, fontSize: 9 },
  videoTitle: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  videoUrl: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoValue: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, flex: 1, lineHeight: 20 },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityPill: {
    width: (width - 54) / 2,
    minHeight: 62,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: radius.lg,
  },
  amenityIconBox: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  amenityText: { flex: 1, minWidth: 0, fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t, lineHeight: 15 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.accentBorder,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  categoryText: { fontFamily: fonts.sans, fontSize: 11, color: colors.accent },
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  trainerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  trainerName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  trainerSessions: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  trainerPrice: { maxWidth: 96, fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  reviewSubmitBtn: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewSubmitText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },
  reviewCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  reviewInitial: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  reviewName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  reviewDate: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, lineHeight: 18 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 16,
    backgroundColor: 'rgba(6,6,6,0.95)', borderTopWidth: 1, borderTopColor: colors.borderGlass,
    gap: 12,
  },
  footLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  footPrice: { fontFamily: fonts.sansBold, fontSize: 22, color: '#fff' },
  footPer: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, height: 50, borderRadius: 25, backgroundColor: colors.accent,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, height: 50, borderRadius: 25,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  qrBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  // Sessions tab styles
  datePill: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass, minWidth: 46,
  },
  datePillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  datePillDay: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  datePillNum: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginTop: 2 },
  noticeRow: {
    backgroundColor: 'rgba(0,212,106,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.12)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  noticeText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  // Session type filter chips
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  typeChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  typeChipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t2 },
  // Improved slot card
  slotCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  slotTypeName: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2 },
  slotInstructor: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },
  slotDuration: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  capacityBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  capacityFill: { height: '100%', borderRadius: 2 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
  },
  slotRowBooked: { borderColor: 'rgba(0,212,106,0.3)', backgroundColor: 'rgba(0,212,106,0.05)' },
  slotTime: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  slotCapacity: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  slotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, height: 34, borderRadius: 20,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  slotBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
});
