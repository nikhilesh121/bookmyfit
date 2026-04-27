import { useState, useEffect, useRef } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Image, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import {
  IconArrowLeft, IconStar, IconPin, IconHeart, IconChevronRight,
  IconShield, IconCheck, IconBuilding, IconHeadphones, IconSearch, IconCart,
} from '../components/Icons';

const { width: W } = Dimensions.get('window');

// API base
const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3003';

// Warm spa image map by partner name
const SPA_IMAGES: Record<string, string> = {
  'serenity': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
  'royal': 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&q=80',
  'bliss': 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=600&q=80',
  'zen': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
};
const SPA_FALLBACKS = [
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&q=80',
  'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=600&q=80',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
];

function getPartnerImage(partner: any, index: number): string {
  if (partner.photos && partner.photos.length > 0) return partner.photos[0];
  const nameLower = (partner.name || '').toLowerCase();
  for (const key of Object.keys(SPA_IMAGES)) {
    if (nameLower.includes(key)) return SPA_IMAGES[key];
  }
  return SPA_FALLBACKS[index % SPA_FALLBACKS.length];
}

// Static hero slides
const HERO_SLIDES = [
  {
    uri: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80',
    kicker: 'SELF CARE IS HEALTH CARE',
    title: 'Relax Your Body',
    titleAccent: 'Refresh Your Mind',
    subtitle: 'Premium spa experiences for your well-being.',
  },
  {
    uri: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80',
    kicker: 'PROFESSIONAL CARE',
    title: 'Expert Therapists',
    titleAccent: 'Near You',
    subtitle: 'Certified professionals, premium products, peaceful spaces',
  },
];

// Static popular services with warm spa images
const STATIC_SERVICES = [
  { id: 's1', name: 'Full Body Massage', durationMinutes: 60, price: 1299, imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
  { id: 's2', name: 'Aroma Therapy', durationMinutes: 60, price: 999, imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80' },
  { id: 's3', name: 'Deep Tissue Massage', durationMinutes: 60, price: 1599, imageUrl: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80' },
  { id: 's4', name: 'Body Scrub & Polish', durationMinutes: 75, price: 1199, imageUrl: 'https://images.unsplash.com/photo-1610337673044-720471f83677?w=400&q=80' },
  { id: 's5', name: 'Foot Reflexology', durationMinutes: 45, price: 699, imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { id: 's6', name: 'Hot Stone Therapy', durationMinutes: 90, price: 1899, imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80' },
  { id: 's7', name: 'Cupping Therapy', durationMinutes: 45, price: 799, imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80' },
  { id: 's8', name: 'Swedish Massage', durationMinutes: 60, price: 1099, imageUrl: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80' },
  { id: 's9', name: 'Sports Recovery', durationMinutes: 60, price: 1399, imageUrl: 'https://images.unsplash.com/photo-1571019614099-9fdcf8b4e43b?w=400&q=80' },
  { id: 's10', name: 'Home Full Body Massage', durationMinutes: 90, price: 1499, imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
];

type ApiPartner = {
  id: string; name: string; serviceType: string; city: string; area: string;
  rating: number; reviewCount: number; distanceLabel: string; photos: string[];
  discountPercent?: number;
};
type ApiService = {
  id: string; name: string; durationMinutes: number; price: number;
  imageUrl?: string; partnerId: string;
};

export default function WellnessScreen() {
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [services, setServices] = useState<ApiService[]>(STATIC_SERVICES);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'spa' | 'home'>('all');
  const heroRef = useRef<FlatList>(null);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/wellness/partners?page=1&limit=20`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/v1/wellness/services/all`).then(r => r.json()).catch(() => null),
    ]).then(([pRes, sRes]) => {
      const pts = pRes?.data || pRes;
      const svcs = sRes;
      if (Array.isArray(pts) && pts.length > 0) setPartners(pts);
      if (Array.isArray(svcs) && svcs.length > 0) setServices(svcs);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    heroTimer.current = setInterval(() => {
      setHeroIndex(i => {
        const next = (i + 1) % HERO_SLIDES.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, []);

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Get min price for a partner from services
  const getMinPrice = (partnerId: string): number | null => {
    const partnerServices = services.filter(s => s.partnerId === partnerId);
    if (partnerServices.length === 0) return null;
    return Math.min(...partnerServices.map(s => Number(s.price)));
  };

  // Static fallback partners for demo
  const displayPartners: ApiPartner[] = partners.length > 0 ? partners : [
    { id: 'p1', name: 'Serenity Spa & Wellness', serviceType: 'Spa', city: 'Mumbai', area: 'Bandra', rating: 4.6, reviewCount: 128, distanceLabel: '1.2 km', photos: [], discountPercent: 20 },
    { id: 'p2', name: 'The Royal Spa', serviceType: 'Massage', city: 'Mumbai', area: 'Andheri', rating: 4.4, reviewCount: 96, distanceLabel: '2.3 km', photos: [], discountPercent: 15 },
    { id: 'p3', name: 'Bliss Physio Clinic', serviceType: 'Physio', city: 'Mumbai', area: 'Juhu', rating: 4.5, reviewCount: 84, distanceLabel: '3.1 km', photos: [], discountPercent: 0 },
    { id: 'p4', name: 'Zen Wellness Studio', serviceType: 'Spa', city: 'Mumbai', area: 'Worli', rating: 4.7, reviewCount: 152, distanceLabel: '1.8 km', photos: [], discountPercent: 10 },
  ];

  const displayServices: ApiService[] = services.length > 0 ? services : STATIC_SERVICES;

  const filteredPartners = activeFilter === 'all'
    ? displayPartners
    : displayPartners.filter(p => {
        const type = (p.serviceType || '').toLowerCase();
        if (activeFilter === 'home') return type === 'home' || type.includes('home');
        return type !== 'home' && !type.includes('home');
      });

  // Partner tags based on service type
  const getPartnerTags = (partner: ApiPartner) => {
    const type = partner.serviceType?.toLowerCase() || 'spa';
    if (type === 'physio') return ['Physiotherapy', 'Rehab', 'Sports'];
    if (type === 'massage') return ['Massage', 'Relaxation', 'Deep Tissue'];
    if (type === 'home') return ['Home Service', 'At-Home', 'Private'];
    return ['Spa', 'Relaxation', 'Luxury'];
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Spa & Recovery</Text>
            <Text style={s.headerSubtitle}>Relax. Rejuvenate. Refresh.</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <IconSearch size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIcon}>
              <IconCart size={18} color="#fff" />
              <View style={s.cartBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Slider */}
        <View style={s.heroContainer}>
          <FlatList
            ref={heroRef}
            data={HERO_SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / W);
              setHeroIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={s.heroSlide}>
                <Image source={{ uri: item.uri }} style={s.heroImage} />
                <View style={s.heroOverlay} />
                <View style={s.heroContent}>
                  <Text style={s.heroKicker}>{item.kicker}</Text>
                  <Text style={s.heroTitle}>{item.title}</Text>
                  <Text style={s.heroTitleAccent}>{item.titleAccent}</Text>
                  <Text style={s.heroSub}>{item.subtitle}</Text>
                </View>
              </View>
            )}
          />
          {/* Dots */}
          <View style={s.heroDots}>
            {HERO_SLIDES.map((_, i) => (
              <View key={i} style={[s.heroDot, i === heroIndex && s.heroDotActive]} />
            ))}
          </View>
        </View>

        {/* Choose Your Service Type */}
        <Text style={s.sectionTitle}>Choose Your Service Type</Text>
        <View style={s.serviceTypeRow}>
          {/* Spa Centre */}
          <TouchableOpacity style={s.serviceTypeCard} activeOpacity={0.85}>
            <View style={[s.serviceTypeIconBox, { backgroundColor: 'rgba(0,212,106,0.08)' }]}>
              <IconBuilding size={24} color={colors.accent} />
            </View>
            <Text style={s.serviceTypeName}>Spa Centre</Text>
            <Text style={s.serviceTypeSub}>Visit our partner spa centres</Text>
            <View style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <IconChevronRight size={14} color={colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Home Service */}
          <TouchableOpacity style={[s.serviceTypeCard, s.serviceTypeCardPurple]} activeOpacity={0.85}>
            <View style={[s.serviceTypeIconBox, { backgroundColor: 'rgba(130,80,255,0.12)' }]}>
              <IconShield size={24} color="#8250FF" />
            </View>
            <Text style={s.serviceTypeName}>Home Service</Text>
            <Text style={s.serviceTypeSub}>Professional spa at your home</Text>
            <View style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <IconChevronRight size={14} color="#8250FF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Popular Spa Services */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Popular Spa Services</Text>
          <TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <FlatList
          data={displayServices}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={s.servicesScroll}
          renderItem={({ item: svc }) => {
            const imgUri = svc.imageUrl || STATIC_SERVICES.find(s => s.name === svc.name)?.imageUrl || STATIC_SERVICES[0].imageUrl;
            return (
              <TouchableOpacity style={s.svcCard} activeOpacity={0.85}>
                <Image source={{ uri: imgUri }} style={s.svcImage} />
                <View style={s.svcInfo}>
                  <Text style={s.svcName} numberOfLines={1}>{svc.name}</Text>
                  <Text style={s.svcMeta}>{svc.durationMinutes} Min • ₹{Number(svc.price).toLocaleString('en-IN')}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Filter Tabs */}
        <View style={s.filterTabs}>
          {(['all', 'spa', 'home'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, activeFilter === f && s.filterTabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[s.filterTabText, activeFilter === f && s.filterTabTextActive]}>
                {f === 'all' ? 'All' : f === 'spa' ? 'Spa Centre' : 'Home Service'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Spa Centres */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Top Spa Centres Near You</Text>
          <TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : (
          filteredPartners.map((partner, idx) => {
            const minPrice = getMinPrice(partner.id);
            const imgUri = getPartnerImage(partner, idx);
            const liked = likedIds.has(partner.id);
            const tags = getPartnerTags(partner);
            return (
              <TouchableOpacity
                key={partner.id}
                style={s.partnerCard}
                activeOpacity={0.88}
                onPress={() => router.push(`/wellness/${partner.id}` as any)}
              >
                {/* Left image */}
                <View style={s.partnerImgWrapper}>
                  <Image source={{ uri: imgUri }} style={s.partnerImg} />
                  {/* Discount badge */}
                  {!!partner.discountPercent && partner.discountPercent > 0 && (
                    <View style={s.discountBadge}>
                      <Text style={s.discountBadgeText}>{partner.discountPercent}% OFF</Text>
                    </View>
                  )}
                  {/* Heart */}
                  <TouchableOpacity style={s.heartBtn} onPress={() => toggleLike(partner.id)}>
                    <IconHeart size={14} color={liked ? '#ff4d6d' : '#fff'} filled={liked} />
                  </TouchableOpacity>
                </View>

                {/* Right info */}
                <View style={s.partnerInfo}>
                  {/* Row 1: name + price */}
                  <View style={s.partnerRow1}>
                    <Text style={s.partnerName} numberOfLines={1}>{partner.name}</Text>
                    <View style={s.priceBlock}>
                      <Text style={s.priceFrom}>From</Text>
                      <Text style={s.priceVal}>{minPrice ? `₹${Number(minPrice).toLocaleString('en-IN')}` : '₹999'}</Text>
                    </View>
                  </View>

                  {/* Row 2: rating */}
                  <View style={s.ratingRow}>
                    <IconStar size={12} color={colors.star} />
                    <Text style={s.ratingText}>{partner.rating?.toFixed(1) || '4.5'}</Text>
                    <Text style={s.reviewCount}>({partner.reviewCount || 0} reviews)</Text>
                  </View>

                  {/* Row 3: location */}
                  <View style={s.locationRow}>
                    <IconPin size={12} color={colors.t2} />
                    <Text style={s.locationText}>{partner.area}, {partner.city}{partner.distanceLabel ? ` • ${partner.distanceLabel}` : ''}</Text>
                  </View>

                  {/* Row 4: tags */}
                  <View style={s.tagsRow}>
                    {tags.slice(0, 3).map((tag, ti) => (
                      <View key={ti} style={s.tagPill}>
                        <Text style={s.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Row 5: View Services button */}
                  <View style={s.viewRow}>
                    <TouchableOpacity
                      style={s.viewBtn}
                      onPress={() => router.push(`/wellness/${partner.id}` as any)}
                    >
                      <Text style={s.viewBtnText}>View Services</Text>
                      <IconChevronRight size={12} color="#060606" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Trust Strip */}
        <View style={s.trustStrip}>
          {[
            { icon: 'shield', label: 'Verified Spa Partners' },
            { icon: 'check', label: 'Trained & Certified' },
            { icon: 'shield', label: 'Hygienic & Safe' },
            { icon: 'bolt', label: 'Easy Booking' },
            { icon: 'headphones', label: '24/7 Support' },
          ].map((item, i) => (
            <View key={i} style={s.trustItem}>
              <View style={s.trustIconBox}>
                <IconCheck size={12} color={colors.accent} />
              </View>
              <Text style={s.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  headerSubtitle: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },

  // Hero
  heroContainer: { width: W, height: 220, marginBottom: 24 },
  heroSlide: { width: W, height: 220, overflow: 'hidden' },
  heroImage: { width: W, height: 220, resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  heroContent: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  heroKicker: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', lineHeight: 30 },
  heroTitleAccent: { fontFamily: fonts.serif, fontSize: 26, color: colors.accent, lineHeight: 30, marginBottom: 8 },
  heroSub: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -18, marginBottom: 8 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroDotActive: { backgroundColor: colors.accent, width: 18 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  seeAll: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.accent },

  // Filter tabs
  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16, marginTop: 4 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: { backgroundColor: 'rgba(0,212,106,0.15)', borderColor: 'rgba(0,212,106,0.4)' },
  filterTabText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t2 },
  filterTabTextActive: { color: colors.accent },

  // Service Type cards — side-by-side
  serviceTypeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 28 },
  serviceTypeCard: {
    flex: 1, gap: 4,
    backgroundColor: 'rgba(0,212,106,0.05)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.3)',
    borderRadius: 16, padding: 16,
  },
  serviceTypeCardPurple: {
    backgroundColor: 'rgba(130,80,255,0.06)', borderColor: 'rgba(130,80,255,0.3)',
  },
  serviceTypeIconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  serviceTypeText: { flex: 1 },
  serviceTypeName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 2 },
  serviceTypeSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  // Popular Services scroll
  servicesScroll: { paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  svcCard: {
    width: 130, borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  svcImage: { width: 130, height: 110, resizeMode: 'cover' },
  svcInfo: { padding: 8 },
  svcName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff', marginBottom: 3 },
  svcMeta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  // Partner cards
  partnerCard: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden',
    height: 155,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  partnerImgWrapper: { width: 120, height: 155, position: 'relative' },
  partnerImg: { width: 120, height: 155, resizeMode: 'cover' },
  discountBadge: {
    position: 'absolute', top: 0, left: 0,
    backgroundColor: '#00D46A', paddingHorizontal: 6, paddingVertical: 3,
    borderBottomRightRadius: 8,
  },
  discountBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#060606' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },

  partnerInfo: { flex: 1, padding: 12, gap: 5 },
  partnerRow1: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  partnerName: { flex: 1, fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  priceBlock: { alignItems: 'flex-end' },
  priceFrom: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  priceVal: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.star },
  reviewCount: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },

  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tagPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },

  viewRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00D46A', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#060606' },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 16,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 16, gap: 10, justifyContent: 'space-around',
  },
  trustItem: { alignItems: 'center', gap: 6, width: '18%' },
  trustIconBox: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,212,106,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2, textAlign: 'center' },
});
