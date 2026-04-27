import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ImageBackground, ActivityIndicator, TextInput, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { colors, fonts, radius } from '../../theme/brand';
import {
  IconBell, IconSearch, IconMenu, IconStar, IconPin, IconHeart,
  IconFilter, IconChevronDown, IconDumbbell, IconBolt, IconShield,
  IconHeadphones, IconPercent,
} from '../../components/Icons';
import { gymsApi, getUser, API_BASE } from '../../lib/api';
import Svg, { Path, Circle, Ellipse, Rect, Line } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Fallback data ──────────────────────────────────────────────────────────
const FALLBACK_GYMS = [
  { id: '1', name: 'PowerZone Fitness', rating: 4.8, distance: '0.8 km', city: 'Bhubaneswar', amenities: ['Strength', 'Cardio'], img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80', discount: '20% OFF' },
  { id: '2', name: 'Iron Temple', rating: 4.6, distance: '2.1 km', city: 'Bhubaneswar', amenities: ['CrossFit', 'HIIT'], img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80', discount: null },
  { id: '3', name: 'Anytime Fitness', rating: 4.5, distance: '3.4 km', city: 'Bhubaneswar', amenities: ['Yoga', 'Strength'], img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80', discount: '15% OFF' },
  { id: '4', name: "Gold's Gym", rating: 4.7, distance: '1.2 km', city: 'Bhubaneswar', amenities: ['Strength', 'Cardio'], img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80', discount: null },
];
// Most visited is built dynamically from loaded gyms — no hardcoded IDs
const FALLBACK_IMG = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80',
];

// ── Category icons (inline SVG) ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: 'All Gyms', color: colors.accent, bg: colors.accentSoft, icon: 'dumbbell' },
  { id: 'strength', label: 'Strength', color: '#FB923C', bg: 'rgba(251,146,60,0.15)', icon: 'strength' },
  { id: 'cardio', label: 'Cardio', color: '#FB923C', bg: 'rgba(251,146,60,0.15)', icon: 'cardio' },
  { id: 'yoga', label: 'Yoga', color: '#22D3EE', bg: 'rgba(34,211,238,0.15)', icon: 'yoga' },
  { id: 'crossfit', label: 'CrossFit', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', icon: 'crossfit' },
  { id: 'more', label: 'More', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)', icon: 'more' },
];

function CategorySvgIcon({ type, size, color }: { type: string; size: number; color: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'dumbbell') return <Svg {...p}><Path d="M6.5 6.5h11M6.5 17.5h11M2 10v4M22 10v4M5 8v8M19 8v8" /></Svg>;
  if (type === 'strength') return <Svg {...p}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={color} /></Svg>;
  if (type === 'cardio') return <Svg {...p}><Path d="M3 12h3l3-9 3 18 3-9h3" /></Svg>;
  if (type === 'yoga') return <Svg {...p}><Circle cx="12" cy="5" r="2" /><Path d="M12 7v4M8 11c0 2 1.5 4 4 4s4-2 4-4M9 21l3-6 3 6" /></Svg>;
  if (type === 'crossfit') return <Svg {...p}><Path d="M17 3l-5 5-5-5M17 21l-5-5-5 5M3 7l5 5-5 5M21 7l-5 5 5 5" /></Svg>;
  // more — 3 dots
  return <Svg {...p}><Circle cx="5" cy="12" r="1.5" fill={color} stroke="none" /><Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" /><Circle cx="19" cy="12" r="1.5" fill={color} stroke="none" /></Svg>;
}

// ── Hero slides ─────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80', headline: 'Make Every Rep', headlineAccent: 'Count!', sub: 'Find the best gyms near you\nand book your pass instantly.', cta: 'Explore Gyms' },
  { img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', headline: 'Find Your Perfect', headlineAccent: 'Gym Today!', sub: 'Partner gyms across the city,\none subscription covers all.', cta: 'Browse Now' },
  { img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', headline: 'No Long', headlineAccent: 'Contracts!', sub: 'Flexible day passes, weekly\nor monthly — your choice.', cta: 'View Plans' },
];

function SkeletonRect({ h, style }: { h: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.06)' }, style]} />;
}

export default function Home() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [heroIdx, setHeroIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const heroRef = useRef<FlatList>(null);

  useEffect(() => {
    getUser().then((u) => { if (u?.name) setUserName(u.name.split(' ')[0]); }).catch(() => {});
  }, []);

  useEffect(() => {
    gymsApi.list({ page: 1 })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.gyms || data?.data || [];
        setGyms(list.length > 0 ? list : FALLBACK_GYMS);
      })
      .catch(() => setGyms(FALLBACK_GYMS))
      .finally(() => setLoading(false));
    // Fetch store products (public endpoint)
    fetch(`${API_BASE}/api/v1/store/products?limit=10`)
      .then(r => r.json())
      .then((d: any) => {
        const list = Array.isArray(d) ? d : d?.data || d?.products || [];
        if (list.length > 0) setProducts(list);
      })
      .catch(() => {});
  }, []);

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => {
      setHeroIdx((i) => {
        const next = (i + 1) % HERO_SLIDES.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const displayGyms = gyms.length > 0 ? gyms : FALLBACK_GYMS;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => {}}>
            <IconMenu size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.logo}>BookMyFit<Text style={s.logoDot}>.in</Text></Text>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications' as any)}>
            <IconBell size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Location + Search ── */}
        <View style={s.locSearchRow}>
          <TouchableOpacity style={s.locationPill}>
            <IconPin size={13} color={colors.accent} />
            <Text style={s.locationText}>{userName ? 'Bhubaneswar' : 'Select city'}</Text>
            <IconChevronDown size={13} color={colors.t2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBar} onPress={() => router.push('/(tabs)/explore')}>
            <IconSearch size={14} color={colors.t2} />
            <Text style={s.searchPlaceholder}>Search gyms, areas…</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero banner ── */}
        <View style={s.heroWrap}>
          <FlatList
            ref={heroRef}
            data={HERO_SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => {
              setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 44)));
            }}
            renderItem={({ item }) => (
              <ImageBackground
                source={{ uri: item.img }}
                style={s.heroSlide}
                imageStyle={{ borderRadius: radius.xl }}
              >
                <View style={s.heroDark} />
                <View style={s.heroContent}>
                  <Text style={s.heroHeadline}>{item.headline}</Text>
                  <Text style={s.heroHeadlineAccent}>{item.headlineAccent}</Text>
                  <Text style={s.heroSub}>{item.sub}</Text>
                  <TouchableOpacity style={s.heroCta} onPress={() => router.push('/(tabs)/explore')}>
                    <Text style={s.heroCtaText}>{item.cta}</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            )}
          />
          <View style={s.heroDots}>
            {HERO_SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === heroIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── Categories ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catsScroll} contentContainerStyle={s.catsContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={s.catItem}
              onPress={() => setActiveCategory(cat.id)}
            >
              <View style={[s.catCircle, { backgroundColor: cat.bg }, activeCategory === cat.id && { borderColor: cat.color, borderWidth: 2 }]}>
                <CategorySvgIcon type={cat.icon} size={22} color={cat.color} />
              </View>
              <Text style={[s.catLabel, activeCategory === cat.id && { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Most Visited ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Most Visited Gyms</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mostVisitedScroll} contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 10 }}>
          {displayGyms.slice(0, 3).map((g: any, idx: number) => {
            const gid = g.id || g._id;
            const gname = (g.name || 'Gym').split(' ').slice(0, 2).join(' ');
            const gimg = g.images?.[0] || g.coverImage || g.img || FALLBACK_IMG[idx % 3];
            return (
              <TouchableOpacity key={gid} style={s.mvCard} onPress={() => router.push(`/gym/${gid}` as any)} activeOpacity={0.85}>
                <ImageBackground source={{ uri: gimg }} style={s.mvPhoto} imageStyle={{ borderRadius: radius.xl }}>
                  <View style={s.mvDark} />
                  <Text style={s.mvRank}>#{idx + 1}</Text>
                  <Text style={s.mvName}>{gname}</Text>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Popular Gyms ── */}
        <View style={[s.sectionRow, { marginTop: 8 }]}>
          <Text style={s.sectionTitle}>Popular Gyms Near You</Text>
          <TouchableOpacity style={s.filterBtn}>
            <IconFilter size={13} color={colors.t2} />
            <Text style={s.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          [1, 2, 3].map((i) => <SkeletonRect key={i} h={100} style={{ marginBottom: 12 }} />)
        ) : (
          displayGyms.map((g: any) => {
            const name = g.name || g.gymName || 'Gym';
            const rating = g.rating || g.avgRating || '4.5';
            const distance = g.distance || (g.distanceKm ? `${g.distanceKm} km` : '');
            const city = g.city || g.location?.city || '';
            const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
            const amenities: string[] = g.amenities || g.tags || [];
            const discount = g.discount || null;
            const dayPassPrice = g.dayPassPrice || g.day_pass_price || '₹99';
            return (
              <TouchableOpacity
                key={g.id || g._id}
                style={s.gymCard}
                onPress={() => router.push(`/gym/${g.id || g._id}` as any)}
                activeOpacity={0.88}
              >
                {/* Thumbnail */}
                <ImageBackground source={{ uri: img }} style={s.gymThumb} imageStyle={{ borderRadius: radius.md }}>
                  {discount && (
                    <View style={s.discountBadge}>
                      <Text style={s.discountText}>{discount}</Text>
                    </View>
                  )}
                </ImageBackground>

                {/* Info */}
                <View style={s.gymInfo}>
                  <View style={s.gymTopRow}>
                    <Text style={s.gymName} numberOfLines={1}>{name}</Text>
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <IconHeart size={15} color={colors.t3} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.gymMetaRow}>
                    <IconStar size={11} color="rgba(255,205,55,0.9)" />
                    <Text style={s.ratingText}>{rating}</Text>
                    {!!(distance || city) && <>
                      <Text style={s.metaDivider}>·</Text>
                      <IconPin size={11} color={colors.t2} />
                      <Text style={s.metaText}>{distance || city}</Text>
                    </>}
                  </View>
                  {amenities.length > 0 && (
                    <View style={s.tagsRow}>
                      {amenities.slice(0, 2).map((tag: string) => (
                        <View key={tag} style={s.tag}><Text style={s.tagText}>{tag}</Text></View>
                      ))}
                    </View>
                  )}
                  <View style={s.gymCardFooter}>
                    <View>
                      <Text style={s.fromLabel}>From</Text>
                      <Text style={s.fromPrice}>{dayPassPrice}<Text style={s.fromPer}> /day</Text></Text>
                    </View>
                    <TouchableOpacity
                      style={s.viewPlansBtn}
                      onPress={() => router.push({ pathname: '/plans', params: { gymId: g.id || g._id, gymName: name } })}
                    >
                      <Text style={s.viewPlansBtnText}>View Plans</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Trust badges ── */}
        <View style={s.trustRow}>
          {[
            { icon: 'percent', label: 'Best Prices' },
            { icon: 'shield', label: 'Verified Gyms' },
            { icon: 'bolt', label: 'Easy Booking' },
            { icon: 'headphones', label: '24/7 Support' },
          ].map((item) => (
            <View key={item.label} style={s.trustItem}>
              <View style={s.trustIcon}>
                {item.icon === 'percent' && <IconPercent size={14} color={colors.accent} />}
                {item.icon === 'shield' && <IconShield size={14} color={colors.accent} />}
                {item.icon === 'bolt' && <IconBolt size={14} color={colors.accent} />}
                {item.icon === 'headphones' && <IconHeadphones size={14} color={colors.accent} />}
              </View>
              <Text style={s.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Testimonials */}
        <View style={[s.sectionRow, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>What members say</Text>
        </View>
        <FlatList
          data={[
            { id: '1', name: 'Priya S.', city: 'Bhubaneswar', rating: 5, text: 'Best way to stay fit in the city. Multi Gym pass lets me try a new gym every week!', avatar: 'P' },
            { id: '2', name: 'Rahul M.', city: 'Bhubaneswar', rating: 5, text: 'Day passes are perfect. No commitment, just book and walk in!', avatar: 'R' },
            { id: '3', name: 'Ananya K.', city: 'Cuttack', rating: 5, text: 'QR check-in is seamless. Love the Same Gym pass for my daily workouts.', avatar: 'A' },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
          snapToInterval={SCREEN_W * 0.75 + 12}
          decelerationRate="fast"
          renderItem={({ item: t }) => (
            <View style={s.testimonialCard}>
              <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <IconStar key={i} size={11} color="rgba(255,205,55,0.9)" />
                ))}
              </View>
              <Text style={s.testimonialText}>"{t.text}"</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>{t.avatar}</Text>
                </View>
                <View>
                  <Text style={s.authorName}>{t.name}</Text>
                  <Text style={s.authorCity}>{t.city}</Text>
                </View>
              </View>
            </View>
          )}
        />

        {/* ── Shop Products ── */}
        {products.length > 0 && (
          <>
            <View style={[s.sectionRow, { marginTop: 24 }]}>
              <Text style={s.sectionTitle}>Shop Products</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/store' as any)}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id || item._id}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
              renderItem={({ item: p }) => {
                const img = p.imageUrl || p.image || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&q=80';
                const name = p.name || 'Product';
                const price = p.price ? `Rs.${Number(p.price).toLocaleString()}` : '';
                const originalPrice = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : null;
                return (
                  <TouchableOpacity
                    style={s.productCard}
                    onPress={() => router.push(`/product/${p.id || p._id}` as any)}
                    activeOpacity={0.88}
                  >
                    <ImageBackground source={{ uri: img }} style={s.productImg} imageStyle={{ borderRadius: radius.md }} />
                    <View style={s.productBody}>
                      <Text style={s.productName} numberOfLines={2}>{name}</Text>
                      <View style={s.productPriceRow}>
                        <Text style={s.productPrice}>{price}</Text>
                        {originalPrice && (
                          <Text style={s.productOriginal}>Rs.{Number(originalPrice).toLocaleString()}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  scroll: { flex: 1 },
  container: { paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', letterSpacing: -0.5 },
  logoDot: { color: colors.accent },

  // Location + search
  locSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, marginBottom: 16,
  },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 9,
  },
  locationText: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  searchPlaceholder: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.35)' },

  // Hero
  heroWrap: { paddingHorizontal: 20, marginBottom: 6 },
  heroSlide: {
    width: SCREEN_W - 40, height: 210,
    borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'flex-end',
  },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  heroContent: { padding: 18, gap: 4 },
  heroHeadline: { fontFamily: fonts.serif, fontSize: 28, color: '#fff', lineHeight: 34, letterSpacing: -0.5 },
  heroHeadlineAccent: { fontFamily: fonts.serif, fontSize: 28, color: colors.accent, lineHeight: 32, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 17, marginBottom: 10 },
  heroCta: {
    alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#fff',
    borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8,
  },
  heroCtaText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: colors.accent, width: 18 },

  // Categories
  catsScroll: { marginBottom: 8 },
  catsContent: { paddingHorizontal: 20, gap: 16, paddingVertical: 8 },
  catItem: { alignItems: 'center', gap: 7 },
  catCircle: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  catLabel: { fontFamily: fonts.sansMedium, fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  // Section header
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12, marginTop: 10,
  },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: '#fff' },
  seeAll: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  filterText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t2 },

  // Most Visited
  mostVisitedScroll: { marginBottom: 6 },
  mvCard: { width: 120, height: 150, borderRadius: radius.xl, overflow: 'hidden' },
  mvPhoto: { flex: 1, justifyContent: 'flex-end', padding: 10 },
  mvDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  mvRank: { fontFamily: fonts.serifBlack, fontSize: 36, color: 'rgba(255,255,255,0.9)', lineHeight: 38 },
  mvName: { fontFamily: fonts.sansMedium, fontSize: 11, color: '#fff', lineHeight: 14 },

  // Gym cards (horizontal layout)
  gymCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20, marginBottom: 12, padding: 12,
  },
  gymThumb: { width: 90, height: 90, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  discountBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: colors.accent, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  discountText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#060606' },
  gymInfo: { flex: 1, justifyContent: 'space-between', gap: 4 },
  gymTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gymName: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', flex: 1, marginRight: 6 },
  gymMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 12, color: 'rgba(255,205,55,0.9)' },
  metaDivider: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginHorizontal: 2 },
  metaText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.t2 },
  gymCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  fromLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2 },
  fromPrice: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  fromPer: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  viewPlansBtn: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start',
  },
  viewPlansBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#060606' },

  // Products
  productCard: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  productImg: { width: 150, height: 130 },
  productBody: { padding: 10, gap: 4 },
  productName: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff', lineHeight: 16 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productPrice: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  productOriginal: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, textDecorationLine: 'line-through' },

  // Trust badges
  trustRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,212,106,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustLabel: { fontFamily: fonts.sansMedium, fontSize: 9, color: colors.t2, textAlign: 'center' },

  // Testimonials
  testimonialCard: {
    width: SCREEN_W * 0.75,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    padding: 16, gap: 6,
  },
  testimonialText: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 20, fontStyle: 'italic' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,212,106,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  authorName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  authorCity: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
});
