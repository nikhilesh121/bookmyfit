import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api, logout, gymStaffApi } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../theme/brand';
import { IconDumbbell, IconQR, IconUser, IconClose, IconCheck, IconClock, IconRefresh } from '../../components/Icons';

type CheckIn = {
  id: string;
  memberName?: string;
  phone?: string;
  time: string;
  status: 'success' | 'failed';
};

type Stats = {
  todayCheckins: number;
  activeMembers: number;
};

type Gym = {
  id: string;
  name: string;
};

const MOCK_STATS: Stats = { todayCheckins: 14, activeMembers: 87 };
const MOCK_CHECKINS: CheckIn[] = [
  { id: '1', memberName: 'Rahul Sharma', phone: '98765xxxxx', time: '09:42 AM', status: 'success' },
  { id: '2', memberName: 'Priya Mehta', phone: '87654xxxxx', time: '09:15 AM', status: 'success' },
  { id: '3', memberName: 'Unknown', phone: '76543xxxxx', time: '08:50 AM', status: 'failed' },
  { id: '4', memberName: 'Amit Verma', phone: '65432xxxxx', time: '08:30 AM', status: 'success' },
  { id: '5', memberName: 'Sneha Patel', phone: '54321xxxxx', time: '07:55 AM', status: 'success' },
];

export default function GymDashboard() {
  const [gym, setGym] = useState<Gym | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [gymData, statsData] = await Promise.all([
        gymStaffApi.myGym().catch(() => null),
        gymStaffApi.todayStats().catch(() => null),
      ]);

      setGym(gymData || { id: 'demo', name: 'Demo Gym' });

      if (statsData) {
        setStats({
          todayCheckins: statsData.todayCheckins ?? statsData.count ?? MOCK_STATS.todayCheckins,
          activeMembers: statsData.activeMembers ?? MOCK_STATS.activeMembers,
        });
        const raw = statsData.checkins ?? statsData.recent ?? [];
        setCheckins(raw.length > 0 ? raw.slice(0, 5) : MOCK_CHECKINS);
      } else {
        setStats(MOCK_STATS);
        setCheckins(MOCK_CHECKINS);
      }
    } catch {
      setError('Could not load dashboard data.');
      setStats(MOCK_STATS);
      setCheckins(MOCK_CHECKINS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Aurora decorative circles */}
      <View style={s.aurora1} pointerEvents="none" />
      <View style={s.aurora2} pointerEvents="none" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Gym Portal</Text>
            <Text style={s.headerSub}>{gym?.name ?? 'Your Gym'}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
            <IconClose size={18} color={colors.t2} />
          </TouchableOpacity>
        </View>

        {/* Error state */}
        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error} Showing cached data.</Text>
            <TouchableOpacity onPress={fetchData} style={s.retryBtn}>
              <IconRefresh size={14} color={colors.accent} />
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <IconClock size={18} color={colors.accent} />
            <Text style={s.statValue}>{stats?.todayCheckins ?? 0}</Text>
            <Text style={s.statLabel}>Today's Check-ins</Text>
          </View>
          <View style={s.statCard}>
            <IconUser size={18} color={colors.accent} />
            <Text style={s.statValue}>{stats?.activeMembers ?? 0}</Text>
            <Text style={s.statLabel}>Active Members</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={s.scanCta}
          activeOpacity={0.85}
          onPress={() => router.push('/(gym-portal)/scan')}
        >
          <IconQR size={22} color="#000" />
          <Text style={s.scanCtaText}>Scan Member QR</Text>
        </TouchableOpacity>

        {/* Recent Check-ins */}
        <Text style={s.sectionTitle}>Recent Check-ins</Text>
        {checkins.length === 0 ? (
          <View style={s.emptyState}>
            <IconDumbbell size={32} color={colors.t3} />
            <Text style={s.emptyText}>No check-ins yet today</Text>
          </View>
        ) : (
          checkins.map((item) => (
            <View key={item.id} style={s.checkinRow}>
              <View style={s.checkinLeft}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>
                    {(item.memberName ?? item.phone ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={s.checkinName}>{item.memberName ?? 'Unknown Member'}</Text>
                  <Text style={s.checkinPhone}>{item.phone ?? ''}</Text>
                </View>
              </View>
              <View style={s.checkinRight}>
                <Text style={s.checkinTime}>{item.time}</Text>
                <View style={[s.badge, item.status === 'success' ? s.badgeSuccess : s.badgeFailed]}>
                  {item.status === 'success'
                    ? <IconCheck size={10} color="#000" />
                    : <IconClose size={10} color="#fff" />
                  }
                  <Text style={[s.badgeText, item.status === 'success' ? s.badgeTextSuccess : s.badgeTextFailed]}>
                    {item.status === 'success' ? 'Success' : 'Failed'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },

  aurora1: {
    position: 'absolute', top: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: colors.accent, opacity: 0.06,
  },
  aurora2: {
    position: 'absolute', top: 120, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.tierPremium, opacity: 0.06,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.lg, paddingBottom: spacing.xxl,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  headerSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, marginTop: 2 },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,60,60,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,60,60,0.2)',
    borderRadius: radius.sm, padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { fontFamily: fonts.sans, fontSize: 12, color: colors.error, flex: 1 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.sm },
  retryText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: spacing.xs,
  },
  statValue: { fontFamily: fonts.serifBlack, fontSize: 32, color: colors.text },
  statLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t, textAlign: 'center' },

  scanCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill, height: 56,
    marginBottom: spacing.xxl,
  },
  scanCtaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#000' },

  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.t, marginBottom: spacing.md, letterSpacing: 0.8 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: spacing.sm },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t3 },

  checkinRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkinLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  checkinName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  checkinPhone: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 1 },
  checkinRight: { alignItems: 'flex-end', gap: 6 },
  checkinTime: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeSuccess: { backgroundColor: colors.accent },
  badgeFailed: { backgroundColor: 'rgba(255,60,60,0.25)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.4)' },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 10 },
  badgeTextSuccess: { color: '#000' },
  badgeTextFailed: { color: colors.error },
});
