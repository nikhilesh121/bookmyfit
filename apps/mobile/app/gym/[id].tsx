import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { colors, fonts, radius } from '../../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconArrowRight, IconCheck, IconClock, IconDumbbell, IconShare, IconQR } from '../../components/Icons';
import { gymsApi, subscriptionsApi, api } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const { width } = Dimensions.get('window');

const TIER_COLORS: Record<string, string> = {
  Elite: '#CCFF00',
  Premium: '#9B00FF',
  Standard: '#FF8A00',
};
const TIER_AURORA: Record<string, string> = {
  Elite: 'rgba(204,255,0,0.22)',
  Premium: 'rgba(155,0,255,0.22)',
  Standard: 'rgba(255,138,0,0.18)',
};

function SkeletonRect({ h, style }: { h: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' }, style]} />;
}

export default function GymDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'About' | 'Trainers' | 'Reviews'>('About');
  const [activeSub, setActiveSub] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    gymsApi.getById(id as string)
      .then((data: any) => setGym(data?.gym || data))
      .catch(() => setGym(null))
      .finally(() => setLoading(false));

    subscriptionsApi.mySubscriptions()
      .then((data: any) => {
        const subs = Array.isArray(data) ? data : data?.subscriptions || data?.data || [];
        const active = subs.find((s: any) => {
          if (s.status !== 'active') return false;
          if (!s.gymIds || s.gymIds.length === 0) return true;
          return s.gymIds.includes(id) || s.gymId === id;
        });
        setActiveSub(active || null);
      })
      .catch(() => setActiveSub(null));

    api.get(`/trainers?gymId=${id}`)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.trainers || data?.data || [];
        setTrainers(list);
      })
      .catch(() => setTrainers([]));

    api.get(`/ratings/gym/${id}`)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.ratings || data?.reviews || data?.data || [];
        setReviews(list);
      })
      .catch(() => setReviews([]));
  }, [id]);

  const tier = gym?.tier || gym?.tierName || 'Elite';
  const name = gym?.name || 'Gym';
  const rating = gym?.rating || gym?.avgRating || '—';
  const reviewCount = gym?.reviewCount || gym?.ratingsCount || '—';
  const address = gym?.address || gym?.location?.address || 'Address unavailable';
  const hours = gym?.openingHours || gym?.timings || '5am – 11pm';
  const description = gym?.description || 'Fully equipped gym with state-of-the-art cardio machines, free weights, functional training zone, and certified personal trainers. Built for every fitness level.';
  const amenities: string[] = gym?.amenities || ['AC', 'Parking', 'Shower', 'Locker', 'Steam Room', 'Pool'];
  const categories: string[] = gym?.categories || gym?.tags || [];
  const img = gym?.images?.[0] || gym?.coverImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80';
  const subscriptionId = activeSub?._id || activeSub?.id;

  const handleShare = () => {
    Share.share({ message: `Check out ${name} on BookMyFit!` }).catch(() => {});
  };

  return (
    <AuroraBackground variant="gym">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: img }} style={s.hero}>
          <View style={[s.heroAurora, { backgroundColor: TIER_AURORA[tier] || TIER_AURORA.Elite }]} />
          <View style={s.heroDark} />
          <SafeAreaView style={s.heroInner}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <IconArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.back} onPress={handleShare}>
              <IconShare size={18} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </ImageBackground>

        <View style={s.content}>
          {loading ? (
            <>
              <SkeletonRect h={20} style={{ width: 80, marginBottom: 10 }} />
              <SkeletonRect h={36} style={{ marginBottom: 10 }} />
              <SkeletonRect h={16} style={{ width: '60%', marginBottom: 20 }} />
              <SkeletonRect h={100} style={{ marginBottom: 16 }} />
            </>
          ) : (
            <>
              {/* Name & meta */}
              <View style={[s.tierBadge, { backgroundColor: (TIER_COLORS[tier] || colors.accent) + '22', borderColor: (TIER_COLORS[tier] || colors.accent) + '55' }]}>
                <Text style={[s.tierText, { color: TIER_COLORS[tier] || colors.accent }]}>{tier.toUpperCase()}</Text>
              </View>
              <Text style={s.gymName}>{name}</Text>
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <IconStar size={12} />
                  <Text style={[s.metaText, { color: colors.star }]}>{rating}</Text>
                  {reviewCount !== '—' && <Text style={[s.metaText, { color: colors.t2 }]}>({reviewCount})</Text>}
                </View>
                <View style={s.metaItem}>
                  <IconPin size={12} color={colors.t} />
                  <Text style={s.metaText}>{address}</Text>
                </View>
              </View>

              {/* Quick stats */}
              <View style={s.statsRow}>
                {[
                  { icon: IconClock, label: hours, sub: 'Opening Hours' },
                  { icon: IconDumbbell, label: '200+', sub: 'Equipment' },
                ].map((st) => (
                  <View key={st.sub} style={s.statCard}>
                    <st.icon size={16} color={colors.accent} />
                    <View>
                      <Text style={s.statLabel}>{st.label}</Text>
                      <Text style={s.statSub}>{st.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tabs */}
              <View style={s.tabRow}>
                {(['About', 'Trainers', 'Reviews'] as const).map((tab) => (
                  <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                    <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* About Tab */}
              {activeTab === 'About' && (
                <>
                  <Text style={s.sectionTitle}>Description</Text>
                  <View style={s.glassCard}>
                    <Text style={s.body}>{description}</Text>
                  </View>

                  {amenities.length > 0 && (
                    <>
                      <Text style={s.sectionTitle}>Amenities</Text>
                      <View style={s.amenityWrap}>
                        {amenities.map((a: string) => (
                          <View key={a} style={s.amenityPill}>
                            <IconCheck size={10} color={colors.accent} />
                            <Text style={s.amenityText}>{a}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {categories.length > 0 && (
                    <>
                      <Text style={s.sectionTitle}>Categories</Text>
                      <View style={s.amenityWrap}>
                        {categories.map((c: string) => (
                          <View key={c} style={[s.amenityPill, { borderColor: colors.accentBorder }]}>
                            <Text style={[s.amenityText, { color: colors.accent }]}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Trainers Tab */}
              {activeTab === 'Trainers' && (
                <>
                  <Text style={s.sectionTitle}>Personal Trainers</Text>
                  {trainers.length === 0 ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>No trainers listed for this gym yet.</Text>
                    </View>
                  ) : (
                    trainers.map((t: any) => (
                      <View key={t._id || t.id || t.name} style={s.trainerCard}>
                        <View style={s.trainerAvatar}>
                          <Text style={s.trainerInitial}>{(t.name || 'T')[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.trainerName}>{t.name}</Text>
                          <Text style={s.trainerSessions}>{t.sessions || t.totalSessions ? `${t.sessions || t.totalSessions}+ sessions` : (t.specialization || '')}</Text>
                        </View>
                        {!!t.price && <Text style={s.trainerPrice}>{t.price}</Text>}
                      </View>
                    ))
                  )}
                  <View style={s.glassCard}>
                    <Text style={[s.body, { textAlign: 'center' }]}>PT add-on available with Pro & Max plans</Text>
                  </View>
                </>
              )}

              {/* Reviews Tab */}
              {activeTab === 'Reviews' && (
                <>
                  <Text style={s.sectionTitle}>Reviews</Text>
                  {reviews.length === 0 ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>No reviews yet. Be the first to review!</Text>
                    </View>
                  ) : (
                    reviews.map((r: any, i: number) => {
                      const reviewName = r.user?.name || r.name || r.userName || 'Member';
                      const reviewRating = r.rating || r.stars || 5;
                      const reviewText = r.comment || r.text || r.review || '';
                      const reviewDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : (r.date || '');
                      return (
                        <View key={r._id || r.id || i} style={s.reviewCard}>
                          <View style={s.reviewHeader}>
                            <View style={s.reviewAvatar}><Text style={s.reviewInitial}>{reviewName[0]}</Text></View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.reviewName}>{reviewName}</Text>
                              <Text style={s.reviewDate}>{reviewDate}</Text>
                            </View>
                            <View style={s.reviewStars}>
                              {Array.from({ length: Math.min(reviewRating, 5) }).map((_, j) => <IconStar key={j} size={10} />)}
                            </View>
                          </View>
                          {!!reviewText && <Text style={s.reviewText}>{reviewText}</Text>}
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {!loading && (
        <View style={s.footer}>
          {activeSub ? (
            <>
              <TouchableOpacity
                style={s.qrBtn}
                onPress={() => router.push({ pathname: '/qr', params: { gymId: id, subId: subscriptionId } } as any)}
                activeOpacity={0.9}
              >
                <IconQR size={16} color="#fff" />
                <Text style={s.qrBtnText}>Show QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push({ pathname: '/slots', params: { gymId: id } } as any)}
                activeOpacity={0.9}
              >
                <Text style={s.ctaText}>Book a Slot</Text>
                <IconArrowRight size={16} color="#000" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View>
                <Text style={s.footLabel}>Starting from</Text>
                <Text style={s.footPrice}>₹599<Text style={s.footPer}>/mo</Text></Text>
              </View>
              <TouchableOpacity
                style={s.cta}
                onPress={() => router.push({ pathname: '/plans', params: { gymId: id, gymName: name } } as any)}
                activeOpacity={0.9}
              >
                <Text style={s.ctaText}>Get a Membership</Text>
                <IconArrowRight size={16} color="#000" />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  hero: { width, height: 260 },
  heroAurora: { ...StyleSheet.absoluteFillObject },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroInner: { paddingHorizontal: 22, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 110 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  tierText: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.5 },
  gymName: { fontFamily: fonts.serif, fontSize: 28, color: '#fff', letterSpacing: -0.8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 12,
  },
  statLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  statSub: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 4 },
  tabBtn: {
    flex: 1, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  tabBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  tabText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.t2 },
  tabTextActive: { color: colors.accent },
  sectionTitle: {
    fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 22, marginBottom: 10,
  },
  glassCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14,
  },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  amenityText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t },
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
  },
  trainerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  trainerName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  trainerSessions: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  trainerPrice: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  reviewCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  reviewInitial: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  reviewName: { fontFamily: fonts.sansBold, fontSize: 12, color: '#fff' },
  reviewDate: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, lineHeight: 18 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: 'rgba(6,6,6,0.95)', borderTopWidth: 1, borderTopColor: colors.borderGlass,
    gap: 12,
  },
  footLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  footPrice: { fontFamily: fonts.sansBold, fontSize: 22, color: '#fff' },
  footPer: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, height: 50, borderRadius: 25, backgroundColor: colors.accent,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, height: 50, borderRadius: 25,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  qrBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
});
