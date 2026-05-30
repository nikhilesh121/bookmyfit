import { ActivityIndicator, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme/brand';
import type { LaunchConfig } from '../lib/launchConfig';
import { DEFAULT_LAUNCH_CONFIG, launchMediaUrl } from '../lib/launchConfig';

type Props = {
  message?: string;
  launchConfig?: LaunchConfig | null;
};

export default function AppLoadingScreen({ message, launchConfig }: Props) {
  const config = launchConfig || DEFAULT_LAUNCH_CONFIG;
  const splash = config.splash || DEFAULT_LAUNCH_CONFIG.splash;
  const branding = config.branding || {};
  const logoUrl = launchMediaUrl(splash.logoUrl || branding.logoUrl);
  const backgroundImageUrl = launchMediaUrl(splash.imageUrl);
  const logoText = String(branding.shortText || branding.logoText || splash.title || 'BMF');
  const title = String(splash.title || branding.logoText || 'BookMyFit');
  const subtitle = String(message || splash.subtitle || 'Opening BookMyFit...');
  const bgColor = String(splash.backgroundColor || colors.bg);

  const content = (
    <View style={[s.root, { backgroundColor: backgroundImageUrl ? 'transparent' : bgColor }]}>
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
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {splash.showSpinner !== false && <ActivityIndicator color={colors.accent} style={s.loader} />}
    </View>
  );

  if (backgroundImageUrl) {
    return (
      <ImageBackground source={{ uri: backgroundImageUrl }} style={s.bgImage} imageStyle={s.bgImageAsset} resizeMode="cover">
        <View style={s.bgScrim} />
        {content}
      </ImageBackground>
    );
  }

  return content;
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bgImage: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgImageAsset: {
    opacity: 0.42,
  },
  bgScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.44)',
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
