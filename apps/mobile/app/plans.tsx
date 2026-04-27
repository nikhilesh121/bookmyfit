import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconCheck, IconDumbbell, IconBolt, IconStar } from '../components/Icons';

const PLANS = [
  {
    id: 'day_pass',
    name: '1-Day Pass',
    tagline: 'Drop in anytime',
    price: '₹149',
    period: 'per visit',
    color: 'rgba(0,175,255,0.15)',
    borderColor: 'rgba(0,175,255,0.3)',
    accentColor: '#00AFFF',
    icon: 'bolt',
    features: [
      'Single visit to any partner gym',
      'Valid for 24 hours',
      'No commitment or subscription',
      'Buy as many as you want',
    ],
    badge: null,
  },
  {
    id: 'same_gym',
    name: 'Same Gym Pass',
    tagline: 'Your local gym, all month',
    price: '₹599',
    period: 'per month',
    color: 'rgba(204,255,0,0.12)',
    borderColor: 'rgba(204,255,0,0.3)',
    accentColor: '#CCFF00',
    icon: 'dumbbell',
    features: [
      'Unlimited visits to one gym',
      'Slot booking included',
      'Monthly subscription',
      'QR check-in',
    ],
    badge: 'Most Popular',
  },
  {
    id: 'multi_gym',
    name: 'Multi Gym Pass',
    tagline: 'Access any gym, anytime',
    price: '₹1,499',
    period: 'per month',
    color: 'rgba(155,0,255,0.12)',
    borderColor: 'rgba(155,0,255,0.3)',
    accentColor: '#9B00FF',
    icon: 'star',
    features: [
      'Unlimited access to all partner gyms',
      'Switch gyms anytime',
      'Slot booking included',
      'Priority support',
    ],
    badge: 'Best Value',
  },
];

function PlanIcon({ icon, size, color }: { icon: string; size: number; color: string }) {
  if (icon === 'dumbbell') return <IconDumbbell size={size} color={color} />;
  if (icon === 'bolt') return <IconBolt size={size} color={color} />;
  return <IconStar size={size} color={color} />;
}

export default function PlansScreen() {
  const { gymId, gymName } = useLocalSearchParams<{ gymId?: string; gymName?: string }>();

  const handleSelect = (plan: typeof PLANS[0]) => {
    if (plan.id === 'same_gym' && !gymId) {
      Alert.alert('Select a Gym', 'Please choose a gym first to get the Same Gym Pass.', [
        { text: 'Browse Gyms', onPress: () => router.push('/(tabs)') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    router.push({
      pathname: '/duration',
      params: {
        planId: plan.id,
        planName: plan.name,
        gymId: gymId || '',
        gymName: gymName || '',
        basePrice: plan.price.replace(/[₹,]/g, ''),
        isDayPass: plan.id === 'day_pass' ? 'true' : 'false',
      },
    });
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Choose a Plan</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          <Text style={s.sub}>Simple, transparent pricing. No hidden fees.</Text>

          {gymId && gymName && (
            <View style={s.gymChip}>
              <Text style={s.gymChipText}>📍 {gymName}</Text>
            </View>
          )}

          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[s.card, { borderColor: plan.borderColor, backgroundColor: plan.color }]}
              onPress={() => handleSelect(plan)}
              activeOpacity={0.85}
            >
              {plan.badge && (
                <View style={[s.badge, { backgroundColor: plan.accentColor + '22', borderColor: plan.accentColor + '55' }]}>
                  <Text style={[s.badgeText, { color: plan.accentColor }]}>{plan.badge}</Text>
                </View>
              )}

              <View style={s.cardTop}>
                <View style={[s.iconBox, { backgroundColor: plan.accentColor + '22', borderColor: plan.accentColor + '44' }]}>
                  <PlanIcon icon={plan.icon} size={24} color={plan.accentColor} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.planName}>{plan.name}</Text>
                  <Text style={s.planTagline}>{plan.tagline}</Text>
                </View>
                <View style={s.priceBox}>
                  <Text style={[s.price, { color: plan.accentColor }]}>{plan.price}</Text>
                  <Text style={s.period}>{plan.period}</Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.features}>
                {plan.features.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <IconCheck size={13} color={plan.accentColor} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.cta, { backgroundColor: plan.accentColor }]}>
                <Text style={s.ctaText}>
                  {plan.id === 'day_pass' ? 'Buy Day Pass' : `Get ${plan.name}`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={s.footer}>
            All plans include GST. Cancellation available for monthly plans within 24 hours.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 12,
  },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginBottom: 16, textAlign: 'center' },
  gymChip: {
    alignSelf: 'center', backgroundColor: colors.accentSoft, borderWidth: 1,
    borderColor: colors.accentBorder, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  gymChipText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  card: {
    borderWidth: 1, borderRadius: radius.xl, padding: 20,
    marginBottom: 16, overflow: 'hidden',
  },
  badge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 14,
  },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  iconBox: {
    width: 52, height: 52, borderRadius: radius.lg,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  planName: { fontFamily: fonts.serifBlack, fontSize: 18, color: '#fff' },
  planTagline: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontFamily: fonts.sansBold, fontSize: 22 },
  period: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  features: { gap: 8, marginBottom: 18 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, flex: 1 },
  cta: {
    borderRadius: radius.pill, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },
  footer: {
    fontFamily: fonts.sans, fontSize: 11, color: colors.t3,
    textAlign: 'center', marginTop: 8, lineHeight: 18,
  },
});
