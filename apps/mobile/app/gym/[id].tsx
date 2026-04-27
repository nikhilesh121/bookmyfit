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
  Elite: '#3DFF54',
  Premium: '#9B00FF',
  Standard: '#FF8A00',
};
const TIER_AURORA: Record<string, string> = {
  Elite: 'rgba(61,255,84,0.22)',
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
  const [activeTab, setActiveTab] = useState<'About' | 'Sessions' | 'Trainers' | 'Reviews'>('About');
  const [activeSub, setActiveSub] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [sessionSlots, setSessionSlots] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState<string>(new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

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
          // multi_gym: gymIds is empty = valid at any gym
          if (s.planType === 'multi_gym' || !s.gymIds || s.gymIds.length === 0) return true;
          // same_gym or day_pass: must match this gym
          return s.gymIds.includes(id) || s.gymId === id;
        });
        setActiveSub(active || null);
      })
      .catch(() => setActiveSub(null));

    api.get(`/gym-plans/by-gym/${id}`)
      .then((data: any) => {
        const plans = Array.isArray(data) ? data : data?.plans || [];
        setGymPlans(plans);
      })
      .catch(() => setGymPlans([]));

    // Load sessions for today
    loadSlots(id as string, new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);

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

  const loadSlots = (gymId: string, date: string) => {
    api.get(`/sessions/slots/${gymId}?date=${date}`)
      .then((data: any) => setSessionSlots(Array.isArray(data) ? data : []))
      .catch(() => setSessionSlots([]));
  };

  const bookSlot = async (slotId: string) => {
    if (!activeSub) {
      router.push({ pathname: '/plans', params: { gymId: id } } as any);
      return;
    }
    setBookingLoading(slotId);
    try {
      const res: any = await api.post('/sessions/book', { slotId, subscriptionId: activeSub?.id || activeSub?._id });
      if (res?.bookingQr) {
        router.push({
          pathname: '/qr',
          params: {
            token: res.bookingQr.token,
            expiresAt: res.bookingQr.expiresAt,
            bookedAt: res.bookingQr.bookedAt,
            gymId: res.bookingQr.gymId,
            gymName: res.bookingQr.gymName,
          },
        } as any);
      } else {
        const { Alert } = require('react-native');
        Alert.alert('Booked! ✅', 'Your session is confirmed. Check My Bookings for details.');
        loadSlots(id as string, slotDate);
      }
    } catch (e: any) {
      const { Alert } = require('react-native');
      const msg = (e?.message || '');
      if (msg.includes('subscription')) {
        Alert.alert('No Active Pass', 'You need an active pass to book sessions.', [
          { text: 'View Plans', onPress: () => router.push({ pathname: '/plans', params: { gymId: id } } as any) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Booking Failed', msg || 'Could not book this slot. Please try again.');
      }
    } finally {
      setBookingLoading(null);
    }
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
                {(['About', 'Sessions', 'Trainers', 'Reviews'] as const).map((tab) => (
                  <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                    <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sessions Tab */}
              {activeTab === 'Sessions' && (
                <>
                  <Text style={s.sectionTitle}>Book a Session</Text>
                  {/* Date selector — today + next 6 days */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {Array.from({ length: 7 }).map((_, d) => {
                      const dt = new Date(Date.now() + 5.5 * 3600 * 1000 + d * 86400000);
                      const ds = dt.toISOString().split('T')[0];
                      const isToday = d === 0;
                      const isSelected = ds === slotDate;
                      return (
                        <TouchableOpacity key={ds} onPress={() => { setSlotDate(ds); loadSlots(id as string, ds); }}
                          style={[s.datePill, isSelected && s.datePillActive]}>
                          <Text style={[s.datePillDay, isSelected && { color: colors.accent }]}>
                            {isToday ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </Text>
                          <Text style={[s.datePillNum, isSelected && { color: colors.accent }]}>
                            {dt.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 1 session/day notice */}
                  <View style={s.noticeRow}>
                    <Text style={s.noticeText}>📌 Max 1 session per day per gym — Gym Workout or Special Class</Text>
                  </View>

                  {sessionSlots.length === 0 ? (
                    <View style={s.glassCard}>
                      <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>No sessions available for this date.</Text>
                    </View>
                  ) : (
                    (() => {
                      // Group by session type
                      const groups: Record<string, any[]> = {};
                      for (const slot of sessionSlots) {
                        const key = slot.sessionType?.name || 'Gym Workout';
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(slot);
                      }
                      return Object.entries(groups).map(([typeName, slots]) => {
                        const color = slots[0]?.sessionType?.color || colors.accent;
                        const kind = slots[0]?.sessionType?.kind || 'standard';
                        return (
                          <View key={typeName} style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                              <Text style={[s.sectionTitle, { margin: 0, fontSize: 13 }]}>{typeName}</Text>
                              <View style={[s.amenityPill, { borderColor: `${color}44`, backgroundColor: `${color}18` }]}>
                                <Text style={[s.amenityText, { color }]}>{kind === 'standard' ? 'OPEN GYM' : 'CLASS'}</Text>
                              </View>
                            </View>
                            {slots.map((slot: any) => {
                              const isBooked = slot.userBooked;
                              const isFull = slot.isFull;
                              const hasOtherBooking = slot.userHasBookingToday && !isBooked;
                              const isLoading = bookingLoading === slot.id;
                              return (
                                <View key={slot.id} style={[s.slotRow, isBooked && s.slotRowBooked]}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.slotTime}>{slot.startTime} – {slot.endTime}</Text>
                                    <Text style={s.slotCapacity}>
                                      {isFull ? '🔴 Full' : `${slot.bookedCount}/${slot.maxCapacity} booked`}
                                    </Text>
                                  </View>
                                  {isBooked ? (
                                    <View style={[s.slotBtn, { backgroundColor: 'rgba(61,255,84,0.12)', borderColor: colors.accentBorder }]}>
                                      <IconCheck size={14} color={colors.accent} />
                                      <Text style={[s.slotBtnText, { color: colors.accent }]}>Booked</Text>
                                    </View>
                                  ) : isFull ? (
                                    <View style={[s.slotBtn, { opacity: 0.4 }]}>
                                      <Text style={s.slotBtnText}>Full</Text>
                                    </View>
                                  ) : hasOtherBooking ? (
                                    <View style={[s.slotBtn, { opacity: 0.4 }]}>
                                      <Text style={s.slotBtnText}>1/day limit</Text>
                                    </View>
                                  ) : (
                                    <TouchableOpacity style={s.slotBtn} onPress={() => bookSlot(slot.id)} disabled={!!isLoading}>
                                      {isLoading
                                        ? <Text style={s.slotBtnText}>…</Text>
                                        : <Text style={s.slotBtnText}>Book</Text>
                                      }
                                    </TouchableOpacity>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        );
                      });
                    })()
                  )}

                  {!activeSub && (
                    <TouchableOpacity style={s.cta} onPress={() => router.push({ pathname: '/plans', params: { gymId: id } } as any)}>
                      <Text style={s.ctaText}>Subscribe to Book Sessions</Text>
                      <IconArrowRight size={16} color="#000" />
                    </TouchableOpacity>
                  )}
                </>
              )}

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
                {gymPlans.length > 0 ? (
                  <>
                    <Text style={s.footPrice}>
                      ₹{Math.min(...gymPlans.map((p: any) => p.price || p.basePrice || 0)).toLocaleString('en-IN')}
                      <Text style={s.footPer}>/mo</Text>
                    </Text>
                    {gymPlans.some((p: any) => p.isDayPass || p.name?.toLowerCase().includes('day')) && (
                      <Text style={[s.footPer, { color: '#ff6b35', fontSize: 10 }]}>🌶️ Day pass available</Text>
                    )}
                  </>
                ) : (
                  <Text style={s.footPrice}>₹599<Text style={s.footPer}>/mo</Text></Text>
                )}
              </View>
              <TouchableOpacity
                style={s.cta}
                onPress={() => {
                  const minPrice = gymPlans.length > 0
                    ? Math.min(...gymPlans.map((p: any) => p.price || p.basePrice || 599))
                    : 599;
                  router.push({
                    pathname: '/duration',
                    params: {
                      planId: 'gym_specific',
                      planName: `${name} Membership`,
                      gymId: id,
                      basePrice: String(minPrice),
                    },
                  } as any)
                }}
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
  // Sessions tab styles
  datePill: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass, minWidth: 46,
  },
  datePillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  datePillDay: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  datePillNum: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginTop: 2 },
  noticeRow: {
    backgroundColor: 'rgba(61,255,84,0.06)', borderWidth: 1, borderColor: 'rgba(61,255,84,0.12)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  noticeText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
  },
  slotRowBooked: { borderColor: 'rgba(61,255,84,0.3)', backgroundColor: 'rgba(61,255,84,0.05)' },
  slotTime: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  slotCapacity: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 2 },
  slotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, height: 34, borderRadius: 20,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  slotBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
});
