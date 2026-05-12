import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconCheck } from '../components/Icons';
import AuroraBackground from '../components/AuroraBackground';
import { authApi, setTokens, setUser } from '../lib/api';

// Expo Router can return string | string[] — always coerce to string
function str(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default function OtpScreen() {
  const raw = useLocalSearchParams();
  const phone         = str(raw.phone);
  const userExistsParam = str(raw.userExists);
  const userNameParam   = str(raw.userName);

  const isExistingUser = userExistsParam === 'true';
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (code.length < 6) return Alert.alert('Enter OTP', 'Please enter the 6-digit OTP.');
    if (!isExistingUser && !name.trim()) return Alert.alert('Enter your name', 'Please enter your name to create your account.');
    setLoading(true);
    try {
      const deviceId = `dev-${Date.now()}`;
      // Always send name as a string — existing users send their known name,
      // new users send what they typed. Never send undefined (production backend requires it).
      const nameToSend = isExistingUser ? (userNameParam || 'User') : (name.trim() || 'User');
      const data: any = await authApi.verifyOtp(phone, code, deviceId, nameToSend);

      if (!data?.accessToken) throw new Error('Login failed — no token returned. Please try again.');

      // Store tokens
      await setTokens(data.accessToken, data.refreshToken || '');

      // Store user object
      const user = data.user ?? { phone, name: isExistingUser ? (userNameParam || 'Member') : (name.trim() || 'User'), role: 'end_user' };
      await setUser(user);

      const role = user?.role;
      if (role === 'gym_owner' || role === 'gym_staff') {
        router.replace('/(gym-portal)' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <View style={s.top}>
            <Text style={s.kicker}>{isExistingUser ? 'Welcome back' : 'Almost there'}</Text>
            <Text style={s.title}>
              Verify your{'\n'}
              <Text style={s.titleAccent}>phone number.</Text>
            </Text>
            {isExistingUser ? (
              <Text style={s.sub}>
                Welcome back, <Text style={{ color: colors.accent, fontFamily: fonts.sansBold }}>{userNameParam || 'member'}</Text>!{'\n'}
                Enter the 6-digit code sent to +91 {phone}
              </Text>
            ) : (
              <Text style={s.sub}>Enter the 6-digit code sent to +91 {phone}</Text>
            )}
          </View>

          <View style={s.form}>
            {!isExistingUser && (
              <>
                <Text style={s.label}>Your name</Text>
                <View style={s.inputRow}>
                  <TextInput style={s.input} placeholder="First + last name" placeholderTextColor={colors.t3}
                    value={name} onChangeText={setName} />
                </View>
              </>
            )}
            <Text style={[s.label, { marginTop: isExistingUser ? 0 : 20 }]}>6-digit OTP</Text>
            <View style={[s.inputRow, { borderColor: code.length > 0 ? colors.accentBorder : colors.borderGlass }]}>
              <TextInput
                style={[s.input, { letterSpacing: 10, fontFamily: fonts.sansBold, fontSize: 20, textAlign: 'center' }]}
                placeholder="••••••" placeholderTextColor={colors.t3}
                keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} autoFocus
              />
            </View>
            <Text style={s.devHint}>
              Dev mode: OTP is{' '}
              <Text style={{ color: colors.accent, fontFamily: fonts.sansBold }}>123456</Text>
            </Text>
          </View>

          <View style={s.bottom}>
            <TouchableOpacity
              style={[s.cta, code.length < 6 && { opacity: 0.4 }]}
              disabled={loading || code.length < 6}
              onPress={verify}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={s.ctaText}>Verifying…</Text>
              ) : (
                <>
                  <Text style={s.ctaText}>Verify & Continue</Text>
                  <IconCheck size={16} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  top: { marginTop: 36 },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontFamily: fonts.serifBlack, fontSize: 36, color: '#fff', letterSpacing: -1.5, lineHeight: 40 },
  titleAccent: { fontFamily: fonts.serifItalic, color: colors.accent, fontSize: 36 },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginTop: 14, lineHeight: 19 },
  form: { marginTop: 36, flex: 1 },
  label: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.t2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.lg, height: 56, paddingHorizontal: 16,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: '#fff' },
  devHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 12 },
  bottom: { paddingBottom: 32 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: radius.pill, backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#000', letterSpacing: 0.3 },
});
