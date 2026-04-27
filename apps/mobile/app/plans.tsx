import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, ImageBackground, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconCheck, IconBolt, IconDumbbell, IconStar, IconPercent, IconShield, IconHeadphones, IconChevronRight } from '../components/Icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.76;

const TESTIMONIALS = [
  { id: '1', name: 'Priya S.', city: 'Bhubaneswar', rating: 5, text: 'Switched to Multi Gym — visit 3 different gyms a week now. Best fitness decision ever!', avatar: 'P' },
  { id: '2', name: 'Rahul M.', city: 'Bhubaneswar', rating: 5, text: 'Same Gym pass at my local gym. Super easy to book slots and QR check-in is seamless.', avatar: 'R' },
  { id: '3', name: 'Ananya K.', city: 'Cuttack', rating: 5, text: 'Day passes are perfect for travel. No commitment, just walk in and work out!', avatar: 'A' },
  { id: '4', name: 'Dev P.', city: 'Bhubaneswar', rating: 4, text: 'Love the app design and how easy it is to find and book gyms nearby. Highly recommend.', avatar: 'D' },
];

const PLANS = [
  {
    id: 'day_pass',
    num: '1',
    name: '1-Day Pass',
    tagline: 'Drop in any gym, anytime',
    price: '₹149',
    period: 'per visit',
    accent: '#4ADE80',
    bg: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.30)',
    img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    cta: 'Explore Gyms',
    badge: null,
    features: [
      'Single visit to any partner gym',
      'Valid for 24 hours',
      'No commitment required',
      'Buy as many as you want',
    ],
    icon: 'bolt',
  },
  {
    id: 'same_gym',
    num: '2',
    name: 'Same Gym Pass',
    tagline: 'Your local gym, all month',
    price: '₹599',
    period: 'per month',
    accent: '#60A5FA',
    bg: 'rgba(96,165,250,0.10)',
    border: 'rgba(96,165,250,0.30)',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    cta: 'View Plans',
    badge: 'Most Popular',
    features: [
      'Unlimited visits to one gym',
      'Slot booking included',
      'Monthly subscription',
      'QR check-in',
    ],
    icon: 'dumbbell',
  },
  {
    id: 'multi_gym',
    num: '3',
    name: 'Multi Gym Pass',
    tagline: 'Access any gym, anytime',
    price: '₹1,499',
    period: 'per month',
    accent: '#A78BFA',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.30)',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    cta: 'Browse Gyms',
    badge: 'Best Value',
    features: [
      'Unlimited access to all gyms',
      'Switch gyms any day',
      'Slot booking included',
      'Priority support',
    ],
    icon: 'star',
  },
];

const HOW_IT_WORKS = [
  { step: '1', text: 'Choose your pass type' },
  { step: '2', text: 'Select a gym near you' },
  { step: '3', text: 'Complete payment securely' },
  { step: '4', text: 'Get QR & start training!' },
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
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        <View style={s.stepper}>
          {['Choose Pass', 'Select Gym', 'Checkout'].map((label, i) => (
            <View key={label} style={s.stepItem}>
              <View style={[s.stepCircle, i === 0 && s.stepCircleActive]}>
                <Text style={[s.stepNum, i === 0 && s.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[s.stepLabel, i === 0 && s.stepLabelActive]}>{label}</Text>
              {i < 2 && <View style={s.stepLine} />}
            </View>
          ))}
        </View>

        {/* Title */}
        <Text style={s.title}>Choose Your Pass</Text>
        <Text style={s.subtitle}>Simple, transparent pricing — no hidden fees.</Text>

        {gymId && gymName ? (
          <View style={s.gymChip}>
            <Text style={s.gymChipText}>📍 {gymName}</Text>
          </View>
        ) : null}

        {/* Plan cards — horizontal scroll */}
        <FlatList
          data={PLANS}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.cardsContent}
          snapToInterval={CARD_W + 14}
          decelerationRate="fast"
          renderItem={({ item: plan }) => (
            <View style={[s.card, { width: CARD_W, borderColor: plan.border, backgroundColor: plan.bg }]}>
              {/* Gym photo */}
              <ImageBackground source={{ uri: plan.img }} style={s.cardPhoto} imageStyle={{ borderRadius: radius.lg }}>
                <View style={s.cardPhotoDark} />
                {/* Number badge */}
                <View style={[s.numBadge, { backgroundColor: plan.accent }]}>
                  <Text style={s.numBadgeText}>{plan.num}</Text>
                </View>
                {/* Popular badge */}
                {plan.badge && (
                  <View style={[s.popularBadge, { backgroundColor: plan.accent + 'DD' }]}>
                    <Text style={s.popularBadgeText}>{plan.badge}</Text>
                  </View>
                )}
              </ImageBackground>

              {/* Card body */}
              <View style={s.cardBody}>
                <View style={s.cardTitleRow}>
                  <View style={[s.iconCircle, { backgroundColor: plan.accent + '22' }]}>
                    <PlanIcon icon={plan.icon} size={18} color={plan.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planName}>{plan.name}</Text>
                    <Text style={s.planTagline}>{plan.tagline}</Text>
                  </View>
                </View>

                <View style={s.priceRow}>
                  <Text style={[s.price, { color: plan.accent }]}>{plan.price}</Text>
                  <Text style={s.period}>{plan.period}</Text>
                </View>

                <View style={s.divider} />

                <View style={s.featureList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={s.featureRow}>
                      <IconCheck size={12} color={plan.accent} />
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.ctaBtn, { backgroundColor: plan.accent }]}
                  onPress={() => handleSelect(plan)}
                  activeOpacity={0.85}
                >
                  <Text style={s.ctaBtnText}>{plan.cta}</Text>
                  <IconChevronRight size={14} color="#060606" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        {/* Trust badges */}
        <View style={s.trustRow}>
          {[
            { icon: 'percent', label: 'Best Prices' },
            { icon: 'shield', label: 'Verified Gyms' },
            { icon: 'bolt', label: 'Easy Booking' },
            { icon: 'headphones', label: '24/7 Support' },
          ].map((item) => (
            <View key={item.label} style={s.trustItem}>
              <View style={s.trustIcon}>
                {item.icon === 'percent' && <IconPercent size={13} color={colors.accent} />}
                {item.icon === 'shield' && <IconShield size={13} color={colors.accent} />}
                {item.icon === 'bolt' && <IconBolt size={13} color={colors.accent} />}
                {item.icon === 'headphones' && <IconHeadphones size={13} color={colors.accent} />}
              </View>
              <Text style={s.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <Text style={s.howTitle}>How it works?</Text>
        <View style={s.howGrid}>
          {HOW_IT_WORKS.map((h, i) => (
            <View key={i} style={s.howItem}>
              <View style={s.howNum}>
                <Text style={s.howNumText}>{h.step}</Text>
              </View>
              <Text style={s.howText}>{h.text}</Text>
              {i < 3 && <View style={s.howArrow}><IconChevronRight size={14} color={colors.t3} /></View>}
            </View>
          ))}
        </View>

        {/* Testimonials */}
        <Text style={s.sectionTitle}>What members say</Text>
        <FlatList
          data={TESTIMONIALS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.testimonialsContent}
          snapToInterval={SCREEN_W * 0.72 + 12}
          decelerationRate="fast"
          renderItem={({ item: t }) => (
            <View style={s.testimonialCard}>
              {/* Stars */}
              <View style={s.starsRow}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <IconStar key={i} size={12} color="rgba(255,205,55,0.9)" />
                ))}
              </View>
              <Text style={s.testimonialText}>"{t.text}"</Text>
              <View style={s.testimonialAuthor}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>{t.avatar}</Text>
                </View>
                <View>
                  <Text style={s.authorName}>{t.name}</Text>
                  <Text style={s.authorCity}>{t.city}</Text>
                </View>
              </View>
            </View>
          )}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  container: { paddingBottom: 48 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginVertical: 20, gap: 0 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepNum: { fontFamily: fonts.sansBold, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  stepNumActive: { color: '#060606' },
  stepLabel: { fontFamily: fonts.sansMedium, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 6 },
  stepLabelActive: { color: '#fff' },
  stepLine: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 6 },

  // Title
  title: { fontFamily: fonts.serif, fontSize: 28, color: '#fff', paddingHorizontal: 20, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', paddingHorizontal: 20, marginTop: 6, marginBottom: 16 },
  gymChip: {
    alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(204,255,0,0.1)', borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(204,255,0,0.25)',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  gymChipText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.accent },

  // Cards
  cardsContent: { paddingHorizontal: 20, gap: 14, paddingVertical: 4, paddingBottom: 12 },
  card: {
    borderRadius: radius.xl, borderWidth: 1.5, overflow: 'hidden',
  },
  cardPhoto: { height: 160, justifyContent: 'space-between', padding: 12, flexDirection: 'row', alignItems: 'flex-start' },
  cardPhotoDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  numBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  numBadgeText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  popularBadge: {
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  popularBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#060606' },
  cardBody: { padding: 16, gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  planName: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
  planTagline: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontFamily: fonts.sansBold, fontSize: 26, letterSpacing: -0.5 },
  period: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.pill, paddingVertical: 12, marginTop: 4,
  },
  ctaBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },

  // Trust
  trustRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 5 },
  trustIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(204,255,0,0.1)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustLabel: { fontFamily: fonts.sansMedium, fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // How it works
  howTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', paddingHorizontal: 20, marginTop: 24, marginBottom: 14 },
  howGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 0, alignItems: 'flex-start' },
  howItem: { flex: 1, alignItems: 'center', position: 'relative' },
  howNum: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(204,255,0,0.12)', borderWidth: 1.5, borderColor: 'rgba(204,255,0,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  howNumText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  howText: { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 14 },
  howArrow: { position: 'absolute', top: 12, right: -8 },

  // Testimonials
  sectionTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff', paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  testimonialsContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  testimonialCard: {
    width: SCREEN_W * 0.72,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    padding: 18, gap: 10,
  },
  starsRow: { flexDirection: 'row', gap: 3 },
  testimonialText: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 20, fontStyle: 'italic' },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
  authorName: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  authorCity: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
});
