import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import { IconCalendar, IconQR, IconClock, IconPin } from '../../components/Icons';
import { qrApi } from '../../lib/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function BookingsTab() {
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qrApi.getActiveBooking()
      .then((res: any) => { if (res?.active && res.bookingQr) setActiveBooking(res.bookingQr); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const secsLeft = activeBooking
    ? Math.max(0, Math.floor((new Date(activeBooking.expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  const isExpired = activeBooking && secsLeft === 0;
  const hrs = Math.floor(secsLeft / 3600);
  const mins = Math.floor((secsLeft % 3600) / 60);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Bookings</Text>

        {loading ? (
          <View style={s.centre}><ActivityIndicator color={colors.accent} /></View>
        ) : activeBooking ? (
          <TouchableOpacity
            style={s.activeCard}
            activeOpacity={0.88}
            onPress={() => router.push({ pathname: '/qr', params: {
              token: activeBooking.token,
              expiresAt: activeBooking.expiresAt,
              bookedAt: activeBooking.bookedAt,
              gymName: activeBooking.gymName || '',
            }})}
          >
            <View style={s.activeTop}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Active Session</Text>
            </View>
            <Text style={s.gymNameText}>{activeBooking.gymName || 'Booked Gym'}</Text>
            <View style={s.metaRow}>
              <IconCalendar size={13} color={colors.t2} />
              <Text style={s.metaText}>{formatDate(activeBooking.bookedAt)} · {formatTime(activeBooking.bookedAt)}</Text>
            </View>
            {!isExpired && (
              <View style={s.timerRow}>
                <IconClock size={13} color={colors.accent} />
                <Text style={s.timerText}>
                  {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`} remaining
                </Text>
              </View>
            )}
            <View style={s.qrBtnRow}>
              <View style={s.qrBtn}>
                <IconQR size={16} color="#060606" />
                <Text style={s.qrBtnText}>Show QR</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIcon}><IconCalendar size={32} color={colors.t2} /></View>
            <Text style={s.emptyTitle}>No Active Bookings</Text>
            <Text style={s.emptySub}>Book a gym slot to see your active session here.</Text>
            <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={s.browseBtnText}>Browse Gyms</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  container: { padding: 22, paddingBottom: 48 },
  pageTitle: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', marginBottom: 20 },
  centre: { paddingTop: 60, alignItems: 'center' },
  activeCard: {
    backgroundColor: 'rgba(204,255,0,0.06)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(204,255,0,0.25)', padding: 20, gap: 10,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  gymNameText: { fontFamily: fonts.serif, fontSize: 22, color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
  qrBtnRow: { marginTop: 4 },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.pill,
    alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10,
  },
  qrBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#060606' },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: '#fff' },
  emptySub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  browseBtn: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  browseBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },
});
