import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ImageBackground, Animated, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';

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
    subtitle: 'Dynamic 30-second QR code. No plastic cards. No queues.',
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoTimer = useRef<ReturnType<typeof setTimeout>>();
  const panX = useRef(0);

  const goTo = (idx: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setCurrent(idx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  const scheduleAuto = () => {
    clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      setCurrent((c) => {
        const next = (c + 1) % SLIDES.length;
        goTo(next);
        return c;
      });
    }, 3500);
  };

  useEffect(() => {
    scheduleAuto();
    return () => clearTimeout(autoTimer.current);
  }, [current]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderGrant: () => { panX.current = 0; },
    onPanResponderMove: (_, g) => { panX.current = g.dx; },
    onPanResponderRelease: () => {
      if (panX.current < -50 && current < SLIDES.length - 1) {
        clearTimeout(autoTimer.current);
        goTo(current + 1);
      } else if (panX.current > 50 && current > 0) {
        clearTimeout(autoTimer.current);
        goTo(current - 1);
      }
    },
  });

  const slide = SLIDES[current];

  return (
    <View style={s.root} {...panResponder.panHandlers}>
      <ImageBackground source={{ uri: slide.image }} style={s.bg} resizeMode="cover">
        {/* Aurora overlays */}
        <View style={[s.aurora, { backgroundColor: slide.aurora[0], top: -80, left: -60 }]} />
        <View style={[s.aurora, { backgroundColor: slide.aurora[1], bottom: '25%', right: -80 }]} />
        {/* Dark overlay */}
        <View style={s.darkOverlay} />

        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          {/* Bottom glass panel */}
          <View style={s.panel}>
            {/* Kicker */}
            <Text style={s.kicker}>BOOKMYFIT</Text>
            <Text style={s.title}>{slide.title}</Text>
            <Text style={s.subtitle}>{slide.subtitle}</Text>

            {/* Dots */}
            <View style={s.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[s.dot, i === current && s.dotActive]} />
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/login')}>
              <Text style={s.btnPrimaryText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={() => router.push('/login')}>
              <Text style={s.btnGhostText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bg: { flex: 1 },
  aurora: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
  },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingTop: 28, paddingBottom: 48,
  },
  kicker: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 10,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 36, color: '#fff', marginBottom: 10, lineHeight: 44,
  },
  subtitle: {
    fontFamily: fonts.sans, fontSize: 15, color: 'rgba(255,255,255,0.65)',
    lineHeight: 22, marginBottom: 24,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { width: 20, backgroundColor: colors.accent },
  btnPrimary: {
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  btnGhost: {
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  btnGhostText: {
    fontFamily: fonts.sans, fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'underline',
  },
});
