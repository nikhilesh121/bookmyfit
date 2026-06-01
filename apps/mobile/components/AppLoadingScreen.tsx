import { ActivityIndicator, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/brand';
import type { LaunchConfig } from '../lib/launchConfig';
import { DEFAULT_LAUNCH_CONFIG, launchMediaUrl } from '../lib/launchConfig';

const BUNDLED_LOGO = require('../assets/logo-brand.png');

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
  const logoSource = logoUrl ? { uri: logoUrl } : BUNDLED_LOGO;
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
      <Image source={logoSource} style={s.logoImage} resizeMode="contain" />
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
  logoImage: {
    width: 190,
    height: 82,
    marginBottom: 16,
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
