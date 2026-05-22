import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import AuroraBackground from '../components/AuroraBackground';
import { IconArrowLeft, IconClock } from '../components/Icons';
import { colors, fonts, radius } from '../theme/brand';
import { qrApi } from '../lib/api';

// HH:MM:SS reverse countdown
function formatLong(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function textParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function decodeBase64Url(value: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  let output = '';
  let i = 0;

  while (i < padded.length) {
    const enc1 = chars.indexOf(padded.charAt(i++));
    const enc2 = chars.indexOf(padded.charAt(i++));
    const enc3 = chars.indexOf(padded.charAt(i++));
    const enc4 = chars.indexOf(padded.charAt(i++));
    if (enc1 < 0 || enc2 < 0) break;

    output += String.fromCharCode((enc1 << 2) | (enc2 >> 4));
    if (enc3 >= 0 && enc3 !== 64) output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2));
    if (enc4 >= 0 && enc4 !== 64) output += String.fromCharCode(((enc3 & 3) << 6) | enc4);
  }

  try {
    return decodeURIComponent(output.split('').map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
  } catch {
    return output;
  }
}

function decodeManualCodeFromToken(qrToken?: string | null) {
  if (!qrToken) return '';
  try {
    const payload = qrToken.split('.')[1];
    if (!payload) return '';
    const parsed = JSON.parse(decodeBase64Url(payload));
    return String(parsed.ref || parsed.bid || '').trim();
  } catch {
    return '';
  }
}

function firstManualCode(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const clean = String(value || '').trim();
    if (clean) return clean;
  }
  return '';
}

type QrMode = 'loading' | 'slot' | 'empty' | 'checked_in';

export default function QrScreen() {
  const params = useLocalSearchParams<{
    token?: string; expiresAt?: string; gymId?: string; gymName?: string; bookedAt?: string;
    bookingId?: string; bookingRef?: string; manualCode?: string;
  }>();
  const routeToken = textParam(params.token);
  const routeExpiresAt = textParam(params.expiresAt);
  const routeBookedAt = textParam(params.bookedAt);
  const routeGymName = textParam(params.gymName);
  const routeBookingId = textParam(params.bookingId);
  const routeBookingRef = textParam(params.bookingRef);
  const routeManualCode = textParam(params.manualCode);

  const [mode, setMode] = useState<QrMode>('loading');
  const [token, setToken] = useState<string | null>(routeToken || null);
  const [expiresAt, setExpiresAt] = useState<string | null>(routeExpiresAt || null);
  const [bookedAt, setBookedAt] = useState<string | null>(routeBookedAt || null);
  const [gymName, setGymName] = useState<string>(routeGymName);
  const [manualCode, setManualCode] = useState<string>(
    firstManualCode(routeManualCode, routeBookingRef, routeBookingId, decodeManualCodeFromToken(routeToken)),
  );
  const [secondsLeft, setSecondsLeft] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyBookingQr = (bookingQr: any) => {
    const nextToken = bookingQr?.token || '';
    setToken(nextToken);
    setExpiresAt(bookingQr?.expiresAt || null);
    setBookedAt(bookingQr?.bookedAt || null);
    setGymName(bookingQr?.gymName || '');
    setManualCode(firstManualCode(
      bookingQr?.manualCode,
      bookingQr?.bookingRef,
      bookingQr?.bookingId,
      decodeManualCodeFromToken(nextToken),
    ));
  };

  // ── Bootstrap: QR is ONLY shown when a slot/session is actively booked ─────────
  useEffect(() => {
    if (routeToken && routeExpiresAt) {
      // QR passed via navigation params (e.g. right after booking a slot)
      setManualCode(firstManualCode(routeManualCode, routeBookingRef, routeBookingId, decodeManualCodeFromToken(routeToken)));
      setMode('slot');
      return;
    }
    (async () => {
      try {
        const booking: any = await qrApi.getActiveBooking();
        if (booking?.active && booking.bookingQr) {
          applyBookingQr(booking.bookingQr);
          setMode('slot');
          return;
        }
        if (booking?.checkedIn) {
          if (booking.bookingQr) applyBookingQr(booking.bookingQr);
          setMode('checked_in');
          return;
        }
      } catch { /* network/auth error — show empty */ }

      // No active slot booking → show empty state.
      // Subscriptions alone do NOT generate a QR — user must book a slot first.
      setMode('empty');
    })();
  }, [routeToken, routeExpiresAt, routeManualCode, routeBookingRef, routeBookingId]);

  // ── Reverse timer: counts from now down to expiresAt (= bookedAt + 2 hours) ───
  useEffect(() => {
    if (mode !== 'slot' || !expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [mode, expiresAt]);

  useEffect(() => {
    if (mode !== 'slot') return;

    const checkStatus = async () => {
      try {
        const booking: any = await qrApi.getActiveBooking();
        if (booking?.active && booking.bookingQr) {
          applyBookingQr(booking.bookingQr);
          return;
        }
        if (booking?.checkedIn) {
          if (booking.bookingQr) applyBookingQr(booking.bookingQr);
          setMode('checked_in');
          return;
        }
        setMode('empty');
      } catch {
        // Keep the current QR visible during temporary network failures.
      }
    };

    checkStatus();
    statusPollRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
  }, [mode, expiresAt]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  const isExpired = mode === 'slot' && secondsLeft <= 0 && expiresAt !== null;
  const visibleManualCode = firstManualCode(manualCode, decodeManualCodeFromToken(token));
  const isLowTime = secondsLeft > 0 && secondsLeft < 600; // < 10 min → red

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <AuroraBackground>
        <SafeAreaView style={s.root}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[s.sub, { marginTop: 16 }]}>Checking your bookings…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // ── No booked slot ────────────────────────────────────────────────────────────
  if (mode === 'empty' || mode === 'checked_in') {
    return (
      <AuroraBackground>
        <SafeAreaView style={s.root}>
          <View style={s.header}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <IconArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={s.title}>{mode === 'checked_in' ? 'Checked In' : 'Check-In QR'}</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={s.empty}>
            <View style={[s.emptyIcon, mode === 'checked_in' && { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft }]}>
              {mode === 'checked_in'
                ? <Text style={s.checkedIcon}>✓</Text>
                : <IconClock size={32} color={colors.t2} />}
            </View>
            <Text style={s.emptyTitle}>{mode === 'checked_in' ? 'Check-In Recorded' : 'No Booked Session'}</Text>
            <Text style={s.emptySub}>
              {mode === 'checked_in'
                ? 'Your gym check-in has been marked successfully. This QR is now closed and cannot be used again.'
                : 'Book a slot at a gym first. Your check-in QR will appear here once you have an active booking.'}
            </Text>
            {mode === 'checked_in' && gymName ? <Text style={s.checkedGym}>{gymName}</Text> : null}
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push((mode === 'checked_in' ? '/(tabs)/bookings' : '/gyms') as any)}>
              <Text style={s.bookBtnText}>{mode === 'checked_in' ? 'View My Bookings' : 'Browse Gyms & Book Slot'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.bookBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGlass, marginTop: 8 }]}
              onPress={() => router.push((mode === 'checked_in' ? '/gyms' : '/plans') as any)}
            >
              <Text style={[s.bookBtnText, { color: colors.t }]}>{mode === 'checked_in' ? 'Book Another Slot' : 'View Plans'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // ── Active slot booking → show QR ────────────────────────────────────────────
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
          {/* Gym name badge */}
          {gymName ? (
            <View style={s.gymBadge}>
              <Text style={s.gymBadgeText}>{gymName}</Text>
            </View>
          ) : null}

          {/* Booking timestamps */}
          {bookedAt && expiresAt && (
            <Text style={s.bookingInfo}>
              Booked {formatDateTime(bookedAt)} · Valid till {formatDateTime(expiresAt)}
            </Text>
          )}

          {/* QR code */}
          <View style={[s.qrBox, isExpired && { opacity: 0.5 }]}>
            {isExpired && (
              <View style={s.expiredOverlay}>
                <Text style={s.expiredText}>Session Expired</Text>
              </View>
            )}
            {token ? (
              <QRCode
                value={token}
                size={220}
                color={isExpired ? '#444' : '#fff'}
                backgroundColor="transparent"
              />
            ) : (
              <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}
          </View>

          {visibleManualCode ? (
            <View style={s.manualBox}>
              <Text style={s.manualLabel}>Manual Verification Code</Text>
              <Text selectable style={s.manualCode}>#{visibleManualCode}</Text>
              <Text style={s.manualHint}>If the camera does not scan, gym staff can enter this code manually.</Text>
            </View>
          ) : null}

          {/* Reverse countdown timer */}
          {!isExpired ? (
            <View style={s.timerBox}>
              <IconClock size={16} color={isLowTime ? '#FF4444' : colors.accent} />
              <Text style={[s.timerText, isLowTime && { color: '#FF4444' }]}>
                {formatLong(secondsLeft)}
              </Text>
              <Text style={s.timerLabel}>remaining</Text>
            </View>
          ) : (
            <View style={[s.timerBox, { borderColor: 'rgba(255,68,68,0.3)' }]}>
              <Text style={[s.timerText, { color: '#FF4444' }]}>00:00:00</Text>
              <Text style={[s.timerLabel, { color: '#FF4444' }]}>expired</Text>
            </View>
          )}

          <Text style={s.notice}>
            Show this QR to the gym staff. If scanning fails, share the manual code below the QR.
          </Text>

          {/* Steps */}
          <View style={s.steps}>
            {[
              'Walk into your booked gym',
              'Show this QR to the gym staff',
              'Staff scans the QR or enters the manual code',
            ].map((step, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {isExpired && (
            <TouchableOpacity style={s.bookBtn} onPress={() => router.push('/gyms' as any)}>
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
  manualBox: {
    width: '100%',
    backgroundColor: 'rgba(204,255,0,0.08)',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  manualLabel: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2, color: colors.t2, textTransform: 'uppercase' },
  manualCode: { fontFamily: fonts.sansBold, fontSize: 22, letterSpacing: 2, color: colors.accent, marginTop: 3 },
  manualHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 3, textAlign: 'center', lineHeight: 16 },
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
  timerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 16,
  },
  timerText: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.accent, letterSpacing: 2 },
  timerLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  notice: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.t2,
    textAlign: 'center', marginBottom: 20, lineHeight: 18,
  },
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
  checkedIcon: { fontFamily: fonts.sansBold, fontSize: 34, color: colors.accent },
  checkedGym: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bookBtn: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  bookBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
