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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { gymStaffApi, qrApi } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../theme/brand';
import { IconQR, IconCheck, IconClose, IconRefresh } from '../../components/Icons';

/** QR tokens are JWT-shaped; manual codes are booking refs/IDs. */
function isQrToken(value: string) {
  return value.split('.').length === 3;
}

type ValidationResult = {
  success: boolean;
  memberName?: string;
  planType?: string;
  bookingRef?: string;
  checkinTime?: string;
  errorMessage?: string;
  reason?: string;
};

export default function ScanScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'scan' | 'show'>(params.mode === 'show' ? 'show' : 'scan');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymLoading, setGymLoading] = useState(false);
  const [gymQr, setGymQr] = useState<{ token: string; gymName?: string } | null>(null);
  const [gymQrError, setGymQrError] = useState('');
  const [gymQrLoading, setGymQrLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<any>(null);

  const showResult = useCallback((next: ValidationResult) => {
    setResult(next);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    if (!next.success) {
      const detail = [next.errorMessage, next.reason].filter(Boolean).join('\n');
      Alert.alert('Check-in Denied', detail || 'Could not validate this QR code.');
    }
  }, []);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const loadGymId = useCallback(async () => {
    setGymLoading(true);
    try {
      const data: any = await gymStaffApi.myGym();
      const nextGymId = data?._id || data?.id || null;
      setGymId(nextGymId);
      return nextGymId;
    } catch {
      setGymId(null);
      return null;
    } finally {
      setGymLoading(false);
    }
  }, []);

  const loadGymQr = useCallback(async () => {
    setGymQrLoading(true);
    setGymQrError('');
    try {
      const data: any = await qrApi.gymCode();
      if (!data?.token) throw new Error('Gym QR token was not returned.');
      setGymQr({ token: data.token, gymName: data.gymName });
    } catch (err: any) {
      setGymQr(null);
      setGymQrError(err?.message || 'Could not load the gym QR.');
    } finally {
      setGymQrLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const requestedMode = params.mode === 'show' ? 'show' : 'scan';
      setMode(requestedMode);
      startPulse();
      loadGymId();
      if (requestedMode === 'show') loadGymQr();
    }, [params.mode, startPulse, loadGymId, loadGymQr])
  );

  const selectMode = (nextMode: 'scan' | 'show') => {
    setMode(nextMode);
    setCameraActive(false);
    setResult(null);
    if (nextMode === 'show' && !gymQr) loadGymQr();
  };

  const handleValidate = async (tokenOverride?: string) => {
    const trimmed = (tokenOverride ?? token).trim();
    if (!trimmed) return;

    const activeGymId = gymId || await loadGymId();

    if (!isQrToken(trimmed)) {
      setLoading(true);
      setResult(null);
      try {
        const data = await qrApi.validateManual(trimmed, activeGymId || undefined);
        showResult({
          success: true,
          memberName: data.user?.name ?? (data.user?.id ? `Member ${String(data.user.id).slice(0, 8)}` : 'Member'),
          planType: data.planType ?? 'Manual Check-in',
          bookingRef: data.bookingRef,
          checkinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
        setTimeout(() => { setToken(''); setResult(null); }, 5000);
      } catch (err: any) {
        showResult({
          success: false,
          errorMessage: err?.message ?? 'Manual check-in failed.',
          reason: err?.reason ?? 'Booking ref may be invalid or outside the booked slot time.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await qrApi.validate(trimmed, activeGymId || undefined);
      if (data?.success === false) {
        showResult({
          success: false,
          errorMessage: data.message || 'Check-in denied',
          reason: data.reason || '',
        });
      } else {
        showResult({
          success: true,
          memberName: data.user?.name ?? (data.user?.id ? `Member ${String(data.user.id).slice(0, 8)}` : 'Member'),
          planType: data.planType ?? 'QR Check-in',
          bookingRef: data.bookingRef,
          checkinTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
        // Auto reset after 5 seconds so next person can scan
        setTimeout(() => { setToken(''); setResult(null); }, 5000);
      }
    } catch (err: any) {
      showResult({
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
    setScanned(false);
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan QR codes.');
        return;
      }
    }
    setCameraActive(true);
    setScanned(false);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCameraActive(false);
    setToken(data);
    handleValidate(data);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.title}>Check-in QR</Text>
        <Text style={s.subtitle}>
          {mode === 'scan' ? 'Scan a member pass or enter its manual code' : 'Members can scan this fixed QR to check in'}
        </Text>

        <View style={s.modeSwitch}>
          <TouchableOpacity style={[s.modeButton, mode === 'scan' && s.modeButtonActive]} onPress={() => selectMode('scan')}>
            <Text style={[s.modeButtonText, mode === 'scan' && s.modeButtonTextActive]}>Scan Member</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modeButton, mode === 'show' && s.modeButtonActive]} onPress={() => selectMode('show')}>
            <Text style={[s.modeButtonText, mode === 'show' && s.modeButtonTextActive]}>Show Gym QR</Text>
          </TouchableOpacity>
        </View>

        {mode === 'show' ? (
          <View style={s.gymQrCard}>
            {gymQrLoading ? (
              <View style={s.gymQrLoading}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={s.gymQrHint}>Loading your fixed gym QR...</Text>
              </View>
            ) : gymQr?.token ? (
              <>
                <Text style={s.gymQrName}>{gymQr.gymName || 'Your Gym'}</Text>
                <View style={s.gymQrCanvas}>
                  <QRCode value={gymQr.token} size={238} backgroundColor="#ffffff" color="#080808" />
                </View>
                <Text style={s.gymQrTitle}>Member self check-in</Text>
                <Text style={s.gymQrHint}>
                  Keep this QR at reception. Single Gym members check in directly; Multi Gym and Day Pass members need an active booking.
                </Text>
                <TouchableOpacity style={s.refreshQrBtn} onPress={loadGymQr}>
                  <IconRefresh size={16} color={colors.accent} />
                  <Text style={s.refreshQrText}>Refresh QR</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.gymQrLoading}>
                <IconClose size={28} color={colors.error} />
                <Text style={s.errorMessage}>{gymQrError || 'Could not load the gym QR.'}</Text>
                <TouchableOpacity style={s.refreshQrBtn} onPress={loadGymQr}>
                  <IconRefresh size={16} color={colors.accent} />
                  <Text style={s.refreshQrText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Camera / scan frame area */}
            {cameraActive ? (
              <View style={s.cameraContainer}>
                <CameraView
                  style={s.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarcodeScanned}
                >
                  <View style={s.cameraOverlay}>
                    <View style={[s.corner, s.cornerTL]} />
                    <View style={[s.corner, s.cornerTR]} />
                    <View style={[s.corner, s.cornerBL]} />
                    <View style={[s.corner, s.cornerBR]} />
                  </View>
                </CameraView>
                <TouchableOpacity style={s.cancelCameraBtn} onPress={() => setCameraActive(false)}>
                  <Text style={s.cancelCameraText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.frameContainer}>
                <TouchableOpacity style={s.frame} activeOpacity={0.85} onPress={handleOpenCamera}>
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  <Animated.View style={[s.framePulse, { opacity: pulseAnim }]} />
                  <IconQR size={52} color={colors.accent} />
                  <Text style={s.tapToScanText}>Tap to scan</Text>
                </TouchableOpacity>
                <Text style={s.frameHint}>Tap frame to scan, or enter the manual code below</Text>
              </View>
            )}

            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                value={token}
                onChangeText={setToken}
                placeholder="Manual code below QR, booking ref, booking ID, or QR token"
                placeholderTextColor={colors.t3}
                multiline={false}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => handleValidate()}
              />
            </View>

            {!result && (
              <TouchableOpacity
                style={[s.validateBtn, (!token.trim() || loading) && s.validateBtnDisabled]}
                onPress={() => handleValidate()}
                disabled={!token.trim() || loading || gymLoading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.validateBtnText}>Validate Token</Text>
                }
              </TouchableOpacity>
            )}

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
                    {result.bookingRef && (
                      <>
                        <View style={s.resultDivider} />
                        <View style={s.resultRow}>
                          <Text style={s.resultLabel}>Manual ID</Text>
                          <Text style={s.resultValue}>#{result.bookingRef}</Text>
                        </View>
                      </>
                    )}
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
          </>
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
  content: { paddingHorizontal: spacing.xl, paddingBottom: 16, paddingTop: spacing.lg },

  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.text, marginBottom: 4 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.t, marginBottom: spacing.lg },
  modeSwitch: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: spacing.xxl,
  },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  modeButtonActive: { backgroundColor: colors.accent },
  modeButtonText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.t2 },
  modeButtonTextActive: { color: '#060606' },

  gymQrCard: {
    alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accentBorder, padding: spacing.xl,
  },
  gymQrLoading: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  gymQrName: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' },
  gymQrCanvas: { backgroundColor: '#fff', padding: 14, borderRadius: radius.md, marginBottom: spacing.lg },
  gymQrTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent, marginBottom: spacing.xs },
  gymQrHint: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, color: colors.t2, textAlign: 'center', maxWidth: 290 },
  refreshQrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentSoft,
    borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10, marginTop: spacing.lg,
  },
  refreshQrText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },

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
  tapToScanText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent, marginTop: 8 },

  cameraContainer: { width: FRAME_SIZE, alignSelf: 'center', marginBottom: spacing.xxl },
  camera: { width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: radius.lg, overflow: 'hidden' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  cancelCameraBtn: {
    marginTop: 10, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  cancelCameraText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.text },

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
    fontFamily: fonts.sans,
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
  resultCardSuccess: { borderColor: colors.accent, backgroundColor: 'rgba(0,212,106,0.06)' },
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
