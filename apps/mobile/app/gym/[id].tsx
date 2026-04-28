import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { colors, fonts, radius } from '../../theme/brand';
import { IconArrowLeft, IconStar, IconPin, IconArrowRight, IconCheck, IconClock, IconDumbbell, IconShare, IconQR } from '../../components/Icons';
import { gymsApi, subscriptionsApi, api } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const { width } = Dimensions.get('window');

const TIER_COLORS: Record<string, string> = {
  Elite: '#00D46A',
  Premium: '#9B00FF',
  Standard: '#FF8A00',
};
const TIER_AURORA: Record<string, string> = {
  Elite: 'rgba(0,212,106,0.22)',
  Premium: 'rgba(155,0,255,0.22)',
  Standard: 'rgba(255,138,0,0.18)',
};

function SkeletonRect({ h, style }: { h: number; style?: any }) {
  return <View style={[{ height: h, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' }, style]} />;
}

export default function GymDetail() {
  const { id, fallbackName, fallbackAddress, fallbackRating, fallbackTier } = useLocalSearchParams<{ id: string; fallbackName?: string; fallbackAddress?: string; fallbackRating?: string; fallbackTier?: string }>();
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'About' | 'Sessions' | 'Trainers' | 'Reviews'>('About');
  const [activeSub, setActiveSub] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [sessionSlots, setSessionSlots] = useState<any[]>([]);
  const FALLBACK_SESSION_TYPES = [
    { id: 'gym', name: 'Gym Workout', color: '#3DFF54' },
    { id: 'cardio', name: 'Cardio', color: '#FB923C' },
    { id: 'yoga', name: 'Yoga', color: '#22D3EE' },
    { id: 'hiit', name: 'HIIT', color: '#F59E0B' },
  ];
  const [sessionTypes, setSessionTypes] = useState<any[]>(FALLBACK_SESSION_TYPES);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [slotDate, setSlotDate] = useState<string>(new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    gymsApi.getById(id as string)
      .then((data: any) => {
        const g = data?.gym || data;
        setGym(g && (g.id || g._id) ? g : null);
      })
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

    // Load sessions and session types for today
    loadSlots(id as string, new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]);
    api.get(`/sessions/types/${id}`)
      .then((data: any) => {
        const list = (Array.isArray(data) ? data : []).filter((t: any) => t.id !== 'all');
        if (list.length > 0) setSessionTypes(list);
        // else keep FALLBACK_SESSION_TYPES
      })
      .catch(() => { /* keep fallback */ });

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

  const tier = gym?.tier || gym?.tierName || fallbackTier || 'Elite';
  const name = gym?.name || fallbackName || 'Gym';
  const rating = gym?.rating || gym?.avgRating || (fallbackRating ? Number(fallbackRating) : '—');
  const reviewCount = gym?.reviewCount || gym?.ratingsCount || '—';
  const address = gym?.address || gym?.location?.address || fallbackAddress || 'Bhubaneswar';
  const hours = gym?.openingHours || gym?.timings || '5am – 11pm';
  const description = gym?.description || 'Fully equipped gym with state-of-the-art cardio machines, free weights, functional training zone, and certified personal trainers. Built for every fitness level.';
  const amenities: string[] = gym?.amenities || ['AC', 'Parking', 'Shower', 'Locker', 'Steam Room', 'Pool'];
  const categories: string[] = gym?.categories || gym?.tags || [];
  const img = gym?.images?.[0] || gym?.coverImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80';
  const subscriptionId = activeSub?._id || activeSub?.id;

  const handleShare = () => {
    Share.share({ message: `Check out ${name} on BookMyFit!` }).catch(() => {});
  };

  const FALLBACK_SLOTS = [
    { id: 'fsl1', startTime: '06:00', endTime: '07:00', maxCapacity: 20, bookedCount: 8,  isFull: false, sessionType: { id: 'gym',    name: 'Gym Workout', color: '#3DFF54', durationMinutes: 60, instructor: 'Raj Kumar' } },
    { id: 'fsl2', startTime: '06:00', endTime: '07:00', maxCapacity: 15, bookedCount: 10, isFull: false, sessionType: { id: 'cardio', name: 'Cardio',      color: '#FB923C', durationMinutes: 60, instructor: 'Priya Das' } },
    { id: 'fsl3', startTime: '07:00', endTime: '08:00', maxCapacity: 20, bookedCount: 14, isFull: false, sessionType: { id: 'gym',    name: 'Gym Workout', color: '#3DFF54', durationMinutes: 60, instructor: 'Amit Singh' } },
    { id: 'fsl4', startTime: '08:00', endTime: '09:00', maxCapacity: 12, bookedCount: 4,  isFull: false, sessionType: { id: 'yoga',   name: 'Yoga',        color: '#22D3EE', durationMinutes: 60, instructor: 'Sunita Rao' } },
    { id: 'fsl5', startTime: '08:00', endTime: '09:00', maxCapacity: 20, bookedCount: 20, isFull: true,  sessionType: { id: 'cardio', name: 'Cardio',      color: '#FB923C', durationMinutes: 60, instructor: 'Priya Das' } },
    { id: 'fsl6', startTime: '09:00', endTime: '10:00', maxCapacity: 12, bookedCount: 3,  isFull: false, sessionType: { id: 'yoga',   name: 'Yoga',        color: '#22D3EE', durationMinutes: 60, instructor: 'Sunita Rao' } },
    { id: 'fsl7', startTime: '09:00', endTime: '10:00', maxCapacity: 20, bookedCount: 11, isFull: false, sessionType: { id: 'gym',    name: 'Gym Workout', color: '#3DFF54', durationMinutes: 60, instructor: 'Raj Kumar' } },
    { id: 'fsl8', startTime: '17:00', endTime: '18:00', maxCapacity: 20, bookedCount: 15, isFull: false, sessionType: { id: 'cardio', name: 'Cardio',      color: '#FB923C', durationMinutes: 60, instructor: 'Amit Singh' } },
    { id: 'fsl9', startTime: '18:00', endTime: '19:00', maxCapacity: 20, bookedCount: 18, isFull: false, sessionType: { id: 'gym',    name: 'Gym Workout', color: '#3DFF54', durationMinutes: 60, instructor: 'Raj Kumar' } },
    { id: 'fsl10',startTime: '18:00', endTime: '19:00', maxCapacity: 10, bookedCount: 5,  isFull: false, sessionType: { id: 'hiit',   name: 'HIIT',        color: '#F59E0B', durationMinutes: 45, instructor: 'Vikram Nair' } },
    { id: 'fsl11',startTime: '19:00', endTime: '20:00', maxCapacity: 12, bookedCount: 8,  isFull: false, sessionType: { id: 'yoga',   name: 'Yoga',        color: '#22D3EE', durationMinutes: 60, instructor: 'Sunita Rao' } },
  ];

  const loadSlots = (gymId: string, date: string) => {
    api.get(`/sessions/slots/${gymId}?date=${date}`)
      .then((data: any) => {
        const slots = Array.isArray(data) ? data : [];
        setSessionSlots(slots.length > 0 ? slots : FALLBACK_SLOTS);
      })
      .catch(() => setSessionSlots(FALLBACK_SLOTS));
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
        Alert.alert('Booked', 'Your session is confirmed. Check My Bookings for details.');
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
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
                  </ScrollView>

                  {/* Session type filter chips */}
                  {sessionTypes.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                      <TouchableOpacity
                        style={[s.typeChip, activeTypeFilter === 'all' && s.typeChipActive]}
                        onPress={() => setActiveTypeFilter('all')}
                      >
                        <Text style={[s.typeChipText, activeTypeFilter === 'all' && { color: colors.accent }]}>All</Text>
                      </TouchableOpacity>
                      {sessionTypes.map((st: any) => {
                        const stColor = st.color || colors.accent;
                        const isActive = activeTypeFilter === st.id;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            style={[s.typeChip, isActive && { borderColor: stColor + '88', backgroundColor: stColor + '18' }]}
                            onPress={() => setActiveTypeFilter(st.id)}
                          >
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: stColor, marginRight: 4 }} />
                            <Text style={[s.typeChipText, isActive && { color: stColor }]}>{st.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* 1 session/day notice */}
                  <View style={s.noticeRow}>
                    <Text style={s.noticeText}>Max 1 session per day per gym — Gym Workout or Special Class</Text>
                  </View>

                  {(() => {
                    const filteredSlots = activeTypeFilter === 'all'
                      ? sessionSlots
                      : sessionSlots.filter((slot: any) => {
                          const st = slot.sessionType;
                          if (!st) return false;
                          const filterId = activeTypeFilter.toLowerCase();
                          return (
                            st.id === activeTypeFilter ||
                            st.id?.toLowerCase() === filterId ||
                            st.name?.toLowerCase().includes(filterId) ||
                            filterId.includes(st.name?.toLowerCase() ?? '')
                          );
                        });

                    if (filteredSlots.length === 0) {
                      return (
                        <View style={s.glassCard}>
                          <Text style={[s.body, { textAlign: 'center', color: colors.t2 }]}>
                            No sessions scheduled for this date. Try another date.
                          </Text>
                        </View>
                      );
                    }

                    return filteredSlots.map((slot: any) => {
                      const isBooked = slot.userBooked;
                      const isFull = slot.isFull;
                      const hasOtherBooking = slot.userHasBookingToday && !isBooked;
                      const isLoading = bookingLoading === slot.id;
                      const stColor = slot.sessionType?.color || colors.accent;
                      const typeName = slot.sessionType?.name || 'Gym Workout';
                      const instructor = slot.sessionType?.instructor;
                      const durationMin = slot.sessionType?.durationMinutes;
                      const spotsLeft = (slot.maxCapacity || 0) - (slot.bookedCount || 0);
                      const capacityPct = slot.maxCapacity > 0 ? Math.min((slot.bookedCount || 0) / slot.maxCapacity, 1) : 0;

                      return (
                        <View key={slot.id} style={[s.slotCard, isBooked && { borderColor: stColor + '55', backgroundColor: stColor + '08' }]}>
                          {/* Header row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: stColor, marginRight: 7 }} />
                            <Text style={[s.slotTypeName, { color: stColor }]}>{typeName.toUpperCase()}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={s.slotTime}>{slot.startTime} – {slot.endTime}</Text>
                          </View>
                          {/* Instructor + duration */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            {instructor ? (
                              <Text style={s.slotInstructor}>Instructor: {instructor}</Text>
                            ) : null}
                            {durationMin ? (
                              <Text style={s.slotDuration}>{durationMin} min</Text>
                            ) : null}
                          </View>
                          {/* Capacity bar + book button */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <View style={s.capacityBar}>
                                <View style={[s.capacityFill, { width: `${capacityPct * 100}%` as any, backgroundColor: isFull ? '#FF4444' : stColor }]} />
                              </View>
                              <Text style={s.slotCapacity}>
                                {isFull ? 'Full' : `${spotsLeft} spots left`} ({slot.bookedCount}/{slot.maxCapacity})
                              </Text>
                            </View>
                            {isBooked ? (
                              <View style={[s.slotBtn, { backgroundColor: stColor + '20', borderColor: stColor + '55' }]}>
                                <IconCheck size={13} color={stColor} />
                                <Text style={[s.slotBtnText, { color: stColor }]}>Booked</Text>
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
                              <TouchableOpacity style={[s.slotBtn, { backgroundColor: stColor, borderColor: stColor }]} onPress={() => bookSlot(slot.id)} disabled={!!isLoading}>
                                <Text style={[s.slotBtnText, { color: '#060606' }]}>{isLoading ? '...' : 'Book Now'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    });
                  })()}

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
                  {/* Location Map */}
                  <Text style={s.sectionTitle}>Location</Text>
                  <View style={s.mapCard}>
                    {(gym?.latitude || gym?.location?.lat) ? (
                      <WebView
                        style={{ flex: 1, borderRadius: radius.lg }}
                        source={{ uri: `https://www.openstreetmap.org/export/embed.html?bbox=${(gym?.longitude || gym?.location?.lng || 85.8245) - 0.01},${(gym?.latitude || gym?.location?.lat || 20.2961) - 0.008},${(gym?.longitude || gym?.location?.lng || 85.8245) + 0.01},${(gym?.latitude || gym?.location?.lat || 20.2961) + 0.008}&layer=mapnik&marker=${gym?.latitude || gym?.location?.lat || 20.2961},${gym?.longitude || gym?.location?.lng || 85.8245}` }}
                        scrollEnabled={false}
                        javaScriptEnabled
                        domStorageEnabled
                      />
                    ) : (
                      <View style={s.mapPlaceholder}>
                        <IconPin size={28} color={colors.accent} />
                        <Text style={s.mapAddressText}>{address}</Text>
                        <TouchableOpacity
                          style={s.mapDirBtn}
                          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(name + ' ' + address)}`)}
                        >
                          <Text style={s.mapDirBtnText}>Open in Maps ›</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Hours & Address */}
                  <View style={s.glassCard}>
                    <View style={s.infoRow}>
                      <IconPin size={14} color={colors.accent} />
                      <Text style={s.infoValue}>{address}</Text>
                    </View>
                    <View style={[s.infoRow, { marginTop: 10 }]}>
                      <IconClock size={14} color={colors.accent} />
                      <Text style={s.infoValue}>{hours}</Text>
                    </View>
                  </View>

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
                      <Text style={[s.footPer, { color: '#ff6b35', fontSize: 10 }]}>Day pass available</Text>
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
    fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 10,
  },
  glassCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },
  mapCard: { height: 200, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.borderGlass },
  mapPlaceholder: { flex: 1, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  mapAddressText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, textAlign: 'center' },
  mapDirBtn: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  mapDirBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoValue: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, flex: 1, lineHeight: 20 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  trainerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  trainerName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff' },
  trainerSessions: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  trainerPrice: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  reviewCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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
    backgroundColor: 'rgba(0,212,106,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,106,0.12)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  noticeText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  // Session type filter chips
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  typeChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  typeChipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t2 },
  // Improved slot card
  slotCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  slotTypeName: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2 },
  slotInstructor: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },
  slotDuration: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  capacityBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  capacityFill: { height: '100%', borderRadius: 2 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
  },
  slotRowBooked: { borderColor: 'rgba(0,212,106,0.3)', backgroundColor: 'rgba(0,212,106,0.05)' },
  slotTime: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  slotCapacity: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginTop: 2 },
  slotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, height: 34, borderRadius: 20,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  slotBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
});
