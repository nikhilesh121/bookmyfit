import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, ImageBackground, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconFilter, IconCheck, IconSearch } from '../components/Icons';
import { gymsApi } from '../lib/api';

const { width: W } = Dimensions.get('window');

// ── Categories ────────────────────────────────────────────────────────────────
const CATS = [
  { id: 'all',      label: 'All' },
  { id: 'strength', label: 'Strength' },
  { id: 'cardio',   label: 'Cardio' },
  { id: 'yoga',     label: 'Yoga' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'hiit',     label: 'HIIT' },
  { id: 'zumba',    label: 'Zumba' },
  { id: 'pilates',  label: 'Pilates' },
];

const SORTS = [
  { id: 'rating',    label: 'Top Rated' },
  { id: 'distance',  label: 'Nearest' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'price_desc',label: 'Price: High → Low' },
];

const FALLBACK_GYMS = [
  { id: 'c5b25fd2-c918-4bf4-a7c5-35170f0155b1', name: "Gold's Gym Bhubaneswar",       rating: 4.7, distance: '1.2 km', city: 'Bhubaneswar', amenities: ['Strength', 'Cardio'],  categories: ['Strength', 'Cardio', 'CrossFit'],  images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'], dayPassPrice: 199, discount: null },
  { id: '554d5de4-38c0-4b87-a2f4-51e0124e859f', name: 'Anytime Fitness Bhubaneswar',  rating: 4.5, distance: '2.1 km', city: 'Bhubaneswar', amenities: ['CrossFit', 'HIIT'],    categories: ['CrossFit', 'HIIT', 'Strength'],    images: ['https://images.unsplash.com/photo-1532384661954-a0e26f4f065c?w=600&q=80'], dayPassPrice: 149, discount: null },
  { id: 'bf67d2fc-4b70-43e3-93c4-da533e5caa09', name: 'Cult.fit Bhubaneswar',         rating: 4.8, distance: '3.4 km', city: 'Bhubaneswar', amenities: ['Yoga', 'Strength'],    categories: ['Yoga', 'Strength', 'Cardio'],      images: ['https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=80'], dayPassPrice: 99,  discount: '20% OFF' },
  { id: '547b28de-54cf-4f3a-a036-c1f9294066e6', name: 'CrossFit Bhubaneswar',         rating: 4.6, distance: '2.8 km', city: 'Bhubaneswar', amenities: ['Strength', 'Cardio'],  categories: ['CrossFit', 'HIIT', 'Strength'],    images: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80'], dayPassPrice: 199, discount: null },
  { id: '28ec2ef5-a659-41f3-aef2-0a0be52f4f16', name: 'Iron House Gym',               rating: 4.4, distance: '1.8 km', city: 'Bhubaneswar', amenities: ['HIIT', 'Cardio'],      categories: ['Strength', 'Cardio'],              images: ['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&q=80'], dayPassPrice: 129, discount: '10% OFF' },
  { id: '9275177c-765d-4ad8-ac13-6cda17ba4edc', name: 'Fitness First Bhubaneswar',    rating: 4.5, distance: '4.0 km', city: 'Bhubaneswar', amenities: ['Yoga', 'Pilates'],     categories: ['Yoga', 'Cardio', 'Strength'],      images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'], dayPassPrice: 199, discount: null },
];

function Sk({ h, br = 12, style }: { h: number; br?: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.06)' }, style]} />;
}

export default function GymListingPage() {
  const { category: paramCat } = useLocalSearchParams<{ category?: string }>();

  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState(paramCat || 'all');
  const [activeSort, setActiveSort] = useState('rating');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [searchText, setSearchText] = useState('');
  const pageRef = useRef(1);

  const filterByCat = (list: any[], cat: string) => {
    if (cat === 'all') return list;
    return list.filter((g: any) => {
      const cats = [...(g.categories || []), ...(g.amenities || [])];
      return cats.some((c: string) => c.toLowerCase() === cat.toLowerCase());
    });
  };

  const load = useCallback(async (pg: number, cat: string) => {
    // Only show full skeleton on very first load (no data yet)
    if (pg === 1 && gyms.length === 0) setLoading(true);
    else if (pg > 1) setLoadingMore(true);
    else setLoadingMore(true); // category switch: spinner, keep existing list
    try {
      const params: any = { page: pg, limit: 50 }; // fetch more so local filter has data
      const res: any = await gymsApi.list(params);
      const raw = Array.isArray(res) ? res : res?.gyms || res?.data || [];
      const list = filterByCat(raw, cat);
      const fallback = filterByCat(FALLBACK_GYMS, cat);
      if (raw.length === 0 && pg === 1) { setGyms(fallback); setHasMore(false); return; }
      if (list.length === 0 && pg === 1) { setGyms(fallback); setHasMore(false); return; }
      if (pg === 1) setGyms(list); else setGyms((prev) => [...prev, ...list]);
      setHasMore(raw.length >= 50);
      pageRef.current = pg;
    } catch {
      if (pg === 1) setGyms(filterByCat(FALLBACK_GYMS, cat));
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [gyms.length]);

  useEffect(() => {
    setPage(1);
    load(1, activeCategory);
  }, [activeCategory]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const next = pageRef.current + 1;
      setPage(next);
      load(next, activeCategory);
    }
  };

  // Sort locally (server doesn't always support all sort params)
  const sorted = [...gyms].sort((a, b) => {
    if (activeSort === 'rating')     return (Number(b.rating || b.avgRating || 0)) - (Number(a.rating || a.avgRating || 0));
    if (activeSort === 'distance') {
      const da = parseFloat(a.distance || a.distanceKm || '999');
      const db = parseFloat(b.distance || b.distanceKm || '999');
      return da - db;
    }
    if (activeSort === 'price_asc') return (Number(a.dayPassPrice || a.day_pass_price || 999)) - (Number(b.dayPassPrice || b.day_pass_price || 999));
    if (activeSort === 'price_desc') return (Number(b.dayPassPrice || b.day_pass_price || 0)) - (Number(a.dayPassPrice || a.day_pass_price || 0));
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

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconArrowLeft size={18} color={colors.t} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Gyms Near You</Text>
          <Text style={s.headerSub}>{filtered.length}+ gyms available</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <IconSearch size={14} color={colors.t3} />
          <TextInput
            style={s.searchInput}
            placeholder="Search gyms, areas, amenities…"
            placeholderTextColor={colors.t3}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSortSheet(true)}>
          <IconFilter size={13} color={colors.t2} />
          <Text style={s.sortBtnText}>{activeSortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category chips ── */}
      <FlatList
        data={CATS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 }}
        renderItem={({ item: cat }) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              {active && <View style={s.chipDot} />}
              <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>{cat.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Gym list ── */}
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
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
            contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>No gyms found in this category.</Text>
              </View>
            }
            renderItem={({ item: g }) => <GymCard gym={g} />}
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
                onPress={() => { setActiveSort(sort.id); setShowSortSheet(false); }}
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

function GymCard({ gym }: { gym: any }) {
  const name     = gym.name || gym.gymName || 'Gym';
  const rating   = Number(gym.rating || gym.avgRating || 0).toFixed(1);
  const distance = gym.distance || (gym.distanceKm ? `${gym.distanceKm} km` : '');
  const city     = gym.city || gym.location?.city || '';
  const img      = gym.images?.[0] || gym.coverImage || gym.img || 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&q=80';
  const price    = gym.dayPassPrice || gym.day_pass_price || '—';
  const discount = gym.discount || null;
  const tags: string[] = (gym.amenities || gym.tags || []).slice(0, 3);
  const gid = gym.id || gym._id;

  return (
    <TouchableOpacity
      style={s.gymCard}
      onPress={() => router.push({
        pathname: '/gym/[id]',
        params: {
          id: gid,
          fallbackName: name,
          fallbackRating: rating,
          fallbackAddress: gym.address || gym.location?.address || city,
          fallbackTier: gym.tier || gym.tierName || 'Elite',
        },
      } as any)}
      activeOpacity={0.88}
    >
      <ImageBackground source={{ uri: img }} style={s.gymThumb} imageStyle={{ borderRadius: radius.md }}>
        {discount && (
          <View style={s.discountBadge}><Text style={s.discountText}>{discount}</Text></View>
        )}
      </ImageBackground>

      <View style={s.gymInfo}>
        <View>
          <Text style={s.gymName} numberOfLines={1}>{name}</Text>
          <View style={s.metaRow}>
            <IconStar size={11} color="#FBBF24" />
            <Text style={s.ratingText}>{rating}</Text>
            {distance ? <><Text style={s.divider}>·</Text><IconPin size={10} color={colors.t2} /><Text style={s.metaText}>{distance}</Text></> : null}
            {city      ? <><Text style={s.divider}>·</Text><Text style={s.metaText}>{city}</Text></> : null}
          </View>
          {tags.length > 0 && (
            <View style={s.tagsRow}>
              {tags.map((t) => <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>)}
            </View>
          )}
        </View>

        <View style={s.cardFooter}>
          <View>
            <Text style={s.fromLabel}>Day pass from</Text>
            <Text style={s.fromPrice}>₹{price}<Text style={s.fromPer}>/day</Text></Text>
          </View>
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => router.push({ pathname: '/plans', params: { gymId: gid, gymName: name } } as any)}
          >
            <Text style={s.viewBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', letterSpacing: -0.3 },
  headerSub:   { fontFamily: fonts.sans,  fontSize: 11, color: colors.t2, marginTop: 1 },
  sortBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  sortBtnText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: '#fff' },

  // Chips
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipActive:    { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  chipDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  chipText:      { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },
  chipTextActive:{ color: colors.accent },

  // Gym card
  gymCard:  { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 10 },
  gymThumb: { width: 90, height: 100, borderRadius: radius.md, overflow: 'hidden' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText:  { fontFamily: fonts.sansBold, fontSize: 8, color: '#060606' },
  gymInfo:  { flex: 1, justifyContent: 'space-between' },
  gymName:  { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 4 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap', marginBottom: 6 },
  ratingText:{ fontFamily: fonts.sansBold, fontSize: 11, color: '#FBBF24' },
  divider:  { color: colors.t3, fontSize: 11, marginHorizontal: 2 },
  metaText: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  tagsRow:  { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 6 },
  tag:      { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText:  { fontFamily: fonts.sansMedium, fontSize: 9, color: colors.t2 },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  fromLabel: { fontFamily: fonts.sans, fontSize: 8, color: colors.t2 },
  fromPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  fromPer:   { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  viewBtn:  { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#060606' },

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
