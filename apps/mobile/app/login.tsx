import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowRight } from '../components/Icons';
import AuroraBackground from '../components/AuroraBackground';

const API = (Constants.expoConfig?.extra?.apiUrl) || 'http://localhost:3003';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (phone.length < 10) return Alert.alert('Enter a valid 10-digit phone');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      router.push({
        pathname: '/otp',
        params: {
          phone,
          userExists: data.userExists ? 'true' : 'false',
          userName: data.userName || '',
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Brand mark */}
          <View style={s.brandRow}>
            <View style={s.brandDot} />
            <Text style={s.brandName}>BookMyFit</Text>
          </View>

          <View style={s.top}>
            <Text style={s.kicker}>Your fitness journey</Text>
            <Text style={s.title}>
              Sign in{'\n'}
              <Text style={s.titleAccent}>& get moving.</Text>
            </Text>
            <Text style={s.sub}>Enter your phone number — we'll send a quick verification code.</Text>
          </View>

          <View style={s.form}>
            <Text style={s.label}>Phone number</Text>
            <View style={s.inputRow}>
              <View style={s.prefixBox}>
                <Text style={s.prefix}>+91</Text>
              </View>
              <View style={s.divider} />
              <TextInput
                style={s.input}
                placeholder="98765 43210"
                placeholderTextColor={colors.t3}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
                autoFocus
              />
            </View>
          </View>

          <View style={s.bottom}>
            <TouchableOpacity
              style={[s.cta, phone.length < 10 && { opacity: 0.4 }]}
              disabled={loading || phone.length < 10}
              onPress={sendOtp}
              activeOpacity={0.85}
            >
              <Text style={s.ctaText}>{loading ? 'Sending…' : 'Continue'}</Text>
              <IconArrowRight size={16} color="#000" />
            </TouchableOpacity>
            <Text style={s.devHint}>
              Dev: OTP is always{' '}
              <Text style={{ color: colors.accent, fontFamily: fonts.sansBold }}>123456</Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  brandName: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t2, letterSpacing: 1 },
  top: { marginTop: 48 },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontFamily: fonts.serifBlack, fontSize: 40, color: '#fff', letterSpacing: -1.5, lineHeight: 44 },
  titleAccent: { fontFamily: fonts.serifItalic, color: colors.accent, fontSize: 40 },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginTop: 16, lineHeight: 20 },
  form: { marginTop: 44, flex: 1 },
  label: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.t2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.lg, height: 58, overflow: 'hidden',
  },
  prefixBox: { paddingHorizontal: 16, height: '100%', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  prefix: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.t },
  divider: { width: 1, height: '60%', backgroundColor: colors.border },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: '#fff', paddingHorizontal: 14 },
  bottom: { paddingBottom: 32, gap: 16 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: radius.pill, backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#000', letterSpacing: 0.3 },
  devHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, textAlign: 'center' },
});

