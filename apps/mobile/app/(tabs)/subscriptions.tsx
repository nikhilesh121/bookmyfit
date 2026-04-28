import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconRefresh, IconDumbbell, IconCalendar, IconArrowRight } from '../../components/Icons';
import { subscriptionsApi } from '../../lib/api';
import AuroraBackground from '../../components/AuroraBackground';

// Fallback with gym IDs so "Book Slot" can navigate
const FALLBACK_SUBS = [
  { id: 's1', planType: 'multi_gym', gymIds: [], gym: { id: '1', name: 'All Partner Gyms', images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'] }, plan: { name: 'Multi Gym Pass' }, durationMonths: 3, startDate: '2025-04-14', endDate: '2025-07-14', status: 'active' },
  { id: 's2', planType: 'same_gym', gymIds: ['2'], gymId: '2', gym: { id: '2', name: 'Anytime Fitness', images: ['https://images.unsplash.com/photo-1532384661954-a0e26f4f065c?w=600&q=80'] }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-28', endDate: '2025-05-28', status: 'active' },
  { id: 's3', planType: 'same_gym', gymIds: ['3'], gymId: '3', gym: { id: '3', name: "Gold's Gym", images: ['https://images.unsplash.com/photo-1549476464-37392f717541?w=600&q=80'] }, plan: { name: 'Same Gym Pass' }, durationMonths: 1, startDate: '2025-03-01', endDate: '2025-03-31', status: 'expired' },
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
          {/* Header */}
          <View style={s.pageHeader}>
            <Text style={s.pageTitle}>My Memberships</Text>
            <Text style={s.pageSub}>Your active passes & subscriptions</Text>
          </View>

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
                  ? 'Multi Gym Pass'
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
              const daysLeftNum = sub.endDate
                ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000))
                : null;

              // Resolve gym ID for navigation
              const gymIds: string[] = sub.gymIds || (sub.gymId ? [sub.gymId] : []);
              const firstGymId = gymIds[0] || sub.gym?.id || sub.gym?._id || sub.gymId || '';

              const heroImg = sub.gym?.images?.[0] || sub.gym?.coverImage ||
                'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80';

              const handleBookSlot = (e: any) => {
                e.stopPropagation();
                if (planType === 'multi_gym') {
                  router.push('/gyms' as any);
                } else if (firstGymId) {
                  router.push({ pathname: '/gym/[id]', params: { id: firstGymId } } as any);
                } else {
                  // No gym ID — go to gym listing so user can pick
                  router.push('/gyms' as any);
                }
              };

              return (
                <TouchableOpacity
                  key={subId}
                  activeOpacity={0.9}
                  style={[s.subCard, !isActive && { opacity: 0.72 }]}
                  onPress={() => router.push({ pathname: '/subscription-detail', params: { subscriptionId: subId } } as any)}
                >
                  {/* Hero image with overlay */}
                  <ImageBackground source={{ uri: heroImg }} style={s.heroImg} imageStyle={{ borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}>
                    <View style={s.heroDark} />
                    <View style={s.heroContent}>
                      <View style={[s.passTypeBadge, { backgroundColor: `${planColor}30`, borderColor: `${planColor}60` }]}>
                        <Text style={[s.passTypeBadgeText, { color: planColor }]}>{badgeLabel}</Text>
                      </View>
                      <Text style={s.gymNameText} numberOfLines={1}>{gymDisplayName}</Text>
                      {!!validityText && <Text style={s.validityHero}>{validityText}</Text>}
                    </View>
                    {/* Days left chip */}
                    {isActive && daysLeftNum !== null && (
                      <View style={s.daysChip}>
                        <Text style={s.daysChipText}>{daysLeftNum}d left</Text>
                      </View>
                    )}
                    {!isActive && (
                      <View style={[s.daysChip, { backgroundColor: 'rgba(255,60,60,0.85)' }]}>
                        <Text style={s.daysChipText}>Expired</Text>
                      </View>
                    )}
                  </ImageBackground>

                  {/* Bottom bar */}
                  <View style={s.cardBottom}>
                    {/* Progress */}
                    {total > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <View style={s.progressTrack}>
                          <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: planColor }]} />
                        </View>
                        <Text style={s.progressLabel}>{used} / {total} days used</Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    {isActive ? (
                      <View style={s.actionRow}>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: planColor }]}
                          onPress={handleBookSlot}
                        >
                          <IconCalendar size={13} color="#060606" />
                          <Text style={[s.actionBtnText, { color: '#060606' }]}>
                            {planType === 'multi_gym' ? 'Find a Gym' : 'Book Slot'}
                          </Text>
                        </TouchableOpacity>

                        {planType === 'multi_gym' && (
                          <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' }]}
                            onPress={(e) => { e.stopPropagation(); router.push('/multi-gym-network' as any); }}
                          >
                            <Text style={[s.actionBtnText, { color: '#A78BFA' }]}>Partner Gyms</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={s.detailBtn}
                          onPress={() => router.push({ pathname: '/subscription-detail', params: { subscriptionId: subId } } as any)}
                        >
                          <IconArrowRight size={14} color={colors.t2} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.renewBtn}
                        onPress={(e) => { e.stopPropagation(); router.push('/plans'); }}
                      >
                        <IconRefresh size={13} color={colors.accent} />
                        <Text style={s.renewBtnText}>Renew Subscription</Text>
                      </TouchableOpacity>
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
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  pageHeader: { marginBottom: 20, paddingHorizontal: 4 },
  pageTitle: { fontFamily: fonts.serif, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  pageSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 4 },

  subCard: {
    marginBottom: 16,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // Hero image area
  heroImg: { height: 160 },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  heroContent: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  passTypeBadge: {
    alignSelf: 'flex-start', borderRadius: radius.xs, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  passTypeBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2 },
  gymNameText: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.3 },
  validityHero: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  daysChip: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  daysChipText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#fff' },

  // Bottom card section
  cardBottom: {
    backgroundColor: 'rgba(10,10,10,0.95)',
    padding: 14,
  },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 5 },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginBottom: 2 },

  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md,
  },
  actionBtnText: { fontFamily: fonts.sansBold, fontSize: 12 },
  detailBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  renewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  renewBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },

  newBtn: {
    height: 50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    backgroundColor: colors.accentSoft,
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
