import { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ImageBackground, FlatList, NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { colors, fonts, radius } from '../theme/brand';

const ONBOARDED_KEY = 'bmf_onboarded';
async function markOnboarded() {
  await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
}

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    aurora: ['rgba(120,40,200,0.45)', 'rgba(255,120,40,0.25)'],
    title: 'Train Anywhere',
    subtitle: 'One subscription. Access to 500+ gyms across your city.',
  },
  {
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    aurora: ['rgba(0,140,255,0.35)', 'rgba(120,40,200,0.30)'],
    title: 'QR Check-In',
    subtitle: 'Book a slot and get a 2-hour QR code. No plastic cards, no queues.',
  },
  {
    image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
    aurora: ['rgba(204,255,0,0.20)', 'rgba(0,140,255,0.30)'],
    title: 'Track Progress',
    subtitle: 'See your visit history, active subscriptions, and PT sessions.',
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);

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
      {/* Slides — full screen horizontal FlatList */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <ImageBackground source={{ uri: item.image }} style={s.slide} resizeMode="cover">
            <View style={[s.aurora, { backgroundColor: item.aurora[0], top: -80, left: -60 }]} />
            <View style={[s.aurora, { backgroundColor: item.aurora[1], bottom: '35%', right: -80 }]} />
            <View style={s.darkOverlay} />
            {/* Text content slides with the image */}
            <View style={s.textBlock}>
              <Text style={s.kicker}>BOOKMYFIT</Text>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
            </View>
          </ImageBackground>
        )}
      />

      {/* Fixed bottom panel — stays put while slides scroll above */}
      <View style={s.fixedBottom}>
        {/* Tap-to-navigate dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
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

  /* Each slide fills the screen */
  slide: { width, height },
  aurora: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
  },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  textBlock: {
    position: 'absolute',
    bottom: 220,        // above the fixed panel height
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

  /* Fixed bottom section */
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

