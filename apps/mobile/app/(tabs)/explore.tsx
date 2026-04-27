import { FlatList, ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconSearch, IconStar, IconPin, IconHeart, IconChevronRight, IconBolt, IconFilter } from '../../components/Icons';
import { gymsApi } from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Gyms', emoji: '🏋️' },
  { id: 'strength', label: 'Strength', emoji: '💪' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘' },
  { id: 'crossfit', label: 'CrossFit', emoji: '🏆' },
];

const FALLBACK_GYMS = [
  { id: '1', name: 'Anytime Fitness', city: 'Bhubaneswar', area: 'Patia', rating: 4.8, reviewCount: 128, distance: '0.8 km', discountPercent: 20, facilities: ['AC', 'Parking', 'Locker'], img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
  { id: '2', name: 'Blaze Fitness', city: 'Bhubaneswar', area: 'Saheed Nagar', rating: 4.6, reviewCount: 96, distance: '2.1 km', discountPercent: 15, facilities: ['Yoga', 'Sauna', 'Trainer'], img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
  { id: '3', name: 'CrossFit Arena', city: 'Bhubaneswar', area: 'Kharvel Nagar', rating: 4.3, reviewCount: 64, distance: '1.4 km', discountPercent: 0, facilities: ['CrossFit', 'Boxing', 'Cardio'], img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80' },
  { id: '4', name: 'DY Patil Gym', city: 'Mumbai', area: 'Navi Mumbai', rating: 4.5, reviewCount: 210, distance: '3.1 km', discountPercent: 0, facilities: ['Pool', 'Steam', 'Cardio'], img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80' },
  { id: '5', name: 'Elite Power Zone', city: 'Delhi', area: 'Connaught Place', rating: 4.7, reviewCount: 183, distance: '0.6 km', discountPercent: 10, facilities: ['Personal Training', 'Supplements'], img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: '6', name: 'FitHub Pro', city: 'Mumbai', area: 'Andheri West', rating: 4.4, reviewCount: 77, distance: '1.8 km', discountPercent: 0, facilities: ['Yoga', 'Zumba', 'AC'], img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
  { id: '7', name: 'Gold\'s Gym', city: 'Bhubaneswar', area: 'Chandrasekharpur', rating: 4.9, reviewCount: 348, distance: '2.5 km', discountPercent: 5, facilities: ['Olympic Weights', 'Cardio', 'Trainer'], img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
  { id: '8', name: 'Hardcore Fitness', city: 'Bhubaneswar', area: 'Nayapalli', rating: 4.2, reviewCount: 52, distance: '4.1 km', discountPercent: 0, facilities: ['Powerlifting', 'Cardio'], img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
  { id: '9', name: 'IronBody Gym', city: 'Bangalore', area: 'Koramangala', rating: 4.6, reviewCount: 140, distance: '1.1 km', discountPercent: 0, facilities: ['AC', 'Locker', 'Parking'], img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80' },
  { id: '10', name: 'Jetts Fitness', city: 'Hyderabad', area: 'Banjara Hills', rating: 4.5, reviewCount: 89, distance: '2.3 km', discountPercent: 0, facilities: ['24/7', 'Cardio', 'Weights'], img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
];

function GymCard({ g, index }: { g: any; index: number }) {
  const [liked, setLiked] = useState(false);
  const name = g.name || g.gymName || 'Gym';
  const rating = g.rating || g.avgRating || '4.5';
  const reviewCount = g.reviewCount || g.reviews || Math.floor(Math.random() * 200 + 20);
  const city = g.city || g.location?.city || '';
  const area = g.area || g.location?.area || '';
  const dist = g.distance || (g.distanceKm ? `${g.distanceKm} km` : '');
  const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
  const discount = g.discountPercent || (index === 0 ? 20 : index === 1 ? 15 : index === 2 ? 10 : 0);
  const facilities: string[] = g.facilities || g.amenities || ['Cardio', 'Weights', 'AC'];

  return (
    <TouchableOpacity
      style={s.gymCard}
      activeOpacity={0.88}
      onPress={() => router.push(`/gym/${g.id || g._id}`)}
    >
      {/* Left image */}
      <View style={s.gymImgWrapper}>
        <Image source={{ uri: img }} style={s.gymImg} />
        {discount > 0 && (
          <View style={s.discountBadge}>
            <Text style={s.discountText}>{discount}% OFF</Text>
          </View>
        )}
        <TouchableOpacity style={s.heartBtn} onPress={() => setLiked(l => !l)}>
          <IconHeart size={14} color={liked ? '#ff4d6d' : '#fff'} filled={liked} />
        </TouchableOpacity>
      </View>

      {/* Right info */}
      <View style={s.gymInfo}>
        {/* Row 1: name + price */}
        <View style={s.infoRow1}>
          <Text style={s.gymName} numberOfLines={1}>{name}</Text>
          <View style={s.priceBlock}>
            <Text style={s.priceFrom}>From</Text>
            <View style={s.priceRow}>
              <Text style={s.priceVal}>₹99</Text>
              <Text style={s.priceUnit}>/day</Text>
            </View>
          </View>
        </View>

        {/* Row 2: rating */}
        <View style={s.ratingRow}>
          <IconStar size={12} color={colors.star} />
          <Text style={s.ratingText}>{typeof rating === 'number' ? rating.toFixed(1) : rating}</Text>
          <Text style={s.reviewCount}>({reviewCount})</Text>
        </View>

        {/* Row 3: location */}
        <View style={s.locationRow}>
          <IconPin size={12} color={colors.t2} />
          <Text style={s.locationText} numberOfLines={1}>
            {[area, city].filter(Boolean).join(', ')}{dist ? ` • ${dist}` : ''}
          </Text>
        </View>

        {/* Row 4: facility tags */}
        <View style={s.tagsRow}>
          {facilities.slice(0, 3).map((f: string, i: number) => (
            <View key={i} style={s.tagPill}>
              <Text style={s.tagText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Row 5: View Plans button */}
        <View style={s.viewRow}>
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => router.push({ pathname: '/plans', params: { gymId: String(g.id || g._id), gymName: name } })}
          >
            <Text style={s.viewBtnText}>View Plans</Text>
            <IconChevronRight size={12} color="#060606" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Explore() {
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
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
  }, [q]);

  // Filter by category
  const filteredGyms = selectedCategory === 'all'
    ? gyms
    : gyms.filter(g => {
        const tags: string[] = [
          ...(g.facilities || []),
          ...(g.categories || []),
          ...(g.tags || []),
        ].map((t: string) => t.toLowerCase());
        return tags.some(t => t.includes(selectedCategory));
      });

  const ListHeader = () => (
    <View>
      <Text style={s.title}>Explore Gyms</Text>

      {/* Search bar */}
      <View style={s.searchBar}>
        <IconSearch size={16} color={colors.t2} />
        <TextInput
          style={s.searchInput}
          placeholder="Search gyms, city, area..."
          placeholderTextColor={colors.t3}
          value={q}
          onChangeText={setQ}
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      {/* Wellness banner */}
      <TouchableOpacity style={s.wellnessBanner} activeOpacity={0.85} onPress={() => router.push('/wellness')}>
        <View style={s.wellnessIconBox}>
          <IconBolt size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.wellnessTitle}>Wellness & Services</Text>
          <Text style={s.wellnessSub}>Spa, Massage, Yoga, Physio & more</Text>
        </View>
        <IconChevronRight size={16} color={colors.accent} />
      </TouchableOpacity>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryRow}
        style={{ marginBottom: 16 }}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.categoryChip, selectedCategory === cat.id && s.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={s.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[s.categoryLabel, selectedCategory === cat.id && s.categoryLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Popular Gyms Near You</Text>
        <TouchableOpacity style={s.filterBtn}>
          <IconFilter size={13} color={colors.accent} />
          <Text style={s.filterBtnText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Loading skeletons */}
      {loading && [1, 2, 3].map((i) => (
        <View key={i} style={[s.gymCard, { minHeight: 140, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <FlatList
        data={loading ? [] : filteredGyms}
        keyExtractor={(item) => String(item.id || item._id)}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => <GymCard g={item} index={index} />}
        onEndReached={() => { if (hasMore && !loadingMore && selectedCategory === 'all') loadGyms(page + 1); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
            : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No gyms found</Text>
              <Text style={s.emptyBody}>Try a different category or search</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  title: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: 14 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 50, height: 48, paddingHorizontal: 16, marginBottom: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: '#fff' },

  wellnessBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.xl, padding: 14, marginBottom: 16,
  },
  wellnessIconBox: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: 'rgba(61,255,84,0.1)', borderWidth: 1, borderColor: 'rgba(61,255,84,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  wellnessTitle: { fontFamily: fonts.serif, fontSize: 15, color: '#fff', marginBottom: 2 },
  wellnessSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  // Gym cards
  gymCard: {
    flexDirection: 'row', marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    height: 148,
  },
  gymImgWrapper: { width: 110, height: 148, position: 'relative' },
  gymImg: { width: 110, height: 148, resizeMode: 'cover' },
  discountBadge: {
    position: 'absolute', top: 0, left: 0,
    backgroundColor: '#3DFF54', paddingHorizontal: 5, paddingVertical: 3,
    borderBottomRightRadius: 7,
  },
  discountText: { fontFamily: fonts.sansBold, fontSize: 8, color: '#060606' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },

  gymInfo: { flex: 1, padding: 10, gap: 4 },
  infoRow1: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  gymName: { flex: 1, fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  priceBlock: { alignItems: 'flex-end', flexShrink: 0 },
  priceFrom: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceVal: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  priceUnit: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.star },
  reviewCount: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },

  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tagPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },

  viewRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#3DFF54', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
  },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#060606' },

  categoryRow: { gap: 8, paddingRight: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(61,255,84,0.15)', borderColor: 'rgba(61,255,84,0.4)',
  },
  categoryEmoji: { fontSize: 13 },
  categoryLabel: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },
  categoryLabelActive: { color: colors.accent },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(61,255,84,0.1)', borderWidth: 1, borderColor: 'rgba(61,255,84,0.25)',
  },
  filterBtnText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.accent },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
