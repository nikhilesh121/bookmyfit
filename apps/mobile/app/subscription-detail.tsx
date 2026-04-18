import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconQR, IconRefresh, IconFileText, IconCalendar, IconDumbbell, IconBolt } from '../components/Icons';
import { subscriptionsApi } from '../lib/api';

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
  return `${days} days left`;
}

export default function SubscriptionDetail() {
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionsApi.mySubscriptions()
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : data?.subscriptions || data?.data || [];
        const found = list.find((s: any) => (s.id || s._id) === subscriptionId);
        setSub(found || list[0] || null);
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  if (loading) {
    return (
      <AuroraBackground variant="premium"><SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView></AuroraBackground>
    );
  }

  if (!sub) {
    return (
      <AuroraBackground variant="premium"><SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <IconDumbbell size={40} color={colors.accent} />
          <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: '#fff' }}>Subscription not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView></AuroraBackground>
    );
  }

  const gymName = sub.gym?.name || sub.gymName || 'Gym';
  const planName = sub.plan?.name || sub.planName || 'Plan';
  const duration = sub.durationMonths ? `${sub.durationMonths} Month${sub.durationMonths > 1 ? 's' : ''}` : '';
  const status = (sub.status || 'active').toLowerCase();
  const isActive = status === 'active';
  const img = sub.gym?.coverImage || sub.gym?.images?.[0] || sub.coverImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80';
  const progress = sub.progress ?? (sub.startDate && sub.endDate ? calcProgress(sub.startDate, sub.endDate) : 0.5);
  const left = sub.endDate ? daysLeft(sub.endDate) : (isActive ? 'Active' : 'Expired');
  const startFmt = sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const endFmt = sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const subId = sub.id || sub._id;

  return (
    <AuroraBackground variant="premium">
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <IconArrowLeft size={18} color={colors.t} />
          </TouchableOpacity>
          <Text style={s.title}>Subscription Detail</Text>
        </View>

        {/* Hero card */}
        <View style={[s.heroCard, !isActive && { opacity: 0.8 }]}>
          <ImageBackground source={{ uri: img }} style={s.heroImg} imageStyle={{ borderRadius: radius.xl }}>
            <View style={s.heroDark} />
            <View style={s.heroBody}>
              <View>
                <View style={s.tierBadge}>
                  <IconBolt size={10} color={isActive ? colors.accent : colors.t2} />
                  <Text style={[s.tierText, !isActive && { color: colors.t2 }]}>{isActive ? 'Active' : 'Expired'}</Text>
                </View>
                <Text style={s.gymName}>{gymName}</Text>
                <Text style={s.planName}>{planName}{duration ? ` · ${duration}` : ''}</Text>
              </View>
              <View style={s.barWrap}>
                <View style={s.barLabels}>
                  <Text style={s.barLabel}>Started {startFmt}</Text>
                  <Text style={[s.barLabel, isActive ? { color: 'rgba(255,150,50,0.85)' } : { color: 'rgba(255,80,80,0.7)' }]}>{left}</Text>
                </View>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${Math.min(progress * 100, 100)}%` }, !isActive && { opacity: 0.3 }]} />
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Details */}
        <View style={s.detailCard}>
          <View style={s.detailRow}>
            <View style={s.detailIconBox}><IconCalendar size={14} color={colors.accent} /></View>
            <View>
              <Text style={s.detailLabel}>Valid From</Text>
              <Text style={s.detailValue}>{startFmt}</Text>
            </View>
          </View>
          <View style={[s.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={s.detailIconBox}><IconCalendar size={14} color={colors.t} /></View>
            <View>
              <Text style={s.detailLabel}>Valid Until</Text>
              <Text style={s.detailValue}>{endFmt}</Text>
            </View>
          </View>
          <View style={[s.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={s.detailIconBox}><IconDumbbell size={14} color={colors.t} /></View>
            <View>
              <Text style={s.detailLabel}>Gym</Text>
              <Text style={s.detailValue}>{gymName}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {isActive && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => router.push({ pathname: '/qr', params: { subscriptionId: subId } } as any)}
          >
            <IconQR size={16} color="#000" />
            <Text style={s.actionBtnText}>Generate QR Code</Text>
          </TouchableOpacity>
        )}

        {!isActive && (
          <TouchableOpacity style={[s.actionBtn, s.actionBtnSecondary]} onPress={() => router.push('/plans')}>
            <IconRefresh size={16} color={colors.accent} />
            <Text style={[s.actionBtnText, { color: colors.accent }]}>Renew Subscription</Text>
          </TouchableOpacity>
        )}

        {/* Download Invoice */}
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnGhost]}
          onPress={() => router.push({ pathname: '/invoice', params: { subscriptionId: subId } } as any)}
        >
          <IconFileText size={16} color={colors.t} />
          <Text style={[s.actionBtnText, { color: colors.t }]}>Download Invoice</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  heroCard: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 16 },
  heroImg: { minHeight: 200 },
  heroDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },
  heroBody: { padding: 18, justifyContent: 'space-between', flex: 1, minHeight: 200 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder, marginBottom: 8,
  },
  tierText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.accent, letterSpacing: 0.5 },
  gymName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  planName: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, marginTop: 4 },
  barWrap: { marginTop: 18 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  detailCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  detailIconBox: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: colors.glassDark, alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, marginBottom: 2 },
  detailValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: '#fff' },
  actionBtn: {
    height: 52, borderRadius: radius.lg,
    backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  actionBtnSecondary: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder },
  actionBtnGhost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass },
  actionBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
});
