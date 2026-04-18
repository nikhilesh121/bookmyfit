import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconCheck, IconClose, IconRefresh } from '../components/Icons';

const ERROR_MAP: Record<string, string> = {
  ERR_DAILY_LIMIT: 'Already checked in today. Come back tomorrow!',
  ERR_QR_EXPIRED: 'QR expired — generate a new one from the app.',
  ERR_INVALID_GYM: 'This QR is not valid for this gym.',
  ERR_SUBSCRIPTION_INACTIVE: 'Your subscription is not active.',
  ERR_INVALID_TOKEN: 'Invalid QR token. Please regenerate.',
};

export default function CheckinResult() {
  const { success, gymName, error } = useLocalSearchParams<{
    success: string; gymName?: string; error?: string;
  }>();

  const isSuccess = success === 'true';
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 55, friction: 7, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  const errorMsg = ERROR_MAP[error || ''] || error || 'Check-in failed. Please try again.';

  return (
    <AuroraBackground variant="gym">
    <SafeAreaView style={s.root}>
      {/* Aurora bg */}
      <View style={[
        s.aurora,
        { backgroundColor: isSuccess ? 'rgba(204,255,0,0.12)' : 'rgba(255,60,60,0.10)' }
      ]} />
      <View style={[
        s.aurora2,
        { backgroundColor: isSuccess ? 'rgba(0,200,100,0.06)' : 'rgba(255,100,50,0.06)' }
      ]} />

      <View style={s.content}>
        {/* Icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[
            s.glowRing,
            {
              opacity: glowAnim,
              borderColor: isSuccess ? colors.accentBorder : 'rgba(255,60,60,0.3)',
            }
          ]} />
          <View style={[
            s.iconCircle,
            { backgroundColor: isSuccess ? colors.accent : 'rgba(255,60,60,0.9)' }
          ]}>
            {isSuccess
              ? <IconCheck size={44} color="#060606" />
              : <IconClose size={36} color="#fff" />
            }
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={s.kicker}>{isSuccess ? 'Access Granted' : 'Access Denied'}</Text>
        <Text style={s.title}>{isSuccess ? 'Checked In!' : 'Check-In Failed'}</Text>
        <Text style={s.subtitle}>
          {isSuccess
            ? 'Welcome back! Have a great workout.'
            : errorMsg
          }
        </Text>

        {/* Info card */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Gym</Text>
            <Text style={s.infoVal}>{gymName || 'BookMyFit Partner Gym'}</Text>
          </View>
          <View style={[s.infoRow, s.infoRowBorder]}>
            <Text style={s.infoLabel}>Time</Text>
            <Text style={s.infoVal}>{timeStr}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Date</Text>
            <Text style={s.infoVal}>{dateStr}</Text>
          </View>
        </View>

        {/* Actions */}
        {isSuccess ? (
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.back()}>
            <Text style={s.btnPrimaryText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={s.btnPrimary} onPress={() => router.replace('/qr')}>
              <IconRefresh size={16} color="#060606" />
              <Text style={s.btnPrimaryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={() => router.back()}>
              <Text style={s.btnGhostText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  aurora: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
    borderBottomLeftRadius: 300, borderBottomRightRadius: 300,
  },
  aurora2: {
    position: 'absolute', bottom: 0, left: '20%', width: 200, height: 200, borderRadius: 100,
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  glowRing: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    borderWidth: 2,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
  },
  kicker: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 10,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 36, color: '#fff',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.sans, fontSize: 14, color: colors.t,
    textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },
  card: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.xl, marginBottom: 28, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  infoRowBorder: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  infoLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  infoVal: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  btnPrimary: {
    width: '100%', height: 54, borderRadius: 30, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  btnGhost: {
    width: '100%', height: 54, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnGhostText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
});
