import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme/brand';
import { API_BASE } from '../lib/api';

export default function AppLoadingScreen() {
  const [branding, setBranding] = useState<{ logoUrl?: string; logoText?: string; shortText?: string }>({
    logoText: 'BookMyFit',
    shortText: 'BMF',
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/branding`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, []);

  const logoUrl = String(branding.logoUrl || '').trim();
  const logoText = String(branding.shortText || branding.logoText || 'BMF');

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['rgba(0,212,106,0.18)', 'rgba(255,30,90,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.glow}
      />
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={s.logoImage} resizeMode="contain" />
      ) : (
        <View style={s.logoBox}>
          <Text style={s.logoText}>{logoText.slice(0, 4).toUpperCase()}</Text>
        </View>
      )}
      <Text style={s.title}>{branding.logoText || 'BookMyFit'}</Text>
      <Text style={s.subtitle}>Getting your fitness pass ready</Text>
      <ActivityIndicator color={colors.accent} style={s.loader} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  logoBox: {
    width: 74,
    height: 74,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 18,
  },
  logoImage: {
    width: 190,
    height: 82,
    marginBottom: 16,
  },
  logoText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.t2,
    fontSize: 13,
    marginTop: 6,
  },
  loader: {
    marginTop: 22,
  },
});
