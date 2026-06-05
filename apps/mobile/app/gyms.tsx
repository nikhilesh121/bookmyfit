import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, ImageBackground, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconFilter, IconCheck, IconSearch } from '../components/Icons';
import { gymsApi, subscriptionsApi } from '../lib/api';
import { getLocationPermissionState, getNearbyCoords, nearbyBestSort, nearbyQueryParams, openLocationSettings, requestNearbyCoords } from '../lib/location';
import { accessLabelForSubscription, getActiveSubscriptionAccess, normalizeSubscriptionList } from '../lib/subscriptionAccess';
import { DEFAULT_GYM_IMAGE, firstImage } from '../lib/imageFallbacks';
import { applyPassCommission } from '../lib/passPricing';

const { width: W } = Dimensions.get('window');

// ── Categories ────────────────────────────────────────────────────────────────
const FALLBACK_CATS = [
  { id: 'all',      label: 'All' },
  { id: 'strength', label: 'Strength' },
  { id: 'cardio',   label: 'Cardio' },
  { id: 'yoga',     label: 'Yoga' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'hiit',     label: 'HIIT' },
  { id: 'zumba',    label: 'Zumba' },
  { id: 'pilates',  label: 'Pilates' },
];

function categoryKey(value: any) {
  const raw = typeof value === 'string'
    ? value
    : (value?.name || value?.label || value?.title || value?.id || value?.value || '');
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
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

function gymRatingInfo(gym: any) {
  const count = firstCountNumber(
    gym?.ratingCount,
    gym?.ratingsCount,
    gym?.reviewCount,
    gym?.reviewsCount,
    gym?.rating_count,
    gym?.ratings_count,
    gym?.review_count,
    gym?.reviews_count,
  ) || 0;
  const rating = count > 0 ? firstRatingNumber(gym?.rating, gym?.avgRating, gym?.averageRating, gym?.avg_rating, gym?.average_rating) : null;
  return { rating, count };
}

const SORTS = [
  { id: 'distance',  label: 'Best Nearby' },
  { id: 'rating',    label: 'Top Rated' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc',label: 'Price: High to Low' },
];

function Sk({ h, br = 12, style }: { h: number; br?: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.06)' }, style]} />;
}

export default function GymListingPage() {
  const { category: paramCat } = useLocalSearchParams<{ category?: string }>();

  const [gyms, setGyms] = useState<any[]>([]);
  const [categories, setCategories] = useState(FALLBACK_CATS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState(paramCat ? categoryKey(paramCat) : 'all');
  const [activeSort, setActiveSort] = useState('distance');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [subscribedGymIds, setSubscribedGymIds] = useState<Set<string>>(new Set());
  const [activeGymSubs, setActiveGymSubs] = useState<Map<string, any>>(new Map());
  const [multiGymSub, setMultiGymSub] = useState<any>(null);
  const [hasMultiGymSub, setHasMultiGymSub] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [passPricingConfig, setPassPricingConfig] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'checking' | 'ready' | 'denied' | 'unavailable'>('checking');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const pageRef = useRef(1);

  const requestUserLocation = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const existing = await getLocationPermissionState();
      if (!existing.granted && existing.needsSettings) {
        setLocationState('denied');
        return null;
      }
      const next = await getNearbyCoords({ forceRefresh: true, timeoutMs: 3500 });
      const latest = await getLocationPermissionState();
      if (!next) {
        setLocationState(latest.status === 'denied' || latest.needsSettings ? 'denied' : 'unavailable');
        return null;
      }
      setUserLocation(next);
      setLocationState('ready');
      return next;
    } catch {
      setLocationState('unavailable');
      return null;
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const handleLocationPress = useCallback(async () => {
    const permission = await getLocationPermissionState();
    if (permission.needsSettings) {
      await openLocationSettings();
      setLocationState('checking');
      return;
    }
    setDetectingLocation(true);
    try {
      const next = await requestNearbyCoords();
      if (next) {
        setUserLocation(next);
        setLocationState('ready');
      } else {
        const latest = await getLocationPermissionState();
        setLocationState(latest.needsSettings || latest.status === 'denied' ? 'denied' : 'unavailable');
      }
    } finally {
      setDetectingLocation(false);
    }
  }, [requestUserLocation]);

  useEffect(() => { requestUserLocation(); }, [requestUserLocation]);

  useEffect(() => {
    let alive = true;
    gymsApi.categories()
      .then((data: any) => {
        if (!alive) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        const fromApi = rows
          .map((item: any) => ({ id: categoryKey(item?.name), label: String(item?.name || '').trim() }))
          .filter((item: any) => item.id && item.label);
        const seen = new Set<string>();
        const merged = [FALLBACK_CATS[0], ...fromApi, ...FALLBACK_CATS.slice(1)]
          .filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        setCategories(merged);
      })
      .catch(() => setCategories(FALLBACK_CATS));
    return () => { alive = false; };
  }, []);

  const filterByCat = (list: any[], cat: string) => {
    if (cat === 'all') return list;
    return list.filter((g: any) => {
      const cats = [...(g.categories || []), ...(g.amenities || [])];
      return cats.some((c: any) => categoryKey(c) === categoryKey(cat));
    });
  };

  const load = useCallback(async (pg: number, cat: string) => {
    // Show full skeleton for first page loads; pagination/category switches keep the page responsive.
    if (pg === 1) setLoading(true);
    else if (pg > 1) setLoadingMore(true);
    else setLoadingMore(true); // category switch: spinner, keep existing list
    try {
      setLoadError('');
      const params: any = { page: pg, limit: 100 }; // show every active gym returned by the database, then filter locally
      if (cat !== 'all') params.category = cat;
      if (userLocation && activeSort === 'distance') Object.assign(params, nearbyQueryParams(userLocation));
      else if (userLocation) Object.assign(params, { lat: userLocation.lat, lng: userLocation.lng });
      const res: any = await gymsApi.list(params);
      const raw = Array.isArray(res) ? res : res?.gyms || res?.data || [];
      const list = filterByCat(raw, cat);
      if (pg === 1) setGyms(list); else setGyms((prev) => [...prev, ...list]);
      setHasMore(raw.length >= 100);
      pageRef.current = pg;
    } catch (e: any) {
      if (pg === 1) setGyms([]);
      setLoadError(e?.message || 'Unable to load gyms right now.');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userLocation, activeSort]);

  useEffect(() => {
    setPage(1);
    load(1, activeCategory);
  }, [activeCategory, userLocation, activeSort, load]);

  useEffect(() => {
    const nextCategory = paramCat ? categoryKey(paramCat) : 'all';
    setActiveCategory((current) => current === nextCategory ? current : nextCategory);
  }, [paramCat]);

  useEffect(() => {
    subscriptionsApi.plans()
      .then((data: any) => setPassPricingConfig(data || null))
      .catch(() => setPassPricingConfig(null));
  }, []);

  const loadSubscriptionAccess = useCallback(() => {
    subscriptionsApi.mySubscriptions()
      .then((data: any) => {
        const state = getActiveSubscriptionAccess(normalizeSubscriptionList(data));
        setSubscribedGymIds(state.gymIds);
        setActiveGymSubs(state.byGymId);
        setMultiGymSub(state.multiGymSub);
        setHasMultiGymSub(state.hasMultiGym);
      })
      .catch(() => {
        setSubscribedGymIds(new Set());
        setActiveGymSubs(new Map());
        setMultiGymSub(null);
        setHasMultiGymSub(false);
      });
  }, []);

  useFocusEffect(useCallback(() => {
    loadSubscriptionAccess();
  }, [loadSubscriptionAccess]));

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const next = pageRef.current + 1;
      setPage(next);
      load(next, activeCategory);
    }
  };

  // Sort locally (server doesn't always support all sort params)
  const sorted = [...gyms].sort((a, b) => {
    if (activeSort === 'rating')     return (gymRatingInfo(b).rating || 0) - (gymRatingInfo(a).rating || 0);
    if (activeSort === 'distance') {
      return nearbyBestSort(a, b);
    }
    if (activeSort === 'price_asc') {
      const ap = applyPassCommission(positiveNumber(a.dayPassPrice || a.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice), passPricingConfig?.day_pass?.commission);
      const bp = applyPassCommission(positiveNumber(b.dayPassPrice || b.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice), passPricingConfig?.day_pass?.commission);
      return Number(ap || 999) - Number(bp || 999);
    }
    if (activeSort === 'price_desc') {
      const ap = applyPassCommission(positiveNumber(a.dayPassPrice || a.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice), passPricingConfig?.day_pass?.commission);
      const bp = applyPassCommission(positiveNumber(b.dayPassPrice || b.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice), passPricingConfig?.day_pass?.commission);
      return Number(bp || 0) - Number(ap || 0);
    }
    return 0;
  });

  // Text search filter
  const filtered = searchText.trim()
    ? sorted.filter((g: any) => {
        const q = searchText.toLowerCase();
        return (
          (g.name || '').toLowerCase().includes(q) ||
          (g.city || '').toLowerCase().includes(q) ||
          (g.area || g.location?.area || '').toLowerCase().includes(q) ||
          (g.amenities || []).some((a: string) => a.toLowerCase().includes(q))
        );
      })
    : sorted;

  const activeSortLabel = SORTS.find((s) => s.id === activeSort)?.label || 'Sort';
  const gpsText = userLocation
    ? 'Closest gyms are shown first'
    : detectingLocation || locationState === 'checking'
      ? 'Finding your GPS location...'
      : locationState === 'denied'
        ? 'Tap to allow location or open settings'
        : 'GPS not found - tap to retry nearby sorting';

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconArrowLeft size={18} color={colors.t} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Gyms Near You</Text>
          <Text style={s.headerSub}>Best nearby gyms</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <IconSearch size={14} color={colors.t3} />
          <TextInput
            style={s.searchInput}
            placeholder="Search gyms, areas..."
            placeholderTextColor={colors.t3}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSortSheet(true)}>
          <IconFilter size={13} color={colors.t2} />
          <Text style={s.sortBtnText} numberOfLines={1}>{activeSortLabel}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.gpsBanner, userLocation && s.gpsBannerActive]}
        onPress={handleLocationPress}
        disabled={detectingLocation}
        activeOpacity={0.82}
      >
        {detectingLocation ? <ActivityIndicator size="small" color={colors.accent} /> : <IconPin size={13} color={userLocation ? colors.accent : colors.t2} />}
        <Text style={[s.gpsText, userLocation && { color: colors.accent }]} numberOfLines={1}>{gpsText}</Text>
      </TouchableOpacity>

      {/* ── Category chips ── */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroller}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.chipList}
        renderItem={({ item: cat }) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => setActiveCategory(cat.id)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <View style={[s.chipDot, !active && s.chipDotInactive]} />
              <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>{cat.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Gym list ── */}
      {loading ? (
        <View style={s.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <Sk h={90} br={14} style={{ width: 90 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Sk h={16} br={8} style={{ width: '70%' }} />
                <Sk h={12} br={6} style={{ width: '50%' }} />
                <Sk h={12} br={6} style={{ width: '40%' }} />
                <Sk h={30} br={20} style={{ width: 100 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingMore && (
            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} size="small" />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(g) => String(g.id || g._id)}
            contentContainerStyle={s.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>{loadError || 'No gyms found in this category.'}</Text>
              </View>
            }
            renderItem={({ item: g }) => {
              const gid = String(g.id || g._id || '');
              return (
                <GymCard
                  gym={g}
                  isSubscribed={!!gid && subscribedGymIds.has(gid)}
                  activeSubscription={gid ? activeGymSubs.get(gid) : null}
                  multiGymSub={multiGymSub}
                  hasMultiGymSub={hasMultiGymSub}
                  passPricingConfig={passPricingConfig}
                />
              );
            }}
          />
        </View>
      )}

      {/* ── Sort bottom sheet ── */}
      {showSortSheet && (
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSortSheet(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Sort By</Text>
            {SORTS.map((sort) => (
              <TouchableOpacity
                key={sort.id}
                style={s.sheetOption}
                onPress={() => {
                  setActiveSort(sort.id);
                  setShowSortSheet(false);
                  if (sort.id === 'distance' && !userLocation) requestUserLocation();
                }}
              >
                <Text style={[s.sheetOptionText, activeSort === sort.id && { color: colors.accent }]}>{sort.label}</Text>
                {activeSort === sort.id && <IconCheck size={15} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function GymCard({
  gym,
  isSubscribed,
  hasMultiGymSub,
  activeSubscription,
  multiGymSub,
  passPricingConfig,
}: {
  gym: any;
  isSubscribed?: boolean;
  hasMultiGymSub?: boolean;
  activeSubscription?: any;
  multiGymSub?: any;
  passPricingConfig?: any;
}) {
  const name     = gym.name || gym.gymName || 'Gym';
  const ratingInfo = gymRatingInfo(gym);
  const distance = gym.distance || (gym.distanceKm ? `${gym.distanceKm} km` : '');
  const city     = gym.city || gym.location?.city || '';
  const img      = firstImage(gym.coverPhoto, gym.coverImage, gym.photos, gym.images, gym.media, gym.imageUrl, gym.image, gym.photo, gym.img) || DEFAULT_GYM_IMAGE;
  const dayPassBasePrice = positiveNumber(gym.dayPassPrice || gym.day_pass_price) || positiveNumber(passPricingConfig?.day_pass?.basePrice);
  const dayPassPrice = applyPassCommission(dayPassBasePrice, passPricingConfig?.day_pass?.commission);
  const discount = gym.discount || null;
  const tags: string[] = (gym.amenities || gym.tags || [])
    .map((item: any) => typeof item === 'string' ? item : (item?.name || item?.label || ''))
    .filter(Boolean)
    .slice(0, 3);
  const gid = gym.id || gym._id;
  const hasAccess = !!isSubscribed || !!hasMultiGymSub;
  const accessLabel = accessLabelForSubscription(activeSubscription || multiGymSub, !!hasMultiGymSub);

  return (
    <TouchableOpacity
      style={s.gymCard}
      onPress={() => router.push({
        pathname: '/gym/[id]',
        params: {
          id: gid,
          fallbackName: name,
          fallbackRating: ratingInfo.rating !== null ? String(ratingInfo.rating) : '',
          fallbackReviewCount: ratingInfo.count > 0 ? String(ratingInfo.count) : '',
          fallbackAddress: gym.address || gym.location?.address || city,
          fallbackTier: gym.tier || gym.tierName || 'Elite',
          fallbackImg: img,
        },
      } as any)}
      activeOpacity={0.88}
    >
      <ImageBackground source={{ uri: img }} style={s.gymThumb} imageStyle={{ borderRadius: radius.md }}>
        {discount && (
          <View style={s.discountBadge}><Text style={s.discountText}>{discount}</Text></View>
        )}
        {hasAccess && (
          <View style={s.subscribedThumbBadge}><Text style={s.subscribedThumbText}>ACTIVE</Text></View>
        )}
      </ImageBackground>

      <View style={s.gymInfo}>
        <View>
          <View style={s.nameRow}>
            <Text style={s.gymName} numberOfLines={1}>{name}</Text>
            {hasAccess && (
              <View style={s.subscribedBadge}>
                <Text style={s.subscribedText} numberOfLines={1}>{accessLabel}</Text>
              </View>
            )}
          </View>
          <View style={s.metaRow}>
            {ratingInfo.rating !== null ? (
              <>
                <IconStar size={11} color="#FBBF24" />
                <Text style={s.ratingText}>{ratingInfo.rating.toFixed(1)}</Text>
                <Text style={s.metaText}>({reviewCountLabel(ratingInfo.count)})</Text>
              </>
            ) : (
              <Text style={s.metaText}>No reviews yet</Text>
            )}
            {distance ? <><Text style={s.divider}>·</Text><IconPin size={10} color={colors.t2} /><Text style={s.metaText}>{distance}</Text></> : null}
            {city      ? <><Text style={s.divider}>·</Text><Text style={s.metaText}>{city}</Text></> : null}
          </View>
          {tags.length > 0 && (
            <View style={s.tagsRow}>
              {tags.map((t) => <View key={t} style={s.tag}><Text style={s.tagText} numberOfLines={1}>{t}</Text></View>)}
            </View>
          )}
        </View>

        <View style={s.cardFooter}>
          <View>
            <Text style={s.fromLabel}>{hasAccess ? 'Membership' : (dayPassPrice ? 'Day pass from' : 'Membership')}</Text>
            <Text style={s.fromPrice} numberOfLines={1}>
              {hasAccess
                ? 'Active'
                : dayPassPrice
                  ? `Rs ${Math.round(dayPassPrice).toLocaleString('en-IN')}/day`
                  : 'Plans'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.viewBtn, hasAccess && s.bookBtn]}
            onPress={(event: any) => {
              event?.stopPropagation?.();
              if (hasAccess) router.push({ pathname: '/slots', params: { gymId: gid } } as any);
              else router.push({ pathname: '/plans', params: { gymId: gid, gymName: name } } as any);
            }}
          >
            <Text style={[s.viewBtnText, hasAccess && s.bookBtnText]} numberOfLines={1}>{hasAccess ? 'Book' : 'Plans'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function positiveNumber(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', letterSpacing: -0.3 },
  headerSub:   { fontFamily: fonts.sans,  fontSize: 11, color: colors.t2, marginTop: 1 },
  sortBtn:  {
    height: 44, minWidth: 116, maxWidth: 126, flexShrink: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, paddingHorizontal: 12,
  },
  sortBtnText: { flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  searchBox: {
    height: 44, flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: '#fff' },
  gpsBanner: {
    height: 34, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12,
    borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)', flexDirection: 'row',
    alignItems: 'center', gap: 7,
  },
  gpsBannerActive: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  gpsText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },

  // Chips
  chipScroller:  { flexGrow: 0, height: 42, marginBottom: 0 },
  chipList:      { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 4, gap: 8 },
  skeletonList:  { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },
  listContent:   { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 12 },
  chip:          {
    height: 34, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  chipActive:    { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  chipDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  chipDotInactive: { backgroundColor: 'transparent' },
  chipText:      { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },
  chipTextActive:{ color: colors.accent },

  // Gym card
  gymCard:  { minHeight: 122, flexDirection: 'row', alignItems: 'stretch', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 10 },
  gymThumb: { width: 90, height: 100, borderRadius: radius.md, overflow: 'hidden' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText:  { fontFamily: fonts.sansBold, fontSize: 8, color: '#060606' },
  subscribedThumbBadge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,212,106,0.45)' },
  subscribedThumbText: { fontFamily: fonts.sansBold, fontSize: 8, color: colors.accent },
  gymInfo:  { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  gymName:  { flex: 1, fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 4 },
  subscribedBadge: {
    maxWidth: 96, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: 'rgba(0,212,106,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.35)',
  },
  subscribedText: { fontFamily: fonts.sansBold, fontSize: 8, color: colors.accent },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'nowrap', marginBottom: 6, overflow: 'hidden' },
  ratingText:{ fontFamily: fonts.sansBold, fontSize: 11, color: '#FBBF24' },
  divider:  { color: colors.t3, fontSize: 11, marginHorizontal: 2 },
  metaText: { minWidth: 0, fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  tagsRow:  { flexDirection: 'row', gap: 5, flexWrap: 'nowrap', marginBottom: 6, overflow: 'hidden' },
  tag:      { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText:  { fontFamily: fonts.sansMedium, fontSize: 9, color: colors.t2 },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  fromLabel: { fontFamily: fonts.sans, fontSize: 8, color: colors.t2 },
  fromPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent, maxWidth: 118 },
  fromPer:   { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  viewBtn:  { minWidth: 62, alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#060606' },
  bookBtn: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder },
  bookBtnText: { color: colors.accent },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2 },

  // Sort sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0F0F0F', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20, paddingBottom: 40 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', marginBottom: 16 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sheetOptionText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.t },
});
