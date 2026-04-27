import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconArrowRight, IconCheck, IconBuilding, IconGlobe } from '../components/Icons';
import { subscriptionsApi } from '../lib/api';

// ── Static content ─────────────────────────────────────────────────────────────

const MULTIGYM_PLANS = [
  {
    id: 'multigym_elite',
    name: 'Multi-Gym Elite',
    sub: 'Access any 5 gyms on BookMyFit',
    price: 1499,
    gymLimit: 5,
    aurora: 'rgba(155,0,255,0.55)',
    popular: true,
    features: [
      'Check in at any 5 distinct gyms',
      'Unlimited sessions per gym',
      '1 visit/day per gym',
      'QR check-in',
      'Standard & Premium gyms',
    ],
  },
  {
    id: 'multigym_max',
    name: 'Multi-Gym Max',
    sub: 'Unlimited access to every gym',
    price: 3999,
    gymLimit: null,
    aurora: 'rgba(255,160,0,0.55)',
    popular: false,
    features: [
      'Unlimited gyms, unlimited visits',
      '1 visit/day per gym',
      'All gym tiers included',
      'Priority support',
      'PT session add-on eligible',
    ],
  },
];

const MULTIGYM_TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Software Engineer · Bangalore',
    avatar: 'PS',
    rating: 5,
    plan: 'Elite',
    text: 'I work from two offices and hit different gyms near each one. The Elite plan means I never miss a workout, no matter where I am. QR check-in is seamless!',
  },
  {
    name: 'Rahul Mehta',
    role: 'Entrepreneur · Mumbai',
    avatar: 'RM',
    rating: 5,
    plan: 'Max',
    text: 'Max is the best fitness decision I\'ve made. I explore new gyms every week — swimming pools, CrossFit boxes, yoga studios. All on one subscription.',
  },
  {
    name: 'Ananya Krishnan',
    role: 'Marketing Lead · Chennai',
    avatar: 'AK',
    rating: 5,
    plan: 'Elite',
    text: 'I used to pay ₹3,000/month for just one gym. With Multi-Gym Elite I access 5 premium gyms near my home and office. Huge upgrade, lower cost.',
  },
  {
    name: 'Vikram Nair',
    role: 'Consultant · Delhi',
    avatar: 'VN',
    rating: 5,
    plan: 'Max',
    text: 'Travelling for work used to mean skipping workouts. With Max I just find the nearest BookMyFit gym, scan in, and go. Game changer.',
  },
];

const PLAN_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80',
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function Plans() {
  const { gymId, gymName } = useLocalSearchParams<{ gymId?: string; gymName?: string }>();
  const [plans, setPlans] = useState(MULTIGYM_PLANS);
  const [selected, setSelected] = useState('multigym_elite');
  const [loading, setLoading] = useState(true);
  // 'choose' = top-level, 'multigym' = showing Elite/Max
  const [view, setView] = useState<'choose' | 'multigym'>('choose');

  useEffect(() => {
    subscriptionsApi.plans()
      .then((data: any) => {
        if (data?.multigym) {
          const { elite, max } = data.multigym;
          setPlans([
            { ...MULTIGYM_PLANS[0], name: elite?.name || MULTIGYM_PLANS[0].name, price: elite?.basePrice || 1499, features: elite?.features || MULTIGYM_PLANS[0].features },
            { ...MULTIGYM_PLANS[1], name: max?.name || MULTIGYM_PLANS[1].name, price: max?.basePrice || 3999, features: max?.features || MULTIGYM_PLANS[1].features },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = plans.find((p) => p.id === selected);

  if (view === 'multigym') {
    return <MultiGymView plans={plans} selected={selected} setSelected={setSelected} selectedPlan={selectedPlan} onBack={() => setView('choose')} loading={loading} />;
  }

  return (
    <AuroraBackground variant="premium">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Choose Plan</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={s.chooseContainer} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionKicker}>Membership Type</Text>
          <Text style={s.sectionHeading}>How would you like{'\n'}to work out?</Text>

          {/* Individual Gym Plan card */}
          <TouchableOpacity activeOpacity={0.88} style={s.typeCard} onPress={() => {
            if (gymId) {
              // Already have a specific gym — go to duration directly
              router.push({
                pathname: '/duration',
                params: { planId: 'gym_specific', planName: `${gymName || 'Gym'} Membership`, gymId, basePrice: '599' },
              } as any);
            } else {
              // No gym selected — send user to explore to pick one
              router.push('/(tabs)/explore' as any);
            }
          }}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80' }}
              style={s.typeCardImg}
              imageStyle={{ borderRadius: radius.xl }}
            >
              <View style={s.typeCardOverlay} />
              <View style={s.typeCardBody}>
                <View style={[s.typeIcon, { backgroundColor: 'rgba(204,255,0,0.15)' }]}>
                  <IconBuilding size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.typeTitle}>Individual Gym Plan</Text>
                  <Text style={s.typeSub}>Subscribe to a specific gym. Pricing is set by the gym — browse gyms to see their plans.</Text>
                </View>
                <IconArrowRight size={18} color={colors.accent} />
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Multi-Gym Pass card */}
          <TouchableOpacity activeOpacity={0.88} style={s.typeCard} onPress={() => setView('multigym')}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' }}
              style={s.typeCardImg}
              imageStyle={{ borderRadius: radius.xl }}
            >
              <View style={[s.typeCardOverlay, { backgroundColor: 'rgba(90,0,200,0.6)' }]} />
              <View style={s.accentPill}>
                <Text style={s.accentPillText}>RECOMMENDED</Text>
              </View>
              <View style={s.typeCardBody}>
                <View style={[s.typeIcon, { backgroundColor: 'rgba(155,0,255,0.2)' }]}>
                  <IconGlobe size={22} color="#b97fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.typeTitle}>Multi-Gym Pass</Text>
                  <Text style={s.typeSub}>Access ANY gym on BookMyFit. Choose Elite (5 gyms) or Max (unlimited). Platform-managed pricing.</Text>
                </View>
                <IconArrowRight size={18} color="#b97fff" />
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <View style={s.infoBox}>
            <Text style={s.infoText}>💡 <Text style={{ color: '#fff', fontFamily: fonts.sansMedium }}>No gym selection</Text> needed for Multi-Gym — walk into any listed gym and scan your QR.</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ── Multi-Gym Sub-screen ───────────────────────────────────────────────────────

function MultiGymView({ plans, selected, setSelected, selectedPlan, onBack, loading }: any) {
  return (
    <AuroraBackground variant="premium">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={onBack}>
            <IconArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Multi-Gym Pass</Text>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
            <Text style={s.mgKicker}>Choose your tier</Text>
            <Text style={s.mgHeading}>Access any gym{'\n'}in our network</Text>

            {/* Plan cards */}
            {plans.map((p: any, idx: number) => (
              <View key={p.id}>
                {p.popular && (
                  <View style={s.popularWrap}>
                    <Text style={s.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <TouchableOpacity activeOpacity={0.9} onPress={() => setSelected(p.id)}
                  style={[s.planCard, selected === p.id && s.planCardSelected]}>
                  <ImageBackground source={{ uri: PLAN_IMAGES[idx % PLAN_IMAGES.length] }} style={s.planImg} imageStyle={{ borderRadius: radius.xl }}>
                    <View style={[s.planAurora, { backgroundColor: p.aurora }]} />
                    <View style={s.planDark} />
                    <View style={[s.selectDot, selected === p.id && s.selectDotActive]}>
                      {selected === p.id && <IconCheck size={10} color="#000" />}
                    </View>
                    <View style={s.planBody}>
                      <View>
                        <Text style={s.planName}>{p.name}</Text>
                        <Text style={s.planSub}>{p.sub}</Text>
                        <Text style={s.planGymsLabel}>
                          {p.gymLimit === null ? 'Unlimited gyms' : `Up to ${p.gymLimit} distinct gyms`}
                        </Text>
                      </View>
                      <View style={s.planBottom}>
                        <View>
                          {(p.features || []).slice(0, 3).map((f: string) => (
                            <View key={f} style={s.perkRow}>
                              <IconCheck size={10} color={colors.accent} />
                              <Text style={s.perkText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                        <View>
                          <Text style={s.price}>₹{Number(p.price).toLocaleString('en-IN')}<Text style={s.pricePer}>/mo</Text></Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </View>
            ))}

            {/* How it works */}
            <View style={s.howSection}>
              <Text style={s.howTitle}>How Multi-Gym works</Text>
              {[
                { step: '1', title: 'Buy your pass', desc: 'Choose Elite (5 gyms) or Max (unlimited) and pay once.' },
                { step: '2', title: 'Discover any gym', desc: 'Browse our network — no gym pre-selection needed.' },
                { step: '3', title: 'Scan & check in', desc: 'Generate your QR in-app and scan at the gym front desk.' },
              ].map((h) => (
                <View key={h.step} style={s.howRow}>
                  <View style={s.howBadge}><Text style={s.howBadgeText}>{h.step}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.howRowTitle}>{h.title}</Text>
                    <Text style={s.howRowDesc}>{h.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Elite vs Max compare */}
            <View style={s.compareCard}>
              <Text style={s.compareTitle}>Elite vs Max</Text>
              {[
                ['Gyms accessible', '5 distinct', 'Unlimited'],
                ['Daily visits per gym', '1/day', '1/day'],
                ['All gym tiers', '✓', '✓'],
                ['PT add-on', '—', '✓'],
                ['Price (monthly)', '₹1,499', '₹3,999'],
              ].map(([label, elite, max]) => (
                <View key={label} style={s.compareRow}>
                  <Text style={s.compareLabel}>{label}</Text>
                  <Text style={[s.compareVal, { color: selected === 'multigym_elite' ? colors.accent : colors.t2 }]}>{elite}</Text>
                  <Text style={[s.compareVal, { color: selected === 'multigym_max' ? '#ffa500' : colors.t2 }]}>{max}</Text>
                </View>
              ))}
              <View style={s.compareHeader}>
                <Text style={s.compareLabel} />
                <Text style={[s.compareHeaderText, { color: colors.accent }]}>Elite</Text>
                <Text style={[s.compareHeaderText, { color: '#ffa500' }]}>Max</Text>
              </View>
            </View>

            {/* Testimonials */}
            <Text style={s.testimonialsTitle}>What members say</Text>
            {MULTIGYM_TESTIMONIALS.map((t) => (
              <View key={t.name} style={s.testimonialCard}>
                <View style={s.testimonialHeader}>
                  <View style={s.testimonialAvatar}>
                    <Text style={s.testimonialAvatarText}>{t.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.testimonialName}>{t.name}</Text>
                    <Text style={s.testimonialRole}>{t.role}</Text>
                  </View>
                  <View style={s.planPill}>
                    <Text style={s.planPillText}>{t.plan}</Text>
                  </View>
                </View>
                <View style={s.starsRow}>
                  {Array.from({ length: t.rating }).map((_, i) => <Text key={i} style={{ fontSize: 11, color: colors.accent }}>★</Text>)}
                </View>
                <Text style={s.testimonialText}>"{t.text}"</Text>
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        {!loading && (
          <View style={s.footer}>
            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.9}
              onPress={() => router.push({
                pathname: '/duration',
                params: {
                  planId: selected,
                  planName: selectedPlan?.name,
                  maxGyms: String(selectedPlan?.gymLimit ?? 999),
                  basePrice: String(selectedPlan?.price ?? 999),
                },
              } as any)}
            >
              <Text style={s.ctaText}>Next: Choose Duration</Text>
              <IconArrowRight size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 12 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },

  // Choose view
  chooseContainer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  sectionKicker: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent, marginBottom: 8 },
  sectionHeading: { fontFamily: fonts.serif, fontSize: 26, color: '#fff', lineHeight: 34, marginBottom: 24 },
  typeCard: { borderRadius: radius.xl, marginBottom: 14, overflow: 'hidden' },
  typeCardImg: { minHeight: 150 },
  typeCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.xl },
  typeCardBody: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontFamily: fonts.serif, fontSize: 19, color: '#fff', marginBottom: 4 },
  typeSub: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  accentPill: { position: 'absolute', top: 14, right: 14, backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  accentPillText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#000', letterSpacing: 1.5 },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', padding: 14, marginTop: 4 },
  infoText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },

  // Multigym view
  container: { paddingHorizontal: 22, paddingBottom: 20 },
  mgKicker: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent, marginBottom: 6, marginTop: 4 },
  mgHeading: { fontFamily: fonts.serif, fontSize: 24, color: '#fff', lineHeight: 32, marginBottom: 18 },

  // Plan cards
  popularWrap: { alignItems: 'center', marginBottom: -6, zIndex: 5 },
  popularText: { fontFamily: fonts.sansBold, fontSize: 8, color: '#000', letterSpacing: 1.5, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  planCard: { borderRadius: radius.xl, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, minHeight: 160 },
  planCardSelected: { borderColor: colors.accentBorder },
  planImg: { minHeight: 160 },
  planAurora: { ...StyleSheet.absoluteFillObject, opacity: 0.65 },
  planDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  selectDot: { position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  selectDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  planBody: { padding: 16, flex: 1, justifyContent: 'space-between' },
  planName: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  planSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t, marginTop: 2 },
  planGymsLabel: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.accent, marginTop: 4 },
  planBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  perkText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t },
  price: { fontFamily: fonts.sansBold, fontSize: 22, color: '#fff' },
  pricePer: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  // How it works
  howSection: { marginTop: 20, marginBottom: 16 },
  howTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', marginBottom: 14 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  howBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(204,255,0,0.12)', borderWidth: 1, borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  howBadgeText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  howRowTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: '#fff', marginBottom: 2 },
  howRowDesc: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, lineHeight: 18 },

  // Compare table
  compareCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: radius.xl, padding: 16, marginBottom: 20 },
  compareTitle: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: colors.accent, marginBottom: 12 },
  compareHeader: { flexDirection: 'row', marginBottom: 8, position: 'absolute', top: 14, right: 16 },
  compareHeaderText: { fontFamily: fonts.sansBold, fontSize: 11, width: 60, textAlign: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingVertical: 8 },
  compareLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  compareVal: { fontFamily: fonts.sansMedium, fontSize: 12, width: 60, textAlign: 'center' },

  // Testimonials
  testimonialsTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', marginBottom: 14 },
  testimonialCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, marginBottom: 12 },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  testimonialAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(204,255,0,0.12)', borderWidth: 1, borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  testimonialAvatarText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  testimonialName: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  testimonialRole: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },
  planPill: { backgroundColor: 'rgba(155,0,255,0.15)', borderWidth: 1, borderColor: 'rgba(155,0,255,0.4)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  planPillText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#b97fff' },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  testimonialText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },

  // Footer CTA
  footer: { paddingHorizontal: 22, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(6,6,6,0.9)' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 30, backgroundColor: colors.accent },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
});

