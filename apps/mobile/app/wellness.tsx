import { useState, useRef, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert,
  Image, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import {
  IconArrowLeft, IconSearch, IconStar, IconPin, IconChevronRight,
  IconCheck, IconShield, IconBolt, IconHeart,
} from '../components/Icons';
import { api } from '../lib/api';

const { width } = Dimensions.get('window');
const CARD_W = width;

const HERO_SLIDES = [
  {
    id: 'h1',
    kicker: 'SELF CARE IS HEALTH CARE',
    title: 'Relax Your Body',
    titleAccent: 'Refresh Your Mind',
    subtitle: 'Premium spa experiences\nfor your well-being.',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80',
  },
  {
    id: 'h2',
    kicker: 'CERTIFIED THERAPISTS',
    title: 'Heal. Recover.',
    titleAccent: 'Feel Amazing.',
    subtitle: 'Expert cupping, physio\nand massage services.',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80',
  },
];

const FALLBACK_SVC_IMAGES: Record<string, string> = {
  'Full Body Massage':    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  'Aroma Therapy':        'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
  'Deep Tissue Massage':  'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80',
  'Body Scrub & Polish':  'https://images.unsplash.com/photo-1610337673044-720471f83677?w=400&q=80',
  'Foot Reflexology':     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  'Hot Stone Therapy':    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80',
  'Cupping Therapy':      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
  'Physiotherapy':        'https://images.unsplash.com/photo-1571019614099-9fdcf8b4e43b?w=400&q=80',
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80';

const TRUST = [
  { icon: 'shield', label: 'Verified\nSpa Partners' },
  { icon: 'check', label: 'Trained &\nCertified' },
  { icon: 'bolt', label: 'Hygienic\n& Safe' },
  { icon: 'star', label: 'Easy\nBooking' },
  { icon: 'clock', label: '24/7\nSupport' },
];

// ── Types ────────────────────────────────────────────────────────────────────

type ApiPartner = {
  id: string; name: string; serviceType: string; city: string; area: string;
  rating: number; reviewCount: number; photos: string[]; distanceLabel?: string;
};
type ApiService = {
  id: string; name: string; durationMinutes: number; price: number;
  imageUrl?: string; partnerId: string; partner?: ApiPartner;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Wellness() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [likedCentres, setLikedCentres] = useState<string[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'spa' | 'home'>('all');
  const heroRef = useRef<FlatList>(null);

  useEffect(() => {
    Promise.all([
      api.get('/wellness/services/all').catch(() => []),
      api.get('/wellness/partners').catch(() => ({ data: [] })),
    ]).then(([svcs, pRes]) => {
      setServices(Array.isArray(svcs) ? svcs : []);
      const pData = Array.isArray(pRes) ? pRes : (pRes?.data ?? []);
      setPartners(pData);
    }).finally(() => setLoading(false));
  }, []);

  const toggleLike = (id: string) =>
    setLikedCentres((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleServiceBook = (svc: ApiService) => {
    Alert.alert(
      'Book Service',
      `Book ${svc.name} (${svc.durationMinutes} min — ₹${Number(svc.price).toLocaleString('en-IN')})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => Alert.alert('Coming Soon', 'Online booking for this service will be available shortly.') },
      ],
    );
  };

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setHeroIndex(idx);
  };

  const filteredPartners = partners.filter(p =>
    activeFilter === 'all' ? true : p.serviceType === activeFilter
  );

  const getSvcImage = (svc: ApiService) => {
    if (svc.imageUrl) return svc.imageUrl;
    for (const key of Object.keys(FALLBACK_SVC_IMAGES)) {
      if (svc.name.toLowerCase().includes(key.toLowerCase())) return FALLBACK_SVC_IMAGES[key];
    }
    const partner = partners.find(p => p.id === svc.partnerId);
    return partner?.photos?.[0] ?? FALLBACK_IMG;
  };

  const getPartnerImg = (p: ApiPartner) =>
    p.photos?.[0] ?? FALLBACK_IMG;

  const getMinPrice = (partnerId: string) => {
    const partnerSvcs = services.filter(s => s.partnerId === partnerId);
    if (!partnerSvcs.length) return null;
    const min = Math.min(...partnerSvcs.map(s => Number(s.price)));
    return `₹${min.toLocaleString('en-IN')}`;
  };

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>Spa & Recovery</Text>
          <Text style={s.headerSub}>Relax. Rejuvenate. Refresh.</Text>
        </View>
        <TouchableOpacity style={s.iconBtn}>
          <IconSearch size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* ── Hero Slider ── */}
        <FlatList
          ref={heroRef}
          data={HERO_SLIDES}
          horizontal
          pagingEnabled
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onHeroScroll}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.id}
          style={{ marginBottom: 0 }}
          renderItem={({ item }) => (
            <View style={s.heroCard}>
              <Image source={{ uri: item.image }} style={s.heroImg} />
              <View style={s.heroDark} />
              <View style={s.heroContent}>
                <Text style={s.heroKicker}>{item.kicker}</Text>
                <Text style={s.heroTitle}>{item.title}</Text>
                <Text style={s.heroTitleAccent}>{item.titleAccent}</Text>
                <Text style={s.heroBody}>{item.subtitle}</Text>
              </View>
            </View>
          )}
        />
        {/* Dots */}
        <View style={s.dots}>
          {HERO_SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, heroIndex === i && s.dotActive]} />
          ))}
        </View>

        {/* ── Service Type Filter ── */}
        <Text style={[s.sectionTitle, { paddingHorizontal: 16 }]}>Choose Your Service Type</Text>
        <View style={s.serviceTypeRow}>
          {(['all', 'spa', 'home'] as const).map((filter) => {
            const labels = { all: 'All Services', spa: 'Spa Centre', home: 'Home Service' };
            const emojis = { all: '✨', spa: '🏢', home: '🏠' };
            const descs  = { all: 'Browse all\nwellness services', spa: 'Visit partner\nspa centres', home: 'Professional spa\nat your home' };
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[s.typeCard, isActive && s.typeCardActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <View style={[s.typeIconWrap, isActive && s.typeIconActive]}>
                  <Text style={s.typeEmoji}>{emojis[filter]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.typeName, isActive && { color: colors.accent }]}>{labels[filter]}</Text>
                  <Text style={s.typeDesc}>{descs[filter]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Popular Spa Services ── */}
        <View style={s.rowHeader}>
          <Text style={s.sectionTitle}>Popular Services</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : services.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>✨ Services coming soon</Text>
            <Text style={s.emptySubText}>We're onboarding wellness partners near you.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.servicesScroll}>
            {services.map((svc) => (
              <TouchableOpacity key={svc.id} style={s.svcCard} onPress={() => handleServiceBook(svc)}>
                <Image source={{ uri: getSvcImage(svc) }} style={s.svcImg} />
                <View style={s.svcInfo}>
                  <Text style={s.svcName} numberOfLines={2}>{svc.name}</Text>
                  <Text style={s.svcMeta}>
                    {svc.durationMinutes} min{' '}
                    <Text style={s.svcDot}>•</Text>{' '}
                    <Text style={s.svcPrice}>₹{Number(svc.price).toLocaleString('en-IN')}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Spa Centres ── */}
        <View style={[s.rowHeader, { marginTop: 20 }]}>
          <Text style={s.sectionTitle}>
            {activeFilter === 'home' ? 'Home Service Providers' : activeFilter === 'spa' ? 'Top Spa Centres' : 'Top Wellness Partners'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : filteredPartners.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>🌿 Partners coming soon</Text>
            <Text style={s.emptySubText}>We're expanding our wellness network.</Text>
          </View>
        ) : (
          filteredPartners.map((centre) => {
            const img = getPartnerImg(centre);
            const minPrice = getMinPrice(centre.id);
            const partnerSvcCount = services.filter(s => s.partnerId === centre.id).length;
            return (
              <View key={centre.id} style={s.centreCard}>
                <View style={s.centreImgWrap}>
                  <Image source={{ uri: img }} style={s.centreImg} />
                  <TouchableOpacity style={s.heartBtn} onPress={() => toggleLike(centre.id)}>
                    <IconHeart size={14} color={likedCentres.includes(centre.id) ? '#FF4D6D' : '#fff'} filled={likedCentres.includes(centre.id)} />
                  </TouchableOpacity>
                </View>
                <View style={s.centreInfo}>
                  <Text style={s.centreName}>{centre.name}</Text>
                  <View style={s.centreMetaRow}>
                    <IconStar size={12} />
                    <Text style={s.centreRating}>{centre.rating > 0 ? centre.rating.toFixed(1) : '4.5'}</Text>
                    <Text style={s.centreReviews}>({centre.reviewCount > 0 ? centre.reviewCount : '—'})</Text>
                    <Text style={s.centreDotSep}>·</Text>
                    <IconPin size={11} color={colors.t2} />
                    <Text style={s.centreLocation}>
                      {centre.area}, {centre.city}{centre.distanceLabel ? ` · ${centre.distanceLabel}` : ''}
                    </Text>
                  </View>
                  <View style={s.tagRow}>
                    {partnerSvcCount > 0 && (
                      <View style={s.tag}><Text style={s.tagText}>{partnerSvcCount} services</Text></View>
                    )}
                    <View style={s.tag}><Text style={s.tagText}>Expert Therapists</Text></View>
                    <View style={s.tag}><Text style={s.tagText}>Hygienic & Safe</Text></View>
                  </View>
                  <View style={s.centreFooter}>
                    <View>
                      {minPrice && <Text style={s.centreFromLabel}>From</Text>}
                      {minPrice && <Text style={s.centrePrice}>{minPrice}</Text>}
                    </View>
                    <TouchableOpacity style={s.viewServicesBtn}>
                      <Text style={s.viewServicesBtnText}>View Services</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* ── Trust Strip ── */}
        <View style={s.trustStrip}>
          {TRUST.map((t) => (
            <View key={t.label} style={s.trustItem}>
              <View style={s.trustIcon}>
                {t.icon === 'shield' && <IconShield size={18} color={colors.accent} />}
                {t.icon === 'check' && <IconCheck size={18} color={colors.accent} />}
                {t.icon === 'bolt' && <IconBolt size={18} color={colors.accent} />}
                {t.icon === 'star' && <IconStar size={18} color={colors.accent} />}
                {t.icon === 'clock' && <Text style={{ fontSize: 16 }}>🕐</Text>}
              </View>
              <Text style={s.trustLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  scroll: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: '#fff', letterSpacing: 0.2 },
  headerSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },

  // Hero
  heroCard: { width: width, borderRadius: 0, overflow: 'hidden', height: 220 },
  heroImg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  heroContent: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  heroKicker: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { fontFamily: fonts.sansBold, fontSize: 26, color: '#fff', lineHeight: 30 },
  heroTitleAccent: { fontFamily: fonts.sansBold, fontSize: 26, color: colors.accent, lineHeight: 30, marginBottom: 8 },
  heroBody: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 20, paddingHorizontal: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 18, backgroundColor: colors.accent },

  // Section titles
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginBottom: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  viewAll: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },

  // Service Type Cards
  serviceTypeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24, flexWrap: 'wrap' },
  typeCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, borderWidth: 1, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)',
    minWidth: 100,
  },
  typeCardActive: { backgroundColor: 'rgba(61,255,84,0.08)', borderColor: 'rgba(61,255,84,0.30)' },
  typeCardGreen: { backgroundColor: 'rgba(61,255,84,0.06)', borderColor: 'rgba(61,255,84,0.22)' },
  typeCardPurple: { backgroundColor: 'rgba(155,93,229,0.08)', borderColor: 'rgba(155,93,229,0.25)' },
  typeIconWrap: {
    width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  typeIconActive: { borderColor: 'rgba(61,255,84,0.35)', backgroundColor: 'rgba(61,255,84,0.12)' },
  typeIconPurple: { borderColor: 'rgba(155,93,229,0.35)', backgroundColor: 'rgba(155,93,229,0.12)' },
  typeEmoji: { fontSize: 16 },
  typeName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff', marginBottom: 2 },
  typeDesc: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2, lineHeight: 13 },

  // Empty state
  emptyBox: {
    marginHorizontal: 16, marginBottom: 20, paddingVertical: 28, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', alignItems: 'center',
  },
  emptyText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', marginBottom: 6 },
  emptySubText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, textAlign: 'center' },

  // Popular Services
  servicesScroll: { paddingLeft: 16, paddingRight: 8, gap: 10 },
  svcCard: {
    width: 130, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  svcImg: { width: 130, height: 110 },
  svcInfo: { padding: 10 },
  svcName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff', lineHeight: 16, marginBottom: 4 },
  svcMeta: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  svcDot: { color: colors.t3 },
  svcPrice: { fontFamily: fonts.sansBold, color: colors.accent },

  // Spa Centre Cards
  centreCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden', flexDirection: 'row',
  },
  centreImgWrap: { width: 100, position: 'relative' },
  centreImg: { width: 100, height: '100%' },
  discountBadge: {
    position: 'absolute', top: 8, left: 0,
    backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
  },
  discountText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#060606', letterSpacing: 0.3 },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  centreInfo: { flex: 1, padding: 12 },
  centreName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 5 },
  centreMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap' },
  centreRating: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.star, marginLeft: 2 },
  centreReviews: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  centreDotSep: { color: colors.t3, fontSize: 10 },
  centreLocation: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  tag: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  tagText: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  centreFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centreFromLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  centrePrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  viewServicesBtn: {
    backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm,
  },
  viewServicesBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#060606' },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 14, paddingHorizontal: 6,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontFamily: fonts.sans, fontSize: 8, color: colors.t2, textAlign: 'center', lineHeight: 11 },
});
