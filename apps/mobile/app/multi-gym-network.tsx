import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconStar, IconPin } from '../components/Icons';
import { gymsApi } from '../lib/api';

const { width: W } = Dimensions.get('window');

const FALLBACK_GYMS = [
  { id: '1', name: 'PowerZone Fitness', city: 'Bhubaneswar', area: 'Saheed Nagar', rating: 4.8, images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'], amenities: ['AC', 'Parking', 'Pool'] },
  { id: '2', name: 'Iron Temple', city: 'Bhubaneswar', area: 'Nayapalli', rating: 4.6, images: ['https://images.unsplash.com/photo-1532384661954-a0e26f4f065c?w=600&q=80'], amenities: ['AC', 'Shower', 'Locker'] },
  { id: '3', name: 'Anytime Fitness', city: 'Bhubaneswar', area: 'Jaydev Vihar', rating: 4.5, images: ['https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=80'], amenities: ['AC', 'Parking'] },
  { id: '4', name: "Gold's Gym", city: 'Bhubaneswar', area: 'Chandrasekharpur', rating: 4.7, images: ['https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600&q=80'], amenities: ['AC', 'Steam', 'Pool'] },
  { id: '5', name: 'FitHub Pro', city: 'Bhubaneswar', area: 'Patia', rating: 4.4, images: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80'], amenities: ['AC', 'Shower'] },
  { id: '6', name: 'ZenFit Studio', city: 'Bhubaneswar', area: 'IRC Village', rating: 4.3, images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'], amenities: ['AC', 'Yoga'] },
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

  useEffect(() => {
    gymsApi.list({ page: 1, limit: 20 })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.gyms || data?.data || [];
        setGyms(list.length > 0 ? list : FALLBACK_GYMS);
      })
      .catch(() => setGyms(FALLBACK_GYMS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconArrowLeft size={18} color={colors.t} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Partner Gyms</Text>
          <Text style={s.headerSub}>{loading ? '...' : `${gyms.length} gyms in network`}</Text>
        </View>
      </View>

      {/* Network badge */}
      <View style={s.networkBadge}>
        <View style={s.networkDot} />
        <Text style={s.networkText}>Multi Gym Pass — valid at all locations below</Text>
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          [1,2,3,4].map(i => <SkRow key={i} />)
        ) : (
          gyms.map((gym: any) => {
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
