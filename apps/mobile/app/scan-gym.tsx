import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AuroraBackground from '../components/AuroraBackground';
import { IconArrowLeft, IconCheck, IconClose, IconQR, IconRefresh } from '../components/Icons';
import { qrApi } from '../lib/api';
import { colors, fonts, radius } from '../theme/brand';

type ScanResult = {
  success: boolean;
  title: string;
  message: string;
  gymName?: string;
  planType?: string;
  gymEarns?: number;
};

export default function ScanGymScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const openCamera = async () => {
    startPulse();
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan the gym QR.');
        return;
      }
    }
    setScanned(false);
    setCameraActive(true);
  };

  const validateGymToken = async (value?: string) => {
    const clean = String(value ?? token).trim();
    if (!clean || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data: any = await qrApi.validateGym(clean);
      setResult({
        success: true,
        title: 'Checked In',
        message: data?.message || 'Your gym check-in has been recorded.',
        gymName: data?.gym?.name,
        planType: data?.planType,
        gymEarns: Number(data?.gymEarns || 0),
      });
      setToken('');
    } catch (err: any) {
      setResult({
        success: false,
        title: 'Check-In Failed',
        message: err?.message || 'This gym QR could not be validated.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCameraActive(false);
    setToken(data);
    validateGymToken(data);
  };

  const reset = () => {
    setResult(null);
    setToken('');
    setScanned(false);
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Scan Gym QR</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {cameraActive ? (
            <View style={s.cameraWrap}>
              <CameraView
                style={s.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onScan}
              >
                <View style={s.cameraOverlay}>
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                </View>
              </CameraView>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setCameraActive(false)}>
                <Text style={s.secondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.scanFrame} activeOpacity={0.86} onPress={openCamera}>
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
              <Animated.View style={[s.framePulse, { opacity: pulseAnim }]} />
              <IconQR size={58} color={colors.accent} />
              <Text style={s.scanTitle}>Tap to scan gym QR</Text>
              <Text style={s.scanHint}>Single Gym Pass checks in directly. Multi Gym and 1-Day Pass require a booked slot.</Text>
            </TouchableOpacity>
          )}

          <View style={s.manualCard}>
            <Text style={s.label}>Gym QR Token</Text>
            <TextInput
              style={s.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste gym QR token if camera is not available"
              placeholderTextColor={colors.t3}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => validateGymToken()}
            />
            <TouchableOpacity
              style={[s.primaryBtn, (!token.trim() || loading) && { opacity: 0.5 }]}
              disabled={!token.trim() || loading}
              onPress={() => validateGymToken()}
            >
              {loading ? <ActivityIndicator color="#000" /> : <Text style={s.primaryText}>Check In</Text>}
            </TouchableOpacity>
          </View>

          {result ? (
            <View style={[s.resultCard, result.success ? s.resultOk : s.resultError]}>
              <View style={[s.resultIcon, result.success ? s.resultIconOk : s.resultIconError]}>
                {result.success ? <IconCheck size={24} color={colors.accent} /> : <IconClose size={24} color="#ff6666" />}
              </View>
              <Text style={s.resultTitle}>{result.title}</Text>
              {result.gymName ? <Text style={s.resultGym}>{result.gymName}</Text> : null}
              <Text style={s.resultText}>{result.message}</Text>
              {result.planType ? <Text style={s.resultMeta}>{String(result.planType).replace(/_/g, ' ')}</Text> : null}
              <TouchableOpacity style={s.secondaryBtn} onPress={reset}>
                <IconRefresh size={14} color={colors.t} />
                <Text style={s.secondaryText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 12 },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  content: { paddingHorizontal: 22, paddingBottom: 36, gap: 16 },
  scanFrame: {
    height: 280, borderRadius: 28, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center', padding: 28, overflow: 'hidden',
  },
  framePulse: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(0,212,106,0.08)' },
  scanTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: '#fff', marginTop: 16 },
  scanHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  cameraWrap: { gap: 12 },
  camera: { height: 330, borderRadius: 28, overflow: 'hidden' },
  cameraOverlay: { flex: 1, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: colors.accent, borderWidth: 3 },
  cornerTL: { top: 42, left: 42, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 42, right: 42, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 42, left: 42, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 42, right: 42, borderLeftWidth: 0, borderTopWidth: 0 },
  manualCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, borderRadius: radius.xl, padding: 16 },
  label: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.t2, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 8 },
  input: {
    minHeight: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderGlass,
    backgroundColor: 'rgba(255,255,255,0.04)', color: '#fff', paddingHorizontal: 14, fontFamily: fonts.sans, fontSize: 13,
  },
  primaryBtn: { marginTop: 12, height: 50, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
  secondaryBtn: {
    minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14,
  },
  secondaryText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t },
  resultCard: { alignItems: 'center', borderRadius: radius.xl, padding: 18, borderWidth: 1 },
  resultOk: { backgroundColor: 'rgba(0,212,106,0.08)', borderColor: colors.accentBorder },
  resultError: { backgroundColor: 'rgba(255,80,80,0.08)', borderColor: 'rgba(255,80,80,0.28)' },
  resultIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultIconOk: { backgroundColor: colors.accentSoft },
  resultIconError: { backgroundColor: 'rgba(255,80,80,0.12)' },
  resultTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: '#fff' },
  resultGym: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent, marginTop: 4 },
  resultText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, textAlign: 'center', lineHeight: 19, marginTop: 6, marginBottom: 12 },
  resultMeta: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2, textTransform: 'uppercase', marginBottom: 12 },
});
