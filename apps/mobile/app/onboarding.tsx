import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ImageBackground, FlatList, NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '../theme/brand';
import { appStorage } from '../lib/api';
import { DEFAULT_LAUNCH_CONFIG, LaunchConfig, LaunchSlide, launchMediaUrl, loadLaunchConfig } from '../lib/launchConfig';

const ONBOARDED_KEY = 'bmf_onboarded';
async function markOnboarded() {
  await appStorage.setItem(ONBOARDED_KEY, '1');
}

const { width, height } = Dimensions.get('window');

export default function Onboarding() {
  const [config, setConfig] = useState<LaunchConfig>(DEFAULT_LAUNCH_CONFIG);
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList<LaunchSlide>>(null);
  const slides = config.onboarding.slides.length >= 3 ? config.onboarding.slides : DEFAULT_LAUNCH_CONFIG.onboarding.slides;

  useEffect(() => {
    let active = true;
    loadLaunchConfig().then((next) => {
      if (active) setConfig(next);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrent(idx);
  }, []);

  const goTo = useCallback((idx: number) => {
    listRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrent(idx);
  }, []);

  const handleGetStarted = async () => {
    await markOnboarded();
    router.replace('/login');
  };

  return (
    <View style={s.root}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item, i) => item.id || String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index }) => {
          const aurora = item.aurora && item.aurora.length >= 2 ? item.aurora : DEFAULT_LAUNCH_CONFIG.onboarding.slides[index % 3].aurora;
          const imageUrl = launchMediaUrl(item.imageUrl || item.image);
          return (
            <ImageBackground source={{ uri: imageUrl }} style={s.slide} resizeMode="cover">
              <View style={[s.aurora, { backgroundColor: aurora?.[0], top: -80, left: -60 }]} />
              <View style={[s.aurora, { backgroundColor: aurora?.[1], bottom: '35%', right: -80 }]} />
              <View style={s.darkOverlay} />
              <View style={s.textBlock}>
                <Text style={s.kicker}>{item.kicker || config.onboarding.kicker || 'BOOKMYFIT'}</Text>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.subtitle}>{item.description || item.subtitle}</Text>
              </View>
            </ImageBackground>
          );
        }}
      />

      <View style={s.fixedBottom}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={8}>
              <View style={[s.dot, i === current && s.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={handleGetStarted}>
          <Text style={s.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnGhost} onPress={handleGetStarted}>
          <Text style={s.btnGhostText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  slide: { width, height },
  aurora: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
  },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  textBlock: {
    position: 'absolute',
    bottom: 220,
    left: 28,
    right: 28,
  },
  kicker: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 38, color: '#fff', marginBottom: 12, lineHeight: 46,
  },
  subtitle: {
    fontFamily: fonts.sans, fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 23,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(6,6,6,0.88)',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 48,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: { width: 22, backgroundColor: colors.accent },
  btnPrimary: {
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  btnGhost: { height: 44, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: {
    fontFamily: fonts.sans, fontSize: 14, color: 'rgba(255,255,255,0.50)',
    textDecorationLine: 'underline',
  },
});
