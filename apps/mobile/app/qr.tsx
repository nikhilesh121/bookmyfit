import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { qrApi, subscriptionsApi, gymsApi } from '../lib/api';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconBolt, IconRefresh } from '../components/Icons';
import AuroraBackground from '../components/AuroraBackground';

// expo-screen-capture requires a dev build — gracefully skip in Expo Go
let usePreventScreenCapture: (() => void) | null = null;
try {
  usePreventScreenCapture = require('expo-screen-capture').usePreventScreenCapture;
} catch {}

export default function QRScreen() {
  if (usePreventScreenCapture) usePreventScreenCapture();
  const params = useLocalSearchParams<{ gymId?: string; subId?: string }>();
  const routeGymId = params.gymId as string | undefined;
  const routeSubId = params.subId as string | undefined;

  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [loading, setLoading] = useState(false);
  const [subId, setSubId] = useState<string | null>(routeSubId || null);
  const [gymName, setGymName] = useState<string | null>(null);

  // Fetch gym name if gymId provided
  useEffect(() => {
    if (!routeGymId) return;
    gymsApi.getById(routeGymId)
      .then((data: any) => {
        const gName = data?.gym?.name || data?.name;
        if (gName) setGymName(gName);
      })
      .catch(() => {});
  }, [routeGymId]);

  useEffect(() => {
    if (routeSubId) {
      setSubId(routeSubId);
      generateWithId(routeSubId);
    } else {
      subscriptionsApi.mySubscriptions()
        .then((data: any) => {
          const subs = Array.isArray(data) ? data : data?.subscriptions || data?.data || [];
          const active = subs.find((s: any) => s.status === 'active' || s.isActive);
          if (active) {
            const id = active._id || active.id;
            setSubId(id);
            generateWithId(id);
          } else {
            generateWithId(null);
          }
        })
        .catch(() => generateWithId(null));
    }
  }, []);

  const generateWithId = async (id: string | null) => {
    setLoading(true);
    try {
      if (id) {
        const res = await qrApi.generate(id);
        const baseToken = res.token || res.qrToken || ('BMF-' + Date.now());
        setToken(routeGymId ? baseToken + '|GYM:' + routeGymId : baseToken);
      } else {
        setToken('BMF-DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase());
      }
      setRemaining(30);
    } catch {
      setToken('BMF-DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase());
      setRemaining(30);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          generateWithId(subId);
          return 30;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [token, subId]);

  return (
    <AuroraBackground variant="default">
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Check-In QR</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={s.badge}>
          <IconBolt size={10} color={colors.accent} />
          <Text style={s.badgeText}>BMF Member Pass</Text>
        </View>

        {!!gymName && (
          <View style={s.gymBadge}>
            <Text style={s.gymBadgeText}>{gymName}</Text>
          </View>
        )}

        <View style={s.qrFrame}>
          {loading || !token ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <View style={s.tokenBox}>
              <Text style={s.tokenLabel}>SCAN TOKEN</Text>
              <Text style={s.tokenText} numberOfLines={3} adjustsFontSizeToFit>{token}</Text>
            </View>
          )}
        </View>

        <View style={s.timerWrap}>
          <View style={s.timerCircle}>
            <Text style={s.timerNum}>{remaining}</Text>
          </View>
          <Text style={s.timerLabel}>Refreshes every 30 seconds</Text>
        </View>

        <View style={s.memberCard}>
          <Text style={s.memberLabel}>Token Preview</Text>
          <Text style={s.memberId} numberOfLines={1}>
            {token ? token.slice(0, 24) + (token.length > 24 ? '...' : '') : '-'}
          </Text>
        </View>

        <TouchableOpacity style={s.shareBtn} onPress={() => generateWithId(subId)}>
          <IconRefresh size={14} color="#fff" />
          <Text style={s.shareBtnText}>Refresh Token</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22, alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginTop: 8, marginBottom: 24,
  },
  back: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 10,
  },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 0.5 },
  gymBadge: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 14,
  },
  gymBadgeText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t },
  qrFrame: {
    width: 220, height: 220, borderRadius: radius.xl,
    backgroundColor: colors.glass, borderWidth: 2, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, padding: 20,
  },
  tokenBox: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  tokenLabel: {
    fontFamily: fonts.sansBold, fontSize: 9, color: colors.accent,
    letterSpacing: 3, marginBottom: 14,
  },
  tokenText: {
    fontFamily: fonts.sansBold, fontSize: 12, color: '#fff',
    textAlign: 'center', letterSpacing: 1.5, lineHeight: 20,
  },
  timerWrap: { alignItems: 'center', gap: 6, marginBottom: 16 },
  timerCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  timerNum: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.accent },
  timerLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  memberCard: {
    width: '100%', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 14, alignItems: 'center', marginBottom: 16,
  },
  memberLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 4 },
  memberId: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', letterSpacing: 1 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 50, borderRadius: radius.xl,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  shareBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
});
