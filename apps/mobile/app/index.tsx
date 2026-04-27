import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/brand';
import { IconArrowRight, IconBolt } from '../components/Icons';

export default function SplashScreen() {
  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' }}
      style={s.bg}
      imageStyle={{ opacity: 0.55 }}
    >
      <View style={s.aurora} />
      <View style={s.dark} />
      <SafeAreaView style={s.container}>
        <View style={s.top}>
          <View style={s.pill}>
            <IconBolt size={10} color={colors.accent} />
            <Text style={s.pillText}>Multi-Gym Subscription</Text>
          </View>
        </View>
        <View style={s.hero}>
          <Text style={s.display}>
            One Pass.{'\n'}
            <Text style={s.displayItalic}>Every Gym.</Text>
          </Text>
          <Text style={s.sub}>
            Book any gym in your city with a single subscription. QR check-in at the door.
            Pay once, train everywhere.
          </Text>
        </View>
        <View style={s.ctas}>
          <TouchableOpacity style={s.btnPrimary} activeOpacity={0.9} onPress={() => router.push('/login')}>
            <Text style={s.btnPrimaryText}>Get Started</Text>
            <IconArrowRight size={16} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)')}>
            <Text style={s.skip}>Preview demo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  aurora: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,212,106,0.12)',
  },
  dark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  top: { paddingTop: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.accentBorder,
  },
  pillText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 1.2 },
  hero: { flex: 1, justifyContent: 'center' },
  display: {
    fontFamily: fonts.serifBlack,
    fontSize: 56,
    color: '#fff',
    letterSpacing: -3,
    lineHeight: 54,
    marginBottom: 16,
  },
  displayItalic: {
    fontFamily: fonts.serifItalic,
    color: colors.t,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t,
    lineHeight: 21,
    maxWidth: 320,
  },
  ctas: { paddingBottom: 24, gap: 14, alignItems: 'center' },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 54,
    borderRadius: 30,
    backgroundColor: colors.accent,
  },
  btnPrimaryText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
  skip: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
