import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconRefresh, IconDumbbell, IconCalendar, IconTicket } from '../../components/Icons';
import { subscriptionsApi } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

const FALLBACK_SUBS = [
  { id: 's1', planType: 'multi_gym', gymIds: [], gym: { name: 'PowerZone Fitness' }, plan: { name: 'Multi Gym Pass' }, durationMonths: 3, startDate: '2025-04-14', endDate: '2025-07-14', status: 'active' },
  { id: 's2', planType: 'same_gym', gymIds: [], gym: { name: 'FitHub Pro' }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-28', endDate: '2025-04-28', status: 'active' },
  { id: 's3', planType: 'same_gym', gymIds: [], gym: { name: 'IronBody Gym' }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-01', endDate: '2025-03-31', status: 'expired' },
];

const PLAN_COLOR: Record<string, string> = {
  day_pass: '#60A5FA',
  same_gym: colors.accent,
  multi_gym: '#A78BFA',
};
const PLAN_BADGE_LABEL: Record<string, string> = {
  day_pass: '1 DAY PASS',
  same_gym: 'SAME GYM',
  multi_gym: 'MULTI GYM',
};

function calcProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now >= end) return 1;
  if (now <= start) return 0;
  return (now - start) / (end - start);
}

function totalDays(startDate: string, endDate: string) {
  return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
}

function usedDays(startDate: string, endDate: string) {
  const total = totalDays(startDate, endDate);
  return Math.min(total, Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function derivePlanType(sub: any): string {
  if (sub.planType) return sub.planType;
  const pname = (sub.plan?.name || sub.planName || '').toLowerCase();
  if (pname.includes('multi')) return 'multi_gym';
  if (pname.includes('day')) return 'day_pass';
  return 'same_gym';
}

function SkeletonCard() {
  return <View style={[s.subCard, { height: 200, backgroundColor: 'rgba(255,255,255,0.06)' }]} />;
}

export default function Subscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          <Text style={s.title}>My Memberships</Text>

          {loading ? (
            [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          ) : subs.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <IconDumbbell size={48} color={colors.t3} />
              </View>
              <Text style={s.emptyTitle}>No Active Memberships</Text>
              <Text style={s.emptyBody}>Purchase a pass to start booking gym sessions.</Text>
              <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)/explore' as any)}>
                <Text style={s.browseBtnText}>Browse Gyms</Text>
              </TouchableOpacity>
            </View>
          ) : (
            subs.map((sub: any) => {
              const subId = sub.id || sub._id;
              const planType = derivePlanType(sub);
              const status = (sub.status || 'active').toLowerCase();
              const isActive = status === 'active';
              const planColor = isActive ? (PLAN_COLOR[planType] || colors.accent) : colors.t3;
              const badgeLabel = PLAN_BADGE_LABEL[planType] || 'PASS';

              const gymDisplayName =
                planType === 'multi_gym'
                  ? 'All Partner Gyms'
                  : (sub.gymName || sub.gym?.name || (planType === 'day_pass' ? 'Selected Gym' : 'Your Gym'));

              const validityText =
                planType === 'day_pass'
                  ? (sub.startDate ? `Valid: ${fmtDate(sub.startDate)}` : 'Day Pass')
                  : (sub.startDate && sub.endDate ? `${fmtDate(sub.startDate)} – ${fmtDate(sub.endDate)}` : '');

              const progress = sub.startDate && sub.endDate
                ? calcProgress(sub.startDate, sub.endDate)
                : (sub.progress ?? 0.5);
              const used = sub.startDate && sub.endDate ? usedDays(sub.startDate, sub.endDate) : 0;
              const total = sub.startDate && sub.endDate ? totalDays(sub.startDate, sub.endDate) : 0;

              const gymIds: string[] = sub.gymIds || (sub.gymId ? [sub.gymId] : []);
              const firstGymId = gymIds[0] || sub.gym?._id || sub.gym?.id || '';

              return (
                <TouchableOpacity
                  key={subId}
                  activeOpacity={0.9}
                  style={[s.subCard, !isActive && { opacity: 0.72 }]}
                  onPress={() => router.push({ pathname: '/subscription-detail', params: { subscriptionId: subId } } as any)}
                >
                  {/* Top accent bar */}
                  <View style={[s.accentBar, { backgroundColor: planColor }]} />

                  <View style={s.cardBody}>
                    {/* Pass type badge */}
                    <View style={[s.passTypeBadge, { backgroundColor: `${planColor}20` }]}>
                      <Text style={[s.passTypeBadgeText, { color: planColor }]}>{badgeLabel}</Text>
                    </View>

                    {/* Gym name */}
                    <Text style={s.gymNameText} numberOfLines={1}>{gymDisplayName}</Text>

                    {/* Validity */}
                    {!!validityText && <Text style={s.validityText}>{validityText}</Text>}

                    {/* Progress bar */}
                    {total > 0 && (
                      <>
                        <View style={s.progressTrack}>
                          <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: planColor }]} />
                        </View>
                        <Text style={s.progressLabel}>{used} / {total} days used</Text>
                      </>
                    )}

                    {/* Status badge + action row */}
                    <View style={s.statusRow}>
                      {isActive ? (
                        <View style={s.statusActivePill}>
                          <View style={[s.statusDot, { backgroundColor: colors.accent }]} />
                          <Text style={s.statusActiveText}>ACTIVE</Text>
                        </View>
                      ) : (
                        <View style={s.statusExpiredPill}>
                          <Text style={s.statusExpiredText}>EXPIRED</Text>
                        </View>
                      )}

                      {!isActive && (
                        <TouchableOpacity
                          style={s.ghostBtn}
                          onPress={(e) => { e.stopPropagation(); router.push('/plans'); }}
                        >
                          <IconRefresh size={12} color={colors.t} />
                          <Text style={s.ghostBtnText}>Renew</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Action buttons */}
                    {isActive && (
                      <View style={s.actionRow}>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: planColor }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (planType === 'multi_gym') {
                              router.push('/(tabs)/explore' as any);
                            } else if (firstGymId) {
                              router.push({ pathname: '/gym/[id]', params: { id: firstGymId } } as any);
                            } else {
                              router.push('/(tabs)/explore' as any);
                            }
                          }}
                        >
                          <IconCalendar size={13} color="#060606" />
                          <Text style={[s.actionBtnText, { color: '#060606' }]}>
                            {planType === 'multi_gym' ? 'Find a Gym' : 'Book Slot'}
                          </Text>
                        </TouchableOpacity>

                        {planType === 'multi_gym' && (
                          <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' }]}
                            onPress={(e) => { e.stopPropagation(); router.push('/multi-gym-network' as any); }}
                          >
                            <Text style={[s.actionBtnText, { color: '#A78BFA' }]}>View Partner Gyms</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
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
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.sansBold, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginBottom: 16 },

  subCard: {
    marginHorizontal: 0, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  accentBar: { height: 3, width: '100%' },
  cardBody: { padding: 18 },
  passTypeBadge: {
    alignSelf: 'flex-start', borderRadius: radius.xs,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
  },
  passTypeBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1 },
  gymNameText: { fontFamily: fonts.sansBold, fontSize: 21, color: '#fff', marginBottom: 4 },
  validityText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginBottom: 14 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusActivePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusActiveText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent, letterSpacing: 0.8 },
  statusExpiredPill: {},
  statusExpiredText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2, letterSpacing: 0.8 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 11, borderRadius: radius.md,
  },
  actionBtnText: { fontFamily: fonts.sansBold, fontSize: 13 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  ghostBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.t },

  newBtn: {
    height: 50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  newBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 20, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, textAlign: 'center', maxWidth: 260 },
  browseBtn: {
    marginTop: 8, paddingHorizontal: 28, height: 46, borderRadius: 30,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  browseBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#000' },
});
