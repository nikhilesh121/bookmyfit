import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { colors, fonts, radius } from '../../theme/brand';
import { IconQR, IconStar, IconPin, IconBell, IconDumbbell, IconBolt } from '../../components/Icons';
import { gymsApi, getUser, api } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const FALLBACK_GYMS = [
  { id: '1', name: 'PowerZone', tier: 'Elite', rating: 4.8, distance: '0.8 km', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
  { id: '2', name: 'Iron Temple', tier: 'Premium', rating: 4.6, distance: '2.1 km', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80' },
  { id: '3', name: 'Crosstown', tier: 'Standard', rating: 4.3, distance: '3.4 km', img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80' },
];

const TIER_AURORA: Record<string, string> = {
  Elite: 'rgba(204,255,0,0.25)',
  Premium: 'rgba(155,0,255,0.25)',
  Standard: 'rgba(255,138,0,0.22)',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonRect({ w, h, style }: { w?: number | string; h: number; style?: any }) {
  return <View style={[{ width: w || '100%', height: h, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)' }, style]} />;
}

export default function Home() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [userName, setUserName] = useState('');
  const [recommended, setRecommended] = useState<any[]>([]);
  const [homepageConfig, setHomepageConfig] = useState<{ sections: any[] } | null>(null);

  useEffect(() => {
    getUser().then((u) => { if (u?.name) setUserName(u.name.split(' ')[0]); }).catch(() => {});
  }, []);

  // Fetch homepage config from backend
  useEffect(() => {
    api.get<{ sections: any[] }>('/homepage/config')
      .then((data) => { if (data?.sections) setHomepageConfig(data); })
      .catch(() => { /* show all sections by default */ });
  }, []);

  function isSectionVisible(id: string): boolean {
    if (!homepageConfig) return true;
    const section = homepageConfig.sections.find((s: any) => s.id === id);
    return section ? section.visible !== false : true;
  }

  useEffect(() => {
    getUser().then((u) => { if (u?.name) setUserName(u.name.split(' ')[0]); }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingGyms(true);
    Promise.allSettled([
      gymsApi.list({ page: 1 }),
      gymsApi.categories(),
      gymsApi.recommended(),
    ]).then(([gymsResult, catsResult, recsResult]) => {
      if (gymsResult.status === 'fulfilled') {
        const data = gymsResult.value;
        const list = Array.isArray(data) ? data : data?.gyms || data?.data || [];
        setGyms(list.slice(0, 5));
      } else {
        setGyms(FALLBACK_GYMS);
      }
      if (catsResult.status === 'fulfilled') {
        const cats = Array.isArray(catsResult.value) ? catsResult.value : catsResult.value?.categories || [];
        setCategories(cats.slice(0, 6).map((c: any) => (typeof c === 'string' ? c : c.name)));
      }
      if (recsResult.status === 'fulfilled') {
        const recs = Array.isArray(recsResult.value) ? recsResult.value : recsResult.value?.data || [];
        setRecommended(recs.slice(0, 8));
      }
    }).finally(() => setLoadingGyms(false));
  }, []);

  const displayGyms = gyms.length > 0 ? gyms : FALLBACK_GYMS;

  return (
    <AuroraBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.hello}>{getGreeting()}</Text>
            <Text style={s.name}>{userName ? `Hey, ${userName}` : 'Ready to train'}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}>
            <IconBell size={18} color={colors.t} />
          </TouchableOpacity>
        </View>

        {/* QR Check-in hero card */}
        <TouchableOpacity onPress={() => router.push('/qr')} activeOpacity={0.9} style={s.qrCard}>
          <View style={s.qrAurora} />
          <View style={{ flex: 1 }}>
            <View style={s.qrPill}>
              <IconBolt size={10} color={colors.accent} />
              <Text style={s.qrPillText}>Quick Check-in</Text>
            </View>
            <Text style={s.qrTitle}>
              Check in{'\n'}
              <Text style={s.qrTitleItalic}>in seconds.</Text>
            </Text>
            <Text style={s.qrSub}>Tap to generate your secure 30-second QR.</Text>
          </View>
          <View style={s.qrIconBox}>
            <IconQR size={36} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Quick tiles */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick actions</Text>
        </View>
        <View style={s.tileRow}>
          <TouchableOpacity style={s.tile} onPress={() => router.push('/(tabs)/explore')}>
            <IconDumbbell size={22} color={colors.accent} />
            <Text style={s.tileText}>Find gyms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tile} onPress={() => router.push('/plans')}>
            <IconBolt size={22} color={colors.accent} />
            <Text style={s.tileText}>Upgrade plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tile} onPress={() => router.push('/(tabs)/subscriptions')}>
            <IconStar size={22} color={colors.accent} />
            <Text style={s.tileText}>My subs</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        {isSectionVisible('categories') && categories.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Categories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat} style={s.catPill} onPress={() => router.push('/(tabs)/explore')}>
                  <Text style={s.catPillText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recommended for You */}
        {isSectionVisible('recommended') && recommended.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recommended for You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                <Text style={s.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={recommended}
              keyExtractor={(item) => String(item.id || item._id)}
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item: g }) => {
                const tier = g.tier || g.tierName || 'Standard';
                const name = g.name || g.gymName || 'Gym';
                const rating = g.rating || g.avgRating || '—';
                const city = g.city || g.location?.city || '';
                const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/gym/${g.id || g._id}`)}
                    activeOpacity={0.9}
                    style={s.recCard}
                  >
                    <ImageBackground source={{ uri: img }} style={s.recPhoto} imageStyle={{ borderRadius: radius.lg }}>
                      <View style={s.recDark} />
                      <View style={s.recBody}>
                        <View style={s.recTierBadge}>
                          <Text style={s.recTierText}>{tier}</Text>
                        </View>
                        <View>
                          <Text style={s.recName} numberOfLines={1}>{name}</Text>
                          <View style={s.recMeta}>
                            <IconStar size={10} />
                            <Text style={[s.recMetaText, { color: colors.star }]}>{rating}</Text>
                            {!!city && <Text style={[s.recMetaText, { color: colors.t2 }]}> · {city}</Text>}
                          </View>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* Featured gyms */}
        {isSectionVisible('featured_gyms') && (<>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Featured nearby</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={s.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {loadingGyms ? (
          [1, 2, 3].map((i) => <SkeletonRect key={i} h={180} style={{ marginBottom: 12, borderRadius: radius.xl }} />)
        ) : (
          displayGyms.map((g: any) => {
            const tier = g.tier || g.tierName || 'Standard';
            const name = g.name || g.gymName || 'Gym';
            const rating = g.rating || g.avgRating || '—';
            const distance = g.distance || g.distanceKm ? `${g.distanceKm || g.distance} km` : '';
            const img = g.images?.[0] || g.coverImage || g.img || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80';
            return (
              <TouchableOpacity key={g.id || g._id} onPress={() => router.push(`/gym/${g.id || g._id}`)} activeOpacity={0.9} style={s.gymCard}>
                <ImageBackground source={{ uri: img }} style={s.gymPhoto} imageStyle={{ borderRadius: radius.xl }}>
                  <View style={[s.gymAurora, { backgroundColor: TIER_AURORA[tier] || TIER_AURORA.Standard }]} />
                  <View style={s.gymDark} />
                  <View style={s.gymBody}>
                    <View style={s.tierBadge}>
                      <Text style={s.tierBadgeText}>{tier}</Text>
                    </View>
                    <View>
                      <Text style={s.gymName}>{name}</Text>
                      <View style={s.gymMetaRow}>
                        <View style={s.metaItem}>
                          <IconStar size={11} />
                          <Text style={[s.metaText, { color: 'rgba(255,210,55,0.9)' }]}>{rating}</Text>
                        </View>
                        {!!distance && (
                          <View style={s.metaItem}>
                            <IconPin size={11} color={colors.t} />
                            <Text style={s.metaText}>{distance}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            );
          })
        )}
        </>)}
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  catPillText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  hello: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qrCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.xl, padding: 18, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGlass,
    marginBottom: 28,
    position: 'relative',
  },
  qrAurora: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accentSoft,
  },
  qrPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10,
  },
  qrPillText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.accent, letterSpacing: 1 },
  qrTitle: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5, lineHeight: 26 },
  qrTitleItalic: { fontFamily: fonts.serifItalic, color: colors.accent },
  qrSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t, marginTop: 6, maxWidth: 180 },
  qrIconBox: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: colors.glassDark, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', letterSpacing: -0.4 },
  sectionLink: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  tileRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tile: {
    flex: 1, height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  tileText: { fontFamily: fonts.sansMedium, fontSize: 11, color: '#fff' },
  gymCard: { height: 180, borderRadius: radius.xl, marginBottom: 12, overflow: 'hidden' },
  gymPhoto: { flex: 1, justifyContent: 'space-between', padding: 14 },
  gymAurora: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(204,255,0,0.2)' },
  gymDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  gymBody: { flex: 1, justifyContent: 'space-between' },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.borderGlass },
  tierBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' },
  gymName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  gymMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t },
  recCard: { width: 160, height: 130, borderRadius: radius.lg, overflow: 'hidden' },
  recPhoto: { flex: 1, padding: 10 },
  recDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  recBody: { flex: 1, justifyContent: 'space-between' },
  recTierBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: colors.borderGlass },
  recTierText: { fontFamily: fonts.sansBold, fontSize: 8, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
  recName: { fontFamily: fonts.serif, fontSize: 14, color: '#fff', letterSpacing: -0.3 },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  recMetaText: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.t },
});
