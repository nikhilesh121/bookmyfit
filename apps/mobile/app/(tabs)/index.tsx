import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ImageBackground, FlatList, Dimensions, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius } from '../../theme/brand';
import {
  IconBell, IconPin, IconStar, IconChevronDown,
  IconBolt, IconShield, IconHeadphones, IconPercent,
} from '../../components/Icons';
import { API_BASE } from '../../lib/api';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Location from 'expo-location';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 44;

// ── Category icons ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',      label: 'All Gyms',  color: colors.accent,    bg: colors.accentSoft,            icon: 'dumbbell'  },
  { id: 'strength', label: 'Strength',  color: '#FB923C',         bg: 'rgba(251,146,60,0.15)',       icon: 'strength'  },
  { id: 'cardio',   label: 'Cardio',    color: '#F43F5E',         bg: 'rgba(244,63,94,0.15)',        icon: 'cardio'    },
  { id: 'yoga',     label: 'Yoga',      color: '#22D3EE',         bg: 'rgba(34,211,238,0.15)',       icon: 'yoga'      },
  { id: 'crossfit', label: 'CrossFit',  color: '#A78BFA',         bg: 'rgba(167,139,250,0.15)',      icon: 'crossfit'  },
  { id: 'hiit',     label: 'HIIT',      color: '#FBBF24',         bg: 'rgba(251,191,36,0.15)',       icon: 'bolt'      },
];

function CatIcon({ type, size, color }: { type: string; size: number; color: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'dumbbell')  return <Svg {...p}><Path d="M6.5 6.5h11M6.5 17.5h11M2 10v4M22 10v4M5 8v8M19 8v8" /></Svg>;
  if (type === 'strength')  return <Svg {...p}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={color} /></Svg>;
  if (type === 'cardio')    return <Svg {...p}><Path d="M3 12h3l3-9 3 18 3-9h3" /></Svg>;
  if (type === 'yoga')      return <Svg {...p}><Circle cx="12" cy="5" r="2" /><Path d="M12 7v4M8 11c0 2 1.5 4 4 4s4-2 4-4M9 21l3-6 3 6" /></Svg>;
  if (type === 'crossfit')  return <Svg {...p}><Path d="M17 3l-5 5-5-5M17 21l-5-5-5 5M3 7l5 5-5 5M21 7l-5 5 5 5" /></Svg>;
  return <Svg {...p}><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>; // bolt
}

// ── Fallback config (mirrors server defaults) ────────────────────────────────
const FALLBACK_CONFIG = {
  sections: [
    {
      id: 'hero', type: 'hero', title: 'Hero Banner', visible: true, order: 0,
      slides: [
        { imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80', headline: 'Make Every Rep', headlineAccent: 'Count!', sub: 'Find the best gyms near you\nand book your pass instantly.', cta: 'Explore Gyms', ctaRoute: '/gyms' },
        { imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80', headline: 'Find Your Perfect', headlineAccent: 'Gym Today!', sub: 'Partner gyms across the city,\none subscription covers all.', cta: 'Browse Gyms', ctaRoute: '/gyms' },
        { imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80', headline: 'No Long', headlineAccent: 'Contracts!', sub: 'Flexible passes — daily, weekly\nor monthly. Your choice.', cta: 'View Plans', ctaRoute: '/plans' },
      ],
    },
    { id: 'categories', type: 'categories', title: 'Browse by Category', visible: true, order: 1 },
    {
      id: 'featured_gyms', type: 'featured_gyms', title: 'Featured Gyms', visible: true, order: 2,
      gyms: [
        { id: 'c5b25fd2-c918-4bf4-a7c5-35170f0155b1', name: "Gold's Gym Bhubaneswar",      city: 'Bhubaneswar', rating: 4.7, images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'], dayPassPrice: 199 },
        { id: '554d5de4-38c0-4b87-a2f4-51e0124e859f', name: 'Anytime Fitness Bhubaneswar', city: 'Bhubaneswar', rating: 4.5, images: ['https://images.unsplash.com/photo-1532384661954-a0e26f4f065c?w=600&q=80'], dayPassPrice: 149 },
        { id: 'bf67d2fc-4b70-43e3-93c4-da533e5caa09', name: 'Cult.fit Bhubaneswar',        city: 'Bhubaneswar', rating: 4.8, images: ['https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=80'], dayPassPrice: 99  },
        { id: '547b28de-54cf-4f3a-a036-c1f9294066e6', name: 'CrossFit Bhubaneswar',        city: 'Bhubaneswar', rating: 4.6, images: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80'], dayPassPrice: 199 },
      ],
    },
    {
      id: 'products', type: 'products', title: 'Shop Products', visible: true, order: 3,
      products: [
        { id: 'p1', name: 'Whey Protein 2kg', price: 2499, mrp: 3299, images: ['https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&q=80'], category: 'supplements' },
        { id: 'p2', name: 'Resistance Bands Set', price: 699,  mrp: 999,  images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&q=80'], category: 'accessories' },
        { id: 'p3', name: 'Gym Gloves Pro',    price: 499,  mrp: 799,  images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80'], category: 'accessories' },
        { id: 'p4', name: 'BCAA Energy 300g',  price: 1299, mrp: 1799, images: ['https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=300&q=80'], category: 'supplements' },
        { id: 'p5', name: 'DryFit Tee',        price: 799,  mrp: 1299, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80'], category: 'apparel' },
      ],
    },
    { id: 'trust', type: 'trust', title: 'Why BookMyFit?', visible: true, order: 4 },
    { id: 'testimonials', type: 'testimonials', title: 'What Members Say', visible: true, order: 5 },
  ],
};

const TESTIMONIALS = [
  { id: '1', name: 'Priya S.', city: 'Bhubaneswar', rating: 5, avatar: 'P', text: 'Best way to stay fit in the city. Multi Gym pass lets me try a new gym every week!' },
  { id: '2', name: 'Rahul M.', city: 'Bhubaneswar', rating: 5, avatar: 'R', text: 'Day passes are perfect. No commitment, just book and walk in!' },
  { id: '3', name: 'Ananya K.', city: 'Cuttack',      rating: 5, avatar: 'A', text: 'QR check-in is seamless. Love the Same Gym pass for my daily workouts.' },
];

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ h, w, br = 12, style }: { h: number; w?: number | string; br?: number; style?: any }) {
  return <View style={[{ height: h, width: w || '100%', borderRadius: br, backgroundColor: 'rgba(255,255,255,0.06)' }, style]} />;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const CITIES = ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur', 'Berhampur', 'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata'];

export default function Home() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Bhubaneswar');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroRef = useRef<FlatList>(null);

  useEffect(() => {
    // Load saved city first
    AsyncStorage.getItem('bmf_city').then((saved) => {
      if (saved) setCity(saved);
      else {
        // Auto-detect from GPS
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            const c = geo?.city || geo?.subregion || geo?.region || 'Bhubaneswar';
            setCity(c);
          } catch {}
        })();
      }
    });
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/homepage/config`)
      .then((r) => r.json())
      .then((data: any) => setConfig(data?.sections ? data : FALLBACK_CONFIG))
      .catch(() => setConfig(FALLBACK_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  const sections: any[] = config
    ? [...(config.sections || [])].filter((s) => s.visible).sort((a: any, b: any) => a.order - b.order)
    : [];

  const heroSection = sections.find((s) => s.type === 'hero');
  const slides = heroSection?.slides || FALLBACK_CONFIG.sections[0].slides;

  // Auto-advance hero
  useEffect(() => {
    if (!slides?.length) return;
    const t = setInterval(() => {
      setHeroIdx((i) => {
        const next = (i + 1) % slides.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [slides?.length]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <View style={s.topBar}>
            <View style={s.locationRow}>
              <IconPin size={12} color={colors.accent} />
              <Sk h={13} br={6} style={{ width: 80 }} />
            </View>
          </View>
          <Sk h={200} br={20} style={{ marginBottom: 20 }} />
          <Sk h={60} style={{ marginBottom: 16 }} />
          <Sk h={160} style={{ marginBottom: 16 }} />
          <Sk h={180} style={{ marginBottom: 16 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.locationRow} onPress={() => setShowCityPicker(true)}>
            <IconPin size={12} color={colors.accent} />
            <Text style={s.locationText}>{city}</Text>
            <IconChevronDown size={11} color={colors.t2} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications' as any)}>
              <IconBell size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── City Picker Modal ── */}
        <Modal visible={showCityPicker} transparent animationType="slide" onRequestClose={() => setShowCityPicker(false)}>
          <Pressable style={s.modalOverlay} onPress={() => setShowCityPicker(false)}>
            <View style={s.cityPickerSheet}>
              <View style={s.cityPickerHandle} />
              <Text style={s.cityPickerTitle}>Select City</Text>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.cityRow, city === c && s.cityRowActive]}
                  onPress={() => {
                    setCity(c);
                    AsyncStorage.setItem('bmf_city', c);
                    setShowCityPicker(false);
                  }}
                >
                  <IconPin size={13} color={city === c ? colors.accent : colors.t2} />
                  <Text style={[s.cityRowText, city === c && { color: colors.accent }]}>{c}</Text>
                  {city === c && <View style={s.cityActiveDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* ── Sections (dynamic) ── */}
        {sections.map((section) => {
          switch (section.type) {
            case 'hero':       return <HeroSection key={section.id} slides={slides} heroIdx={heroIdx} setHeroIdx={setHeroIdx} heroRef={heroRef} />;
            case 'categories': return <CategoriesSection key={section.id} title={section.title} />;
            case 'featured_gyms': return <FeaturedGymsSection key={section.id} section={section} />;
            case 'products':   return <ProductsSection key={section.id} section={section} />;
            case 'trust':      return <TrustSection key={section.id} />;
            case 'testimonials': return <TestimonialsSection key={section.id} />;
            default: return null;
          }
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function hour() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Section components ────────────────────────────────────────────────────────

function HeroSection({ slides, heroIdx, setHeroIdx, heroRef }: any) {
  return (
    <View style={s.heroWrap}>
      <FlatList
        ref={heroRef}
        data={slides}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_: any, i: number) => String(i)}
        onMomentumScrollEnd={(e: any) => setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_W))}
        snapToInterval={CARD_W}
        decelerationRate="fast"
        renderItem={({ item }: any) => (
          <ImageBackground source={{ uri: item.imageUrl }} style={s.heroSlide} imageStyle={{ borderRadius: radius.xl }}>
            <View style={s.heroDark} />
            <View style={s.heroContent}>
              <Text style={s.heroKicker}>BOOKMY<Text style={{ color: colors.accent }}>FIT</Text></Text>
              <Text style={s.heroHeadline}>{item.headline}</Text>
              <Text style={s.heroAccent}>{item.headlineAccent}</Text>
              <Text style={s.heroSub}>{item.sub}</Text>
              <TouchableOpacity style={s.heroCta} onPress={() => router.push((item.ctaRoute || '/gyms') as any)}>
                <Text style={s.heroCtaText}>{item.cta}</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        )}
      />
      <View style={s.heroDots}>
        {slides.map((_: any, i: number) => <View key={i} style={[s.dot, i === heroIdx && s.dotActive]} />)}
      </View>
    </View>
  );
}

function CategoriesSection({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionRow title={title} onViewAll={() => router.push('/gyms' as any)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={s.catItem} onPress={() => router.push(`/gyms?category=${cat.id}` as any)}>
            <View style={[s.catCircle, { backgroundColor: cat.bg }]}>
              <CatIcon type={cat.icon} size={22} color={cat.color} />
            </View>
            <Text style={[s.catLabel, { color: cat.color }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function FeaturedGymsSection({ section }: { section: any }) {
  const gyms: any[] = section.gyms || [];
  if (!gyms.length) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionRow title={section.title || 'Featured Gyms'} onViewAll={() => router.push('/gyms' as any)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {gyms.map((g: any, idx: number) => {
          const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80';
          const name = (g.name || 'Gym').split(' ').slice(0, 2).join(' ');
          const gid = g.id || g._id;
          return (
            <TouchableOpacity key={gid} style={s.gymFeatCard} onPress={() => router.push({
              pathname: `/gym/${gid}` as any,
              params: {
                fallbackName: g.name || '',
                fallbackAddress: g.city || '',
                fallbackRating: String(g.rating || 0),
                fallbackTier: 'premium',
              },
            })} activeOpacity={0.85}>
              <ImageBackground source={{ uri: img }} style={s.gymFeatImg} imageStyle={{ borderRadius: radius.xl }}>
                <View style={s.gymFeatDark} />
                <Text style={s.gymFeatRank}>#{idx + 1}</Text>
                <View style={s.gymFeatBottom}>
                  {g.rating ? (
                    <View style={s.gymFeatRating}>
                      <IconStar size={10} color="#FBBF24" />
                      <Text style={s.gymFeatRatingText}>{Number(g.rating).toFixed(1)}</Text>
                    </View>
                  ) : null}
                  <Text style={s.gymFeatName} numberOfLines={1}>{name}</Text>
                  <Text style={s.gymFeatCity} numberOfLines={1}>{g.city || ''}</Text>
                  {g.dayPassPrice ? (
                    <Text style={s.gymFeatPrice}>From ₹{g.dayPassPrice}/day</Text>
                  ) : null}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProductsSection({ section }: { section: any }) {
  const products: any[] = section.products || [];
  if (!products.length) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionRow title={section.title || 'Shop Products'} onViewAll={() => router.push('/(tabs)/store' as any)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {products.map((p: any) => {
          const img = p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&q=80';
          const hasDiscount = p.mrp && Number(p.mrp) > Number(p.price);
          return (
            <TouchableOpacity key={p.id} style={s.productCard} onPress={() => router.push(`/product/${p.id}` as any)} activeOpacity={0.88}>
              <ImageBackground source={{ uri: img }} style={s.productImg} imageStyle={{ borderRadius: radius.lg, resizeMode: 'cover' }}>
                {hasDiscount && (
                  <View style={s.productDiscount}>
                    <Text style={s.productDiscountText}>{Math.round((1 - p.price / p.mrp) * 100)}% OFF</Text>
                  </View>
                )}
              </ImageBackground>
              <View style={s.productBody}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <View style={s.productPriceRow}>
                  <Text style={s.productPrice}>₹{Number(p.price).toLocaleString('en-IN')}</Text>
                  {hasDiscount && <Text style={s.productMrp}>₹{Number(p.mrp).toLocaleString('en-IN')}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TrustSection() {
  const items = [
    { icon: 'percent',    label: 'Best Prices',    sub: 'Guaranteed' },
    { icon: 'shield',     label: 'Verified Gyms',  sub: 'Quality Assured' },
    { icon: 'bolt',       label: 'Easy Booking',   sub: 'In Few Clicks' },
    { icon: 'headphones', label: '24/7 Support',   sub: "We're Here" },
  ];
  return (
    <View style={s.trustRow}>
      {items.map((item) => (
        <View key={item.label} style={s.trustItem}>
          <View style={s.trustIcon}>
            {item.icon === 'percent'    && <IconPercent    size={13} color={colors.accent} />}
            {item.icon === 'shield'     && <IconShield     size={13} color={colors.accent} />}
            {item.icon === 'bolt'       && <IconBolt       size={13} color={colors.accent} />}
            {item.icon === 'headphones' && <IconHeadphones size={13} color={colors.accent} />}
          </View>
          <Text style={s.trustLabel}>{item.label}</Text>
          <Text style={s.trustSub}>{item.sub}</Text>
        </View>
      ))}
    </View>
  );
}

function TestimonialsSection() {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionRow title="What Members Say" />
      <FlatList
        data={TESTIMONIALS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        keyExtractor={(t) => t.id}
        renderItem={({ item: t }) => (
          <View style={s.testimonialCard}>
            <Text style={s.testimonialText}>"{t.text}"</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <View style={s.avatarCircle}><Text style={s.avatarText}>{t.avatar}</Text></View>
              <View>
                <Text style={s.authorName}>{t.name}</Text>
                <Text style={s.authorCity}>{t.city}</Text>
              </View>
              <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: t.rating }).map((_, i) => <IconStar key={i} size={10} color="#FBBF24" />)}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function SectionRow({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={s.viewAll}>View All ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { paddingBottom: 40 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  greeting: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center' },

  // Logo
  logo: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5, paddingHorizontal: 20, marginBottom: 16 },
  logoDot: { color: colors.accent },

  // Hero
  heroWrap: { marginHorizontal: 20, marginBottom: 24 },
  heroSlide: { width: CARD_W, height: 200, justifyContent: 'flex-end' },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: radius.xl },
  heroContent: { padding: 18, gap: 2 },
  heroKicker: { fontFamily: fonts.sansBold, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 4 },
  heroHeadline: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', lineHeight: 30 },
  heroAccent:   { fontFamily: fonts.serif, fontSize: 26, color: colors.accent, lineHeight: 30, marginBottom: 6 },
  heroSub:  { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 17, marginBottom: 12 },
  heroCta:  { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, alignSelf: 'flex-start' },
  heroCtaText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#060606' },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 18, backgroundColor: colors.accent },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
  viewAll: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.accent },

  // Categories
  catItem:   { alignItems: 'center', gap: 6 },
  catCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  catLabel:  { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 0.3 },

  // Featured gyms
  gymFeatCard:   { width: 160, height: 200, borderRadius: radius.xl, overflow: 'hidden' },
  gymFeatImg:    { flex: 1, justifyContent: 'space-between' },
  gymFeatDark:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  gymFeatRank:   { fontFamily: fonts.sansBold, fontSize: 44, color: 'rgba(255,255,255,0.15)', padding: 8, lineHeight: 50 },
  gymFeatBottom: { padding: 12, gap: 2 },
  gymFeatRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  gymFeatRatingText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#FBBF24' },
  gymFeatName:   { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  gymFeatCity:   { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  gymFeatPrice:  { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent, marginTop: 2 },

  // Products
  productCard: { width: 148, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  productImg:  { width: 148, height: 130 },
  productBody: { padding: 10, gap: 4 },
  productDiscount: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  productDiscountText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#060606' },
  productName: { fontFamily: fonts.sansMedium, fontSize: 11, color: '#fff', lineHeight: 15 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productPrice: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  productMrp:  { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, textDecorationLine: 'line-through' },

  // Trust
  trustRow:  { flexDirection: 'row', marginHorizontal: 20, marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16 },
  trustItem: { flex: 1, alignItems: 'center', gap: 4 },
  trustIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(61,255,84,0.1)', borderWidth: 1, borderColor: 'rgba(61,255,84,0.18)', alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontFamily: fonts.sansBold, fontSize: 8, color: '#fff', textAlign: 'center' },
  trustSub:   { fontFamily: fonts.sans, fontSize: 7, color: colors.t2, textAlign: 'center' },

  // Testimonials
  testimonialCard: { width: W * 0.72, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16 },
  testimonialText: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18, fontStyle: 'italic' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(61,255,84,0.12)', borderWidth: 1, borderColor: 'rgba(61,255,84,0.22)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  authorName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  authorCity: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },

  // City picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  cityPickerSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cityPickerHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  cityPickerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', marginBottom: 16 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  cityRowActive: { borderBottomColor: colors.accentBorder },
  cityRowText: { fontFamily: fonts.sans, fontSize: 15, color: colors.t, flex: 1 },
  cityActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
