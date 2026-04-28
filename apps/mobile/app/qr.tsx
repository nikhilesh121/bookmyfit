import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import AuroraBackground from '../components/AuroraBackground';
import { IconArrowLeft, IconClock, IconCheck } from '../components/Icons';
import { colors, fonts, radius } from '../theme/brand';
import { qrApi } from '../lib/api';

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function QrScreen() {
  const params = useLocalSearchParams<{
    token?: string; expiresAt?: string; gymId?: string; gymName?: string; bookedAt?: string;
  }>();

  const [token, setToken] = useState<string | null>(params.token || null);
  const [expiresAt, setExpiresAt] = useState<string | null>(params.expiresAt || null);
  const [bookedAt, setBookedAt] = useState<string | null>(params.bookedAt || null);
  const [gymName, setGymName] = useState<string>(params.gymName || '');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(!params.token);
  const [noBooking, setNoBooking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load active booking if no params provided
  useEffect(() => {
    if (!params.token) {
      qrApi.getActiveBooking().then((res: any) => {
        if (res?.active && res.bookingQr) {
          setToken(res.bookingQr.token);
          setExpiresAt(res.bookingQr.expiresAt);
          setBookedAt(res.bookingQr.bookedAt);
          setGymName(res.bookingQr.gymName || '');
        } else {
          setNoBooking(true);
        }
      }).catch(() => setNoBooking(true)).finally(() => setLoading(false));
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expiresAt]);

  const isExpired = secondsLeft <= 0 && expiresAt !== null;
  const validUntil = expiresAt ? formatDateTime(expiresAt) : '';
  const bookedAtFormatted = bookedAt ? formatDateTime(bookedAt) : '';

  if (loading) {
    return (
      <AuroraBackground>
        <SafeAreaView style={s.root}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[s.sub, { marginTop: 16 }]}>Loading your session QR…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (noBooking || !token) {
    return (
      <AuroraBackground>
        <SafeAreaView style={s.root}>
          <View style={s.header}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <IconArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={s.title}>Session QR</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <IconClock size={32} color={colors.t2} />
            </View>
            <Text style={s.emptyTitle}>No Active Session</Text>
            <Text style={s.emptySub}>Book a slot to get your session QR code for check-in.</Text>
            {params.gymId ? (
              <TouchableOpacity style={s.bookBtn} onPress={() => router.push({ pathname: '/slots', params: { gymId: params.gymId } } as any)}>
                <Text style={s.bookBtnText}>Book a Slot</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/gyms' as any)}>
                <Text style={s.bookBtnText}>Find a Gym</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <SafeAreaView style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Session QR</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={s.content}>
          {/* Gym name */}
          {gymName ? (
            <View style={s.gymBadge}>
              <Text style={s.gymBadgeText}>{gymName}</Text>
            </View>
          ) : null}

          {/* Booking info */}
          {bookedAt && (
            <Text style={s.bookingInfo}>
              Booked at {bookedAtFormatted} · Valid until {validUntil}
            </Text>
          )}

          {/* QR box */}
          <View style={s.qrBox}>
            {isExpired && (
              <View style={s.expiredOverlay}>
                <Text style={s.expiredText}>Session Expired</Text>
              </View>
            )}
            <QRCode
              value={token}
              size={220}
              color={isExpired ? '#444' : '#fff'}
              backgroundColor="transparent"
            />
          </View>

          {/* 2-hour notice */}
          <Text style={s.notice}>
            Use it within 2 hours from your booking time
          </Text>

          {/* Timer */}
          {!isExpired ? (
            <View style={s.timerBox}>
              <IconClock size={16} color={secondsLeft < 600 ? '#FF4444' : colors.accent} />
              <Text style={[s.timerText, secondsLeft < 600 && { color: '#FF4444' }]}>
                {formatTime(secondsLeft)}
              </Text>
              <Text style={s.timerLabel}>remaining</Text>
            </View>
          ) : (
            <View style={[s.timerBox, { borderColor: 'rgba(255,68,68,0.3)' }]}>
              <Text style={[s.timerText, { color: '#FF4444' }]}>Expired</Text>
            </View>
          )}

          {/* Instructions */}
          <View style={s.steps}>
            {[
              'Walk into your booked gym',
              'Show this QR to the gym staff',
              'Staff scans to mark your check-in',
            ].map((step, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {isExpired && (
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/slots' as any)}>
              <Text style={s.bookBtnText}>Book Another Slot</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 12,
  },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 },
  gymBadge: {
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8,
  },
  gymBadgeText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  bookingInfo: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.t2,
    marginBottom: 20, textAlign: 'center',
  },
  qrBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: colors.borderGlass,
    marginBottom: 16, position: 'relative', overflow: 'hidden',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.75)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 24,
  },
  expiredText: { fontFamily: fonts.sansBold, fontSize: 18, color: '#FF4444' },
  notice: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.t2,
    textAlign: 'center', marginBottom: 16, lineHeight: 18,
  },
  timerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 24,
  },
  timerText: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.accent, letterSpacing: 2 },
  timerLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  steps: { width: '100%', gap: 10, marginBottom: 24 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },
  stepText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', textAlign: 'center' },
  emptySub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, textAlign: 'center', lineHeight: 20 },
  bookBtn: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  bookBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
