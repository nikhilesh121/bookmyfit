import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { gymStaffApi } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../theme/brand';
import { IconQR, IconCheck, IconClose, IconRefresh } from '../../components/Icons';

type ValidationResult = {
  success: boolean;
  memberName?: string;
  planType?: string;
  checkinTime?: string;
  errorMessage?: string;
  reason?: string;
};

export default function ScanScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      startPulse();
      gymStaffApi.myGym().then((g) => setGymId(g?.id ?? null)).catch(() => setGymId(null));
    }, [startPulse])
  );

  const handleValidate = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await gymStaffApi.validateQr(trimmed, gymId ?? '');
      if (data?.allowed === false) {
        setResult({
          success: false,
          errorMessage: data.reason || 'Check-in denied',
          reason: data.status || 'failed',
        });
      } else {
        setResult({
          success: true,
          memberName: data.user?.name ?? data.memberName ?? 'Member',
          planType: data.planType ?? 'Standard',
          checkinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
        // Auto reset after 5 seconds so next person can scan
        setTimeout(() => { setToken(''); setResult(null); }, 5000);
      }
    } catch (err: any) {
      setResult({
        success: false,
        errorMessage: err?.message ?? 'QR validation failed.',
        reason: err?.reason ?? 'Token may be expired or invalid.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setToken('');
    setResult(null);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.title}>Scan QR</Text>
        <Text style={s.subtitle}>Validate member access tokens</Text>

        {/* Animated scan frame */}
        <View style={s.frameContainer}>
          <View style={s.frame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
            <Animated.View style={[s.framePulse, { opacity: pulseAnim }]} />
            <IconQR size={52} color={colors.accent} />
          </View>
          <Text style={s.frameHint}>Position QR code in frame or paste token below</Text>
        </View>

        {/* Token input */}
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            value={token}
            onChangeText={setToken}
            placeholder="Paste or scan QR token here"
            placeholderTextColor={colors.t3}
            multiline={false}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleValidate}
          />
        </View>

        {/* Validate button */}
        {!result && (
          <TouchableOpacity
            style={[s.validateBtn, (!token.trim() || loading) && s.validateBtnDisabled]}
            onPress={handleValidate}
            disabled={!token.trim() || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={s.validateBtnText}>Validate Token</Text>
            }
          </TouchableOpacity>
        )}

        {/* Result card */}
        {result && (
          <View style={[s.resultCard, result.success ? s.resultCardSuccess : s.resultCardFailed]}>
            <View style={s.resultHeader}>
              <View style={[s.resultIcon, result.success ? s.resultIconSuccess : s.resultIconFailed]}>
                {result.success
                  ? <IconCheck size={20} color="#000" />
                  : <IconClose size={20} color="#fff" />
                }
              </View>
              <Text style={[s.resultTitle, result.success ? s.resultTitleSuccess : s.resultTitleFailed]}>
                {result.success ? 'Access Granted' : 'Access Denied'}
              </Text>
            </View>

            {result.success ? (
              <View style={s.resultDetails}>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Member</Text>
                  <Text style={s.resultValue}>{result.memberName}</Text>
                </View>
                <View style={s.resultDivider} />
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Plan</Text>
                  <Text style={s.resultValue}>{result.planType}</Text>
                </View>
                <View style={s.resultDivider} />
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Check-in Time</Text>
                  <Text style={s.resultValue}>{result.checkinTime}</Text>
                </View>
              </View>
            ) : (
              <View style={s.resultDetails}>
                <Text style={s.errorMessage}>{result.errorMessage}</Text>
                {result.reason && <Text style={s.errorReason}>{result.reason}</Text>}
              </View>
            )}

            <TouchableOpacity style={s.scanAnotherBtn} onPress={handleReset} activeOpacity={0.8}>
              <IconRefresh size={16} color={colors.accent} />
              <Text style={s.scanAnotherText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const FRAME_SIZE = 220;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.lg },

  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.text, marginBottom: 4 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.t, marginBottom: spacing.xxl },

  frameContainer: { alignItems: 'center', marginBottom: spacing.xxl },
  frame: {
    width: FRAME_SIZE, height: FRAME_SIZE,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  framePulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  frameHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 14, textAlign: 'center', maxWidth: 220 },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: colors.accent,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 12, right: 12, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 },

  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.text,
    height: 52,
    letterSpacing: 0.3,
  },

  validateBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill, height: 54,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  validateBtnDisabled: { opacity: 0.5 },
  validateBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },

  resultCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  resultCardSuccess: { borderColor: colors.accent, backgroundColor: 'rgba(61,255,84,0.06)' },
  resultCardFailed: { borderColor: 'rgba(255,60,60,0.5)', backgroundColor: 'rgba(255,60,60,0.06)' },

  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  resultIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  resultIconSuccess: { backgroundColor: colors.accent },
  resultIconFailed: { backgroundColor: 'rgba(255,60,60,0.25)' },
  resultTitle: { fontFamily: fonts.sansBold, fontSize: 18 },
  resultTitleSuccess: { color: colors.accent },
  resultTitleFailed: { color: colors.error },

  resultDetails: { padding: spacing.lg },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  resultLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.t },
  resultValue: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.text },
  resultDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  errorMessage: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.error, marginBottom: 6 },
  errorReason: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },

  scanAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  scanAnotherText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
});
