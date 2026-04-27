import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconRefresh, IconDumbbell, IconCalendar } from '../../components/Icons';
import { subscriptionsApi } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const FALLBACK_SUBS = [
  { id: 's1', gymIds: [], gym: { name: 'PowerZone Fitness', coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' }, plan: { name: 'Multi Gym Pass' }, durationMonths: 3, startDate: '2025-04-14', endDate: '2025-07-14', status: 'active', progress: 0.6 },
  { id: 's2', gymIds: [], gym: { name: 'FitHub Pro', coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80' }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-28', endDate: '2025-04-28', status: 'active', progress: 0.8 },
  { id: 's3', gymIds: [], gym: { name: 'IronBody Gym', coverImage: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80' }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-01', endDate: '2025-03-31', status: 'expired', progress: 1 },
];

function calcProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now >= end) return 1;
  if (now <= start) return 0;
  return (now - start) / (end - start);
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  return days + ' days left';
}

function SkeletonCard() {
  return <View style={[s.subCard, { height: 200, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border }]} />;
}

export default function Subscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
    subscriptionsApi.mySubscriptions()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.subscriptions || data?.data || [];
        setSubs(list.length > 0 ? list : FALLBACK_SUBS);
      })
      .catch(() => setSubs(FALLBACK_SUBS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuroraBackground variant="premium">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>My Subscriptions</Text>

          {loading ? (
            [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          ) : subs.length === 0 ? (
            <View style={s.emptyState}>
              <IconDumbbell size={44} color={colors.accent} />
              <Text style={s.emptyTitle}>No active subscriptions</Text>
              <Text style={s.emptyBody}>Subscribe to a gym to get started</Text>
              <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/plans')}>
                <Text style={s.browseBtnText}>Browse Plans</Text>
              </TouchableOpacity>
            </View>
          ) : (
            subs.map((sub: any) => {
              const subId = sub.id || sub._id;
              const planType: string = sub.planType || '';
              const PLAN_LABELS: Record<string, string> = { day_pass: '1-Day Pass', same_gym: 'Same Gym Pass', multi_gym: 'Multi Gym Pass' };
              const planName = sub.planLabel || PLAN_LABELS[planType] || sub.plan?.name || sub.planName || 'Plan';
              const gymName = planType === 'multi_gym'
                ? 'All Partner Gyms'
                : (sub.gymName || sub.gym?.name || sub.gymName || 'Gym');
              const duration = sub.durationMonths ? sub.durationMonths + ' Month' + (sub.durationMonths > 1 ? 's' : '') : '';
              const status = (sub.status || 'active').toLowerCase();
              const isActive = status === 'active';
              const img = sub.gym?.coverImage || sub.gym?.images?.[0] || sub.coverImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80';
              const progress = sub.progress ?? (sub.startDate && sub.endDate ? calcProgress(sub.startDate, sub.endDate) : 0.5);
              const left = sub.endDate ? daysLeft(sub.endDate) : (isActive ? 'Active' : 'Expired');
              const started = sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
              const PLAN_AURORA: Record<string, string> = { day_pass: 'rgba(255,180,0,0.5)', same_gym: 'rgba(61,255,84,0.45)', multi_gym: 'rgba(155,0,255,0.5)', expired: 'rgba(100,100,100,0.5)' };
              const aurora = isActive ? (PLAN_AURORA[planType] || 'rgba(61,255,84,0.45)') : PLAN_AURORA.expired;
              // First gymId for navigation
              const gymIds: string[] = sub.gymIds || (sub.gymId ? [sub.gymId] : []);
              const firstGymId = gymIds[0] || sub.gym?._id || sub.gym?.id || '';

              return (
                <TouchableOpacity key={subId} activeOpacity={0.9} style={[s.subCard, !isActive && { opacity: 0.7 }]} onPress={() => router.push({ pathname: '/subscription-detail', params: { subscriptionId: subId } } as any)}>
                  <ImageBackground source={{ uri: img }} style={s.subImg} imageStyle={{ borderRadius: radius.xl }}>
                    <View style={[s.subAurora, { backgroundColor: aurora }]} />
                    <View style={s.subDark} />
                    <View style={s.subBody}>
                      <View>
                        <Text style={s.subGym}>{gymName}</Text>
                        <Text style={s.subPlan}>{planName}{duration ? ' · ' + duration : ''}</Text>
                      </View>
                      {/* Progress bar */}
                      <View style={s.barWrap}>
                        <View style={s.barLabelRow}>
                          <Text style={s.barLabel}>{started ? 'Started ' + started : ''}</Text>
                          <Text style={[s.barLabel, !isActive ? { color: 'rgba(255,80,80,0.7)' } : { color: 'rgba(255,150,50,0.8)' }]}>{left}</Text>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: (Math.min(progress * 100, 100) + '%') as any }, isActive ? undefined : s.barFillDim]} />
                        </View>
                      </View>
                      {/* Status row */}
                      <View style={s.subFoot}>
                        {isActive ? (
                          <View style={s.statusActive}>
                            <View style={s.statusDot} />
                            <Text style={s.statusText}>Active</Text>
                          </View>
                        ) : (
                          <Text style={s.expiredText}>Expired</Text>
                        )}
                        {!isActive && (
                          <TouchableOpacity style={[s.actionBtn, { borderColor: colors.border }]} onPress={() => router.push('/plans')}>
                            <IconRefresh size={12} color="#fff" />
                            <Text style={s.actionBtnText}>Renew</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {/* Action row */}
                      {isActive && (
                        <View style={s.actionRow}>
                          {/* Book Slot: for same_gym/day_pass go to specific gym; for multi_gym go to explore */}
                          <TouchableOpacity
                            style={[s.actionBtn, s.bookBtn]}
                            onPress={() => {
                              if (planType === 'multi_gym') {
                                router.push('/(tabs)/explore' as any);
                              } else if (firstGymId) {
                                router.push({ pathname: '/gym/[id]', params: { id: firstGymId } } as any);
                              } else {
                                router.push('/(tabs)/explore' as any);
                              }
                            }}
                          >
                            <IconCalendar size={12} color="#000" />
                            <Text style={[s.actionBtnText, { color: '#000' }]}>{planType === 'multi_gym' ? 'Find Gym' : 'Book Slot'}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity style={s.newBtn} onPress={() => router.push('/plans')}>
            <Text style={s.newBtnText}>+ New Subscription</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: 16 },
  subCard: { borderRadius: radius.xl, marginBottom: 14, overflow: 'hidden' },
  subImg: { minHeight: 220 },
  subAurora: { ...StyleSheet.absoluteFillObject },
  subDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  subBody: { padding: 16, justifyContent: 'space-between', flex: 1 },
  subGym: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', letterSpacing: -0.3 },
  subPlan: { fontFamily: fonts.sans, fontSize: 11, color: colors.t, marginTop: 3 },
  barWrap: { marginTop: 14 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  barFillDim: { opacity: 0.3 },
  subFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  statusActive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },
  expiredText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.accentBorder,
  },
  bookBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#fff' },
  newBtn: {
    height: 50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  newBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  browseBtn: {
    marginTop: 8, paddingHorizontal: 28, height: 46, borderRadius: 30,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  browseBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#000' },
});
