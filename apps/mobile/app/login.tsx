import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowRight } from '../components/Icons';
import AuroraBackground from '../components/AuroraBackground';
import { authApi, getToken, getUser } from '../lib/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!active || !token) return;
      const user = await getUser();
      router.replace(user?.role === 'gym_owner' || user?.role === 'gym_staff' ? '/(gym-portal)' as any : '/(tabs)' as any);
    })().catch(() => {});
    return () => { active = false; };
  }, []);

  const sendOtp = async () => {
    if (loading) return;
    const phoneDigits = phone.replace(/\D/g, '').slice(0, 10);
    if (phoneDigits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authApi.sendOtp(phoneDigits) as any;
      router.push({
        pathname: '/otp',
        params: {
          phone: phoneDigits,
          userExists: data.userExists ? 'true' : 'false',
          userName: data.userName || '',
          devOtp: data.devOtp || '',
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.keyboard}>
          <View style={s.brandHero}>
            <Image source={require('../assets/logo-brand.png')} style={s.brandLogo} resizeMode="contain" />
            <View style={s.brandPills}>
              <View style={s.brandPill}><Text style={s.brandPillText}>Gyms</Text></View>
              <View style={s.brandPill}><Text style={s.brandPillText}>Wellness</Text></View>
              <View style={s.brandPill}><Text style={s.brandPillText}>Passes</Text></View>
            </View>
          </View>

          <View style={s.top}>
            <Text style={s.kicker}>Your fitness journey</Text>
            <Text style={s.title}>
              Sign in{'\n'}
              <Text style={s.titleAccent}>& get moving.</Text>
            </Text>
            <Text style={s.sub}>Enter your phone number - we'll send a quick verification code.</Text>
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
                inputMode="tel"
                autoComplete="tel"
                importantForAutofill={Platform.OS === 'android' ? 'yes' : 'auto'}
                selectionColor={colors.accent}
                cursorColor={Platform.OS === 'android' ? colors.accent : undefined}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/\D/g, '').slice(0, 10));
                  if (error) setError('');
                }}
                onSubmitEditing={sendOtp}
                returnKeyType="done"
                maxLength={10}
                autoFocus
                editable={!loading}
              />
            </View>
            {!!error && <Text style={s.errorText}>{error}</Text>}
            {loading && (
              <View style={s.loadingCard}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={s.loadingText}>Sending OTP...</Text>
              </View>
            )}
          </View>

          <View style={s.bottom}>
            <TouchableOpacity
              style={[s.cta, phone.length < 10 && { opacity: 0.4 }]}
              disabled={loading || phone.length < 10}
              onPress={sendOtp}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={s.ctaText}>Sending...</Text>
                </>
              ) : (
                <>
                  <Text style={s.ctaText}>Continue</Text>
                  <IconArrowRight size={16} color="#000" />
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
  keyboard: { flex: 1, minHeight: 0 },
  brandHero: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  brandLogo: { width: '100%', height: 58 },
  brandPills: { flexDirection: 'row', gap: 8, marginTop: 10 },
  brandPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  brandPillText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent },
  top: { marginTop: 34 },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontFamily: fonts.serifBlack, fontSize: 40, color: '#fff', letterSpacing: 0, lineHeight: 44 },
  titleAccent: { fontFamily: fonts.serifItalic, color: colors.accent, fontSize: 40 },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginTop: 16, lineHeight: 20 },
  form: { marginTop: 44 },
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
  errorText: { marginTop: 12, fontFamily: fonts.sansMedium, fontSize: 12, color: colors.error, lineHeight: 18 },
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: radius.lg, backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: colors.accentBorder,
  },
  loadingText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.t },
  bottom: { marginTop: 'auto', paddingBottom: 32, gap: 16 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: radius.pill, backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#000', letterSpacing: 0.3 },
});

