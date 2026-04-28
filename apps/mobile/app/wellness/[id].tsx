import { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Image, ImageBackground, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconClock, IconShare } from '../../components/Icons';
import { api } from '../../lib/api';

// ─── Fallback Data ────────────────────────────────────────────────────────────
const FALLBACK_PARTNERS: Record<string, any> = {
  '1': { id: '1', name: 'Serenity Spa & Wellness', serviceType: 'spa', city: 'Bhubaneswar', area: 'Saheed Nagar', rating: 4.8, reviewCount: 142, discountPercent: 20, photos: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80'] },
  '2': { id: '2', name: 'Royal Bliss Spa', serviceType: 'spa', city: 'Bhubaneswar', area: 'Nayapalli', rating: 4.6, reviewCount: 98, discountPercent: 0, photos: ['https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80'] },
};
const DEFAULT_PARTNER = { id: '?', name: 'Wellness Centre', serviceType: 'spa', city: 'Bhubaneswar', area: '', rating: 4.5, reviewCount: 50, discountPercent: 0, photos: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80'] };

const FALLBACK_SERVICES = [
  { id: 'fs1', name: 'Swedish Massage', category: 'Massage', price: 1499, originalPrice: 1999, durationMinutes: 60, description: 'Full body relaxation massage with warm oils' },
  { id: 'fs2', name: 'Deep Tissue Massage', category: 'Massage', price: 1999, originalPrice: 2499, durationMinutes: 90, description: 'Targets deep muscle tension and knots' },
  { id: 'fs3', name: 'Aromatherapy', category: 'Relaxation', price: 1299, originalPrice: null, durationMinutes: 60, description: 'Calming essential oil therapy' },
  { id: 'fs4', name: 'Classic Facial', category: 'Facial', price: 999, originalPrice: 1299, durationMinutes: 45, description: 'Deep cleansing and hydration facial' },
  { id: 'fs5', name: 'Gold Facial', category: 'Facial', price: 1799, originalPrice: 2199, durationMinutes: 60, description: 'Luxury 24K gold anti-ageing treatment' },
  { id: 'fs6', name: 'Hot Stone Therapy', category: 'Massage', price: 2299, originalPrice: 2799, durationMinutes: 75, description: 'Heated basalt stones for deep relaxation' },
  { id: 'fs7', name: 'Manicure + Pedicure', category: 'Nail Care', price: 799, originalPrice: 999, durationMinutes: 90, description: 'Classic nail care with polish' },
  { id: 'fs8', name: 'Head & Scalp Massage', category: 'Massage', price: 699, originalPrice: null, durationMinutes: 30, description: 'Relieving scalp tension and headaches' },
];

const SVC_IMAGES = [
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80',
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
  'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80',
  'https://images.unsplash.com/photo-1610337673044-720471f83677?w=400&q=80',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
  'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80',
  'https://images.unsplash.com/photo-1571019614099-9fdcf8b4e43b?w=400&q=80',
];

type Partner = {
  id: string; name: string; serviceType: string; city: string; area: string;
  address?: string; rating: number; reviewCount: number; distanceLabel?: string;
  photos?: string[]; discountPercent?: number;
};
type Service = {
  id: string; name: string; description?: string; price: number;
  originalPrice?: number | null; durationMinutes: number; imageUrl?: string; category?: string;
};

// Group services by category
function groupByCategory(services: Service[]): Record<string, Service[]> {
  return services.reduce((acc, svc) => {
    const cat = svc.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {} as Record<string, Service[]>);
}

export default function WellnessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/wellness/partners?limit=50`).catch(() => null),
      api.get(`/wellness/partners/${id}/services`).catch(() => []),
    ]).then(([pRes, svcs]) => {
      const all: Partner[] = pRes?.data || (Array.isArray(pRes) ? pRes : []);
      const found = all.find((p: Partner) => p.id === id);
      if (found) {
        setPartner(found);
      } else {
        setPartner(FALLBACK_PARTNERS[id] || { ...DEFAULT_PARTNER, id });
      }
      const svcList = Array.isArray(svcs) ? svcs : (svcs?.data || []);
      setServices(svcList.length > 0 ? svcList : FALLBACK_SERVICES);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${partner?.name} on BookMyFit!` });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  const heroUri = (partner?.photos && partner.photos.length > 0)
    ? partner.photos[0]
    : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80';

  const grouped = groupByCategory(services);

  return (
    <SafeAreaView style={s.screen} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ── Hero ── */}
        <View style={s.heroContainer}>
          <ImageBackground source={{ uri: heroUri }} style={s.heroImg}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(6,6,6,0.92)']}
              locations={[0.3, 0.65, 1]}
              style={s.heroGradient}
            >
              {/* Top row buttons */}
              <View style={s.heroTopRow}>
                <TouchableOpacity onPress={() => router.back()} style={s.glassCircle}>
                  <IconArrowLeft size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={s.glassCircle}>
                  <IconShare size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Bottom hero info */}
              <View style={s.heroBottom}>
                {(partner?.discountPercent ?? 0) > 0 && (
                  <View style={s.discountBadge}>
                    <Text style={s.discountBadgeText}>{partner!.discountPercent}% OFF</Text>
                  </View>
                )}
                <Text style={s.heroName}>{partner?.name || 'Wellness Centre'}</Text>
                <View style={s.heroMetaRow}>
                  <View style={s.heroMetaChip}>
                    <IconStar size={13} color={colors.star} />
                    <Text style={s.heroMetaText}>{(partner?.rating ?? 4.5).toFixed(1)} ({partner?.reviewCount ?? 0})</Text>
                  </View>
                  {partner?.area ? (
                    <View style={s.heroMetaChip}>
                      <IconPin size={13} color={colors.accent} />
                      <Text style={s.heroMetaText}>{partner.area}, {partner.city}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* ── Quick stats row ── */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statLabel}>Hours</Text>
            <Text style={s.statValue}>9am – 9pm</Text>
          </View>
          <View style={[s.statChip, s.statChipMiddle]}>
            <Text style={s.statLabel}>Rating</Text>
            <Text style={s.statValue}>{(partner?.rating ?? 4.5).toFixed(1)} ★</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statLabel}>Distance</Text>
            <Text style={s.statValue}>{partner?.distanceLabel || '~2 km'}</Text>
          </View>
        </View>

        {/* ── About ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.aboutText}>
            {partner?.address ||
              `${partner?.name || 'This wellness centre'} offers premium wellness and rejuvenation services in ${partner?.area ? partner.area + ', ' : ''}${partner?.city || 'Bhubaneswar'}. Book an appointment and experience the best in relaxation and self-care.`
            }
          </Text>
        </View>

        {/* ── Services ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Our Services</Text>

          {Object.entries(grouped).map(([category, catServices]) => (
            <View key={category}>
              <Text style={s.categoryLabel}>{category}</Text>
              {catServices.map((svc, i) => {
                const img = svc.imageUrl || SVC_IMAGES[i % SVC_IMAGES.length];
                const hasDiscount = svc.originalPrice != null && Number(svc.originalPrice) > Number(svc.price);
                const pct = hasDiscount
                  ? Math.round(100 - (Number(svc.price) / Number(svc.originalPrice!)) * 100)
                  : 0;
                return (
                  <View key={svc.id} style={s.svcCard}>
                    {/* Left image */}
                    <Image source={{ uri: img }} style={s.svcImg} />
                    {/* Right body */}
                    <View style={s.svcBody}>
                      <Text style={s.svcName} numberOfLines={1}>{svc.name}</Text>
                      <View style={s.svcBadgeRow}>
                        <View style={s.svcCatBadge}>
                          <Text style={s.svcCatText}>{svc.category || 'Wellness'}</Text>
                        </View>
                        <View style={s.svcDurBadge}>
                          <IconClock size={11} color={colors.t2} />
                          <Text style={s.svcDurText}>{svc.durationMinutes} min</Text>
                        </View>
                      </View>
                      {/* Price */}
                      <View style={s.svcPriceRow}>
                        {hasDiscount && (
                          <Text style={s.svcOriginal}>₹{Number(svc.originalPrice).toLocaleString()}</Text>
                        )}
                        <Text style={s.svcPrice}>₹{Number(svc.price).toLocaleString()}</Text>
                        {hasDiscount && (
                          <View style={s.discBadge}>
                            <Text style={s.discText}>{pct}%</Text>
                          </View>
                        )}
                      </View>
                      {/* Book button */}
                      <TouchableOpacity
                        style={s.bookBtn}
                        onPress={() => router.push({
                          pathname: '/wellness/book-service',
                          params: {
                            serviceId: svc.id,
                            partnerId: id,
                            serviceName: svc.name,
                            price: svc.price,
                            originalPrice: svc.originalPrice ?? '',
                            duration: svc.durationMinutes,
                          },
                        } as any)}
                      >
                        <Text style={s.bookBtnText}>Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroContainer: { width: '100%' },
  heroImg: { width: '100%', height: 300 },
  heroGradient: {
    flex: 1, height: 300,
    justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  glassCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: { gap: 6 },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 4,
  },
  discountBadgeText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#060606' },
  heroName: { fontFamily: fonts.serif, fontSize: 24, color: '#fff', lineHeight: 30 },
  heroMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  // Stats row
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 8,
  },
  statChip: {
    flex: 1, backgroundColor: colors.glass, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderGlass,
    paddingVertical: 12, alignItems: 'center',
  },
  statChipMiddle: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  statLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginBottom: 2 },
  statValue: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t },

  // Section
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: '#fff', marginBottom: 12 },
  aboutText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2, lineHeight: 22 },
  categoryLabel: {
    fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent,
    letterSpacing: 0.5, marginTop: 16, marginBottom: 10,
  },

  // Service card
  svcCard: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderGlass,
    marginBottom: 12, overflow: 'hidden', padding: 12, gap: 12,
  },
  svcImg: { width: 80, height: 80, borderRadius: radius.lg, resizeMode: 'cover' },
  svcBody: { flex: 1, justifyContent: 'space-between' },
  svcName: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', marginBottom: 4 },
  svcBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  svcCatBadge: {
    backgroundColor: colors.accentSoft, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  svcCatText: { fontFamily: fonts.sans, fontSize: 10, color: colors.accent },
  svcDurBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  svcDurText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  svcPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  svcOriginal: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.t3, textDecorationLine: 'line-through',
  },
  svcPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  discBadge: {
    backgroundColor: colors.accentSoft, borderRadius: radius.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  discText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent },
  bookBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 7, alignItems: 'center',
  },
  bookBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#060606' },
});
