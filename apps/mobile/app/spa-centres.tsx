import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconChevronRight, IconPin, IconStar } from '../components/Icons';
import { api } from '../lib/api';

const FALLBACK_SPA_CENTRES = [
  { id: 'p1', name: 'Serenity Spa & Wellness', serviceType: 'Spa', city: 'Bhubaneswar', area: 'Patia', rating: 4.7, reviewCount: 128, photos: ['https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=700&q=80'], minPrice: 999, serviceCount: 8 },
  { id: 'p2', name: 'The Royal Spa', serviceType: 'Massage', city: 'Bhubaneswar', area: 'Saheed Nagar', rating: 4.5, reviewCount: 96, photos: ['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=700&q=80'], minPrice: 799, serviceCount: 6 },
  { id: 'p3', name: 'Bliss Physio Clinic', serviceType: 'Physio', city: 'Bhubaneswar', area: 'Nayapalli', rating: 4.6, reviewCount: 84, photos: ['https://images.unsplash.com/photo-1559756994-9df0adf7bff9?w=700&q=80'], minPrice: 699, serviceCount: 5 },
];

const CATEGORIES = ['All', 'Spa', 'Massage', 'Physio', 'Recovery'];

type Partner = {
  id: string;
  name: string;
  serviceType?: string;
  city?: string;
  area?: string;
  rating?: number;
  reviewCount?: number;
  photos?: string[];
  minPrice?: number | null;
  serviceCount?: number;
};

function isHomeService(partner: Partner) {
  return String(partner.serviceType || '').toLowerCase().includes('home');
}

export default function SpaCentresScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let active = true;
    api.get('/wellness/partners?limit=100')
      .then((res: any) => {
        if (!active) return;
        const raw: Partner[] = Array.isArray(res) ? res : res?.data || [];
        const spaCentres = raw.filter((partner) => !isHomeService(partner));
        setPartners(spaCentres.length ? spaCentres : FALLBACK_SPA_CENTRES);
      })
      .catch(() => {
        if (active) setPartners(FALLBACK_SPA_CENTRES);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (category === 'All') return partners;
    const q = category.toLowerCase();
    return partners.filter((partner) => String(partner.serviceType || '').toLowerCase().includes(q));
  }, [category, partners]);

  return (
    <SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Spa Centres Near You</Text>
          <Text style={s.subtitle}>{filtered.length}+ verified wellness partners</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {CATEGORIES.map((item) => {
            const active = item === category;
            return (
              <TouchableOpacity key={item} style={[s.chip, active && s.chipActive]} onPress={() => setCategory(item)}>
                {active && <View style={s.chipDot} />}
                <Text style={[s.chipText, active && s.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {filtered.map((partner, index) => {
            const image = partner.photos?.[0] || FALLBACK_SPA_CENTRES[index % FALLBACK_SPA_CENTRES.length].photos[0];
            return (
              <TouchableOpacity
                key={partner.id}
                style={s.card}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/wellness/[id]', params: { id: partner.id } } as any)}
              >
                <ImageBackground source={{ uri: image }} style={s.hero} imageStyle={{ borderRadius: radius.xl }}>
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.86)']} style={s.heroShade}>
                    <View style={s.ratingPill}>
                      <IconStar size={12} color={colors.star} />
                      <Text style={s.ratingText}>{Number(partner.rating || 4.5).toFixed(1)}</Text>
                      <Text style={s.reviewText}>({partner.reviewCount || 0})</Text>
                    </View>
                    <Text style={s.cardTitle} numberOfLines={1}>{partner.name}</Text>
                    <View style={s.locationRow}>
                      <IconPin size={12} color={colors.accent} />
                      <Text style={s.locationText} numberOfLines={1}>{partner.area || 'Nearby'}, {partner.city || 'Bhubaneswar'}</Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>

                <View style={s.cardFooter}>
                  <View>
                    <Text style={s.metaLabel}>{partner.serviceCount || 0} services available</Text>
                    <Text style={s.price}>From Rs {Number(partner.minPrice || 699).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={s.viewBtn}>
                    <Text style={s.viewText}>View</Text>
                    <IconChevronRight size={13} color="#060606" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No spa centres found</Text>
              <Text style={s.emptyText}>Try another category.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? 24 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.sansBold, fontSize: 22, color: '#fff' },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 2 },
  chipsWrap: { flexGrow: 0, marginBottom: 6 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 34, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  chipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t2 },
  chipTextActive: { color: colors.accent },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 44, gap: 14 },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.glass,
    overflow: 'hidden',
  },
  hero: { height: 170 },
  heroShade: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8,
  },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  reviewText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 19, color: '#fff', marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.72)' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  metaLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 3 },
  price: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  viewText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#060606' },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginBottom: 6 },
  emptyText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
