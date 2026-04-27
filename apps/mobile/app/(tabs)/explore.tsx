import { FlatList, View, Text, TouchableOpacity, StyleSheet, TextInput, ImageBackground, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconSearch, IconStar, IconPin, IconDumbbell, IconBolt } from '../../components/Icons';
import { gymsApi } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const FALLBACK_GYMS = [
  { id: '1', name: 'PowerZone Fitness', city: 'Mumbai', rating: 4.8, tier: 'Elite', distance: '0.8 km', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
  { id: '2', name: 'FitHub Pro', city: 'Mumbai', rating: 4.6, tier: 'Premium', distance: '2.1 km', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
  { id: '3', name: 'IronBody Gym', city: 'Bangalore', rating: 4.3, tier: 'Standard', distance: '1.4 km', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80' },
  { id: '4', name: 'AquaFit Centre', city: 'Mumbai', rating: 4.5, tier: 'Premium', distance: '3.1 km', img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80' },
  { id: '5', name: 'CrossTown Arena', city: 'Delhi', rating: 4.7, tier: 'Elite', distance: '0.6 km', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
];

const TIERS = ['All', 'Elite', 'Premium', 'Standard'];
const TIER_COLORS: Record<string, string> = { Elite: colors.accent, Premium: 'rgba(155,0,255,0.9)', Standard: 'rgba(255,138,0,0.9)' };
const TIER_AURORA: Record<string, string> = { Elite: 'rgba(61,255,84,0.25)', Premium: 'rgba(155,0,255,0.25)', Standard: 'rgba(255,138,0,0.22)' };

function SkeletonCard() {
  return (
    <View style={[s.gymCard, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.border, borderWidth: 1 }]} />
  );
}

function GymCard({ g }: { g: any }) {
  const tier = g.tier || g.tierName || 'Standard';
  const name = g.name || g.gymName || 'Gym';
  const rating = g.rating || g.avgRating || '—';
  const city = g.city || g.location?.city || '';
  const dist = g.distance || (g.distanceKm ? `${g.distanceKm} km` : '');
  const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
  return (
    <TouchableOpacity key={g.id || g._id} onPress={() => router.push(`/gym/${g.id || g._id}`)} activeOpacity={0.9} style={s.gymCard}>
      <ImageBackground source={{ uri: img }} style={s.gymPhoto} imageStyle={{ borderRadius: radius.xl }}>
        <View style={[s.gymAurora, { backgroundColor: TIER_AURORA[tier] || TIER_AURORA.Standard }]} />
        <View style={s.gymDark} />
        <View style={s.gymBody}>
          <View style={[s.tierBadge, { borderColor: (TIER_COLORS[tier] || '#fff') + '44' }]}>
            <Text style={[s.tierText, { color: TIER_COLORS[tier] || '#fff' }]}>{tier}</Text>
          </View>
          <View>
            <Text style={s.gymName}>{name}</Text>
            <View style={s.gymMetaRow}>
              <View style={s.metaItem}>
                <IconStar size={11} />
                <Text style={[s.metaText, { color: colors.star }]}>{rating}</Text>
              </View>
              {!!dist && (
                <View style={s.metaItem}>
                  <IconPin size={11} color={colors.t} />
                  <Text style={s.metaText}>{dist}</Text>
                </View>
              )}
              {!!city && <Text style={[s.metaText, { color: colors.t2 }]}>{city}</Text>}
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

export default function Explore() {
  const [q, setQ] = useState('');
  const [activeTier, setActiveTier] = useState('All');
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGyms = async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res: any = await gymsApi.list({
        search: q || undefined,
        tier: activeTier !== 'All' ? activeTier : undefined,
        page: pageNum,
        limit: 20,
      });
      const items: any[] = Array.isArray(res) ? res : res?.gyms ?? res?.data ?? [];
      const total: number = Array.isArray(res) ? res.length : res?.total ?? items.length;
      if (reset || pageNum === 1) {
        setGyms(items.length > 0 ? items : FALLBACK_GYMS);
      } else {
        setGyms(prev => [...prev, ...items]);
      }
      const currentTotal = (reset || pageNum === 1) ? items.length : gyms.length + items.length;
      setHasMore(items.length === 20 && currentTotal < total);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) setGyms(FALLBACK_GYMS);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadGyms(1, true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadGyms(1, true);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, activeTier]);

  const ListHeader = () => (
    <View>
      <Text style={s.title}>Explore Gyms</Text>
      <View style={s.searchRow}>
        <IconSearch size={16} color={colors.t2} />
        <TextInput
          style={s.searchInput}
          placeholder="Search gyms, city..."
          placeholderTextColor={colors.t3}
          value={q}
          onChangeText={setQ}
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      {/* Wellness & Services banner */}
      <TouchableOpacity style={s.wellnessBanner} activeOpacity={0.85} onPress={() => router.push('/wellness')}>
        <View style={s.wellnessAurora} />
        <View style={s.wellnessIconBox}>
          <IconBolt size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.wellnessTitle}>Wellness & Services</Text>
          <Text style={s.wellnessSub}>Yoga, Meditation, Nutrition, Physio & more</Text>
        </View>
      </TouchableOpacity>

      {/* Tier filter pills */}
      <FlatList
        horizontal
        data={TIERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item: tier }) => (
          <TouchableOpacity
            style={[s.filterPill, activeTier === tier && s.filterActive]}
            onPress={() => setActiveTier(tier)}
          >
            <Text style={[s.filterText, activeTier === tier && s.filterTextActive]}>{tier}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Loading skeletons */}
      {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </View>
  );

  return (
    <AuroraBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={loading ? [] : gyms}
        keyExtractor={(item) => String(item.id || item._id)}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => <GymCard g={item} />}
        onEndReached={() => { if (hasMore && !loadingMore) loadGyms(page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
            : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyState}>
              <IconDumbbell size={40} color={colors.accent} />
              <Text style={s.emptyTitle}>No gyms found</Text>
              <Text style={s.emptyBody}>Try adjusting your search or filters</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: 16 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, height: 48, paddingHorizontal: 14, marginBottom: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: '#fff' },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  filterText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  filterTextActive: { color: colors.accent },
  gymCard: { height: 180, borderRadius: radius.xl, marginBottom: 12, overflow: 'hidden' },
  gymPhoto: { flex: 1, justifyContent: 'space-between', padding: 14 },
  gymAurora: { ...StyleSheet.absoluteFillObject },
  gymDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  gymBody: { flex: 1, justifyContent: 'space-between' },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1 },
  tierText: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  gymName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  gymMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  wellnessBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginBottom: 14, overflow: 'hidden',
  },
  wellnessAurora: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61,255,84,0.07)',
  },
  wellnessIconBox: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  wellnessTitle: { fontFamily: fonts.serif, fontSize: 15, color: '#fff', marginBottom: 2 },
  wellnessSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
});
