import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator, Dimensions, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconSearch } from '../components/Icons';
import { gymsApi } from '../lib/api';

const { width: W } = Dimensions.get('window');

const AREA_FILTERS = ['All Areas', 'Patia', 'Saheed Nagar', 'Nayapalli', 'IRC Village', 'Jaydev Vihar', 'Chandrasekharpur', 'Khandagiri'];

const FALLBACK_GYMS = [
  { id: 'bf67d2fc-4b70-43e3-93c4-da533e5caa09', name: "Cult.fit Bhubaneswar",      city: 'Bhubaneswar', area: 'Patia',            rating: 4.8, images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'], amenities: ['AC', 'Parking', 'Pool'] },
  { id: 'c5b25fd2-c918-4bf4-a7c5-35170f0155b1', name: "Gold's Gym Bhubaneswar",    city: 'Bhubaneswar', area: 'Chandrasekharpur', rating: 4.7, images: ['https://images.unsplash.com/photo-1532384661954-a0e26f4f065c?w=600&q=80'], amenities: ['AC', 'Sauna', 'Steam Room'] },
  { id: '547b28de-54cf-4f3a-a036-c1f9294066e6', name: 'CrossFit Bhubaneswar',      city: 'Bhubaneswar', area: 'Jaydev Vihar',     rating: 4.6, images: ['https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=80'], amenities: ['AC', 'Parking'] },
  { id: '554d5de4-38c0-4b87-a2f4-51e0124e859f', name: 'Anytime Fitness',           city: 'Bhubaneswar', area: 'Saheed Nagar',     rating: 4.5, images: ['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&q=80'], amenities: ['AC', '24/7 Access'] },
  { id: '9275177c-765d-4ad8-ac13-6cda17ba4edc', name: 'Fitness First Bhubaneswar', city: 'Bhubaneswar', area: 'IRC Village',      rating: 4.5, images: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80'], amenities: ['AC', 'Pool', 'Yoga'] },
  { id: '28ec2ef5-a659-41f3-aef2-0a0be52f4f16', name: 'Iron House Gym',            city: 'Bhubaneswar', area: 'Nayapalli',        rating: 4.4, images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'], amenities: ['AC', 'Shower', 'Locker'] },
  { id: 'f25d299d-8f81-4dbb-a8aa-8980a5c61769', name: 'PowerHouse Fitness',        city: 'Bhubaneswar', area: 'Khandagiri',       rating: 4.3, images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'], amenities: ['AC', 'Shower'] },
  { id: 'bf3669fb-302b-47a0-be49-34d38233116f', name: 'Flex Fitness Studio',       city: 'Bhubaneswar', area: 'Damana',           rating: 4.2, images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'], amenities: ['AC', 'Zumba'] },
];

function SkRow() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
      <View style={{ width: 90, height: 90, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <View style={{ height: 16, width: '65%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View style={{ height: 12, width: '45%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <View style={{ height: 12, width: '35%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      </View>
    </View>
  );
}

export default function MultiGymNetwork() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeArea, setActiveArea] = useState('All Areas');

  useEffect(() => {
    gymsApi.list({ page: 1, limit: 50 })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.gyms || data?.data || [];
        setGyms(list.length > 0 ? list : FALLBACK_GYMS);
      })
      .catch(() => setGyms(FALLBACK_GYMS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = gyms.filter((gym: any) => {
    const area = gym.area || gym.location?.area || '';
    const matchArea = activeArea === 'All Areas' || area.toLowerCase().includes(activeArea.toLowerCase());
    if (!matchArea) return false;
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (gym.name || '').toLowerCase().includes(q) ||
      (gym.city || '').toLowerCase().includes(q) ||
      area.toLowerCase().includes(q) ||
      (gym.amenities || []).some((a: string) => a.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconArrowLeft size={18} color={colors.t} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Partner Gyms</Text>
          <Text style={s.headerSub}>{loading ? '...' : `${filtered.length} gyms in network`}</Text>
        </View>
      </View>

      {/* Network badge */}
      <View style={s.networkBadge}>
        <View style={s.networkDot} />
        <Text style={s.networkText}>Multi Gym Pass — valid at all locations below</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchRow}>
        <IconSearch size={14} color={colors.t3} />
        <TextInput
          style={s.searchInput}
          placeholder="Search gym, area, amenity…"
          placeholderTextColor={colors.t3}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Area filter chips */}
      <FlatList
        data={AREA_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={a => a}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
        renderItem={({ item: area }) => {
          const active = activeArea === area;
          return (
            <TouchableOpacity
              style={[s.areaChip, active && s.areaChipActive]}
              onPress={() => setActiveArea(area)}
            >
              <Text style={[s.areaChipText, active && s.areaChipTextActive]}>{area}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          [1,2,3,4].map(i => <SkRow key={i} />)
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: '#fff' }}>No gyms found</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.t2 }}>Try a different search or area</Text>
          </View>
        ) : (
          filtered.map((gym: any) => {
            const gymId = gym.id || gym._id;
            const name = gym.name || 'Gym';
            const city = gym.city || '';
            const area = gym.area || gym.location?.area || '';
            const rating = Number(gym.rating || gym.avgRating || 0);
            const img = gym.images?.[0] || gym.coverImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
            const amenities: string[] = (gym.amenities || []).slice(0, 3);

            return (
              <TouchableOpacity
                key={gymId}
                style={s.gymCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id: gymId } } as any)}
              >
                <ImageBackground source={{ uri: img }} style={s.gymThumb} imageStyle={{ borderRadius: radius.md }}>
                  <View style={s.thumbDark} />
                </ImageBackground>
                <View style={s.gymInfo}>
                  <Text style={s.gymName} numberOfLines={1}>{name}</Text>
                  <View style={s.metaRow}>
                    <IconPin size={10} color={colors.t2} />
                    <Text style={s.metaText} numberOfLines={1}>{area ? `${area}, ` : ''}{city}</Text>
                  </View>
                  {rating > 0 && (
                    <View style={s.ratingRow}>
                      <IconStar size={11} color="#FBBF24" />
                      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
                    </View>
                  )}
                  {amenities.length > 0 && (
                    <View style={s.tagsRow}>
                      {amenities.map((a) => (
                        <View key={a} style={s.tag}><Text style={s.tagText}>{a}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={s.checkBadge}>
                  <Text style={s.checkText}>✓</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },
  networkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8,
  },
  networkDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  networkText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.accent },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: '#fff' },
  areaChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass,
  },
  areaChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  areaChipText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },
  areaChipTextActive: { color: colors.accent },
  container: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  gymCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 10, marginBottom: 12, alignItems: 'center',
  },
  gymThumb: { width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden' },
  thumbDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  gymInfo: { flex: 1, gap: 4 },
  gymName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#FBBF24' },
  tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { fontSize: 12, color: colors.accent },
});
