import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconArrowRight, IconCheck } from '../components/Icons';
import { subscriptionsApi } from '../lib/api';

const PLAN_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
];

const DEFAULT_PLANS = [
  { id: 'individual', name: 'Individual', sub: '1 Gym Access', price: 599, maxGyms: 1, perks: ['Unlimited visits', 'QR Check-in', 'All Standard gyms'], aurora: 'rgba(204,255,0,0.58)', popular: false },
  { id: 'elite', name: 'Elite', sub: '5+ Gyms Access', price: 1499, maxGyms: 5, perks: ['Multi-gym access', 'Video library', 'All Premium gyms'], aurora: 'rgba(155,0,255,0.6)', popular: true },
  { id: 'pro', name: 'Pro', sub: 'All Gyms Unlimited', price: 2499, maxGyms: 10, perks: ['PT add-on included', 'Full video library', 'All Elite gyms'], aurora: 'rgba(0,175,255,0.6)', popular: false },
  { id: 'max', name: 'Max', sub: 'Everything Unlimited', price: 3999, maxGyms: 99, perks: ['Unlimited PT sessions', 'Priority support', 'All locations'], aurora: 'rgba(255,200,50,0.6)', popular: false },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Software Engineer, Bangalore',
    avatar: 'PS',
    rating: 5,
    text: 'BookMyFit changed how I work out. I travel between offices and can now hit a premium gym near any location. The QR check-in is seamless!',
  },
  {
    name: 'Rahul Mehta',
    role: 'Entrepreneur, Mumbai',
    avatar: 'RM',
    rating: 5,
    text: 'Worth every rupee. The Elite plan gives me access to 5 top gyms — I switch based on my schedule. No more being tied to one gym!',
  },
  {
    name: 'Ananya Krishnan',
    role: 'Marketing Lead, Chennai',
    avatar: 'AK',
    rating: 5,
    text: 'I used to pay ₹3,000/month for a single gym. With BookMyFit Pro I get 10 premium gyms, PT sessions, and the video library. Best fitness investment.',
  },
];

export default function Plans() {
  const params = useLocalSearchParams<{ gymId?: string; gymName?: string }>();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [selected, setSelected] = useState('elite');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionsApi.plans()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.plans || data?.data || [];
        if (list.length > 0) {
          const mapped = list.map((p: any, i: number) => ({
            id: p.id || p._id || p.planId || `plan_${i}`,
            name: p.name || p.planName || DEFAULT_PLANS[i]?.name || 'Plan',
            sub: p.subtitle || p.description || DEFAULT_PLANS[i]?.sub || '',
            price: p.price || p.monthlyPrice || DEFAULT_PLANS[i]?.price || 0,
            maxGyms: p.maxGyms || p.gymLimit || DEFAULT_PLANS[i]?.maxGyms || 1,
            perks: p.features || p.perks || DEFAULT_PLANS[i]?.perks || [],
            aurora: DEFAULT_PLANS[i]?.aurora || 'rgba(204,255,0,0.58)',
            popular: p.popular || DEFAULT_PLANS[i]?.popular || false,
          }));
          setPlans(mapped);
          setSelected(mapped[1]?.id || mapped[0]?.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = plans.find((p) => p.id === selected);

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

      {params.gymName && (
        <View style={s.gymHint}>
          <Text style={s.gymHintText}>For: <Text style={{ color: colors.accent }}>{params.gymName}</Text></Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          {plans.map((p, idx) => (
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
                  {/* Select dot */}
                  <View style={[s.selectDot, selected === p.id && s.selectDotActive]}>
                    {selected === p.id && <IconCheck size={10} color="#000" />}
                  </View>
                  <View style={s.planBody}>
                    <View>
                      <Text style={s.planName}>{p.name}</Text>
                      <Text style={s.planSub}>{p.sub}</Text>
                      <Text style={s.planGymsLabel}>
                        {p.maxGyms >= 99 ? 'Unlimited gyms' : `Up to ${p.maxGyms} gym${p.maxGyms > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    <View style={s.planBottom}>
                      <View>
                        {(Array.isArray(p.perks) ? p.perks : []).map((perk: string) => (
                          <View key={perk} style={s.perkRow}>
                            <IconCheck size={10} color={colors.accent} />
                            <Text style={s.perkText}>{perk}</Text>
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

          {/* Testimonials */}
          <View style={s.testimonialsSection}>
            <Text style={s.testimonialsTitle}>What members say</Text>
            {TESTIMONIALS.map((t) => (
              <View key={t.name} style={s.testimonialCard}>
                <View style={s.testimonialHeader}>
                  <View style={s.testimonialAvatar}>
                    <Text style={s.testimonialAvatarText}>{t.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.testimonialName}>{t.name}</Text>
                    <Text style={s.testimonialRole}>{t.role}</Text>
                  </View>
                  <View style={s.starsRow}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Text key={i} style={{ fontSize: 10, color: colors.accent }}>★</Text>
                    ))}
                  </View>
                </View>
                <Text style={s.testimonialText}>"{t.text}"</Text>
              </View>
            ))}
            <View style={{ height: 16 }} />
          </View>
        </ScrollView>
      )}

      {!loading && (
        <View style={s.footer}>
          <TouchableOpacity
            style={s.cta}
            activeOpacity={0.9}
            onPress={() => router.push({
              pathname: '/duration',
              params: { planId: selected, planName: selectedPlan?.name, gymId: params.gymId, maxGyms: String((selectedPlan as any)?.maxGyms ?? 1) },
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

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 12 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
  gymHint: { paddingHorizontal: 22, marginBottom: 8 },
  gymHintText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t },
  container: { paddingHorizontal: 22, paddingBottom: 20 },
  popularWrap: { alignItems: 'center', marginBottom: -6, zIndex: 5 },
  popularText: { fontFamily: fonts.sansBold, fontSize: 8, color: '#000', letterSpacing: 1.5, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  planCard: { borderRadius: radius.xl, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, minHeight: 140 },
  planCardSelected: { borderColor: colors.accentBorder },
  planImg: { minHeight: 140 },
  planAurora: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  planDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  selectDot: {
    position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
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
  footer: {
    paddingHorizontal: 22, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(6,6,6,0.9)',
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
  testimonialsSection: { marginTop: 8, paddingTop: 8 },
  testimonialsTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', marginBottom: 14, paddingHorizontal: 2 },
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, marginBottom: 12,
  },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  testimonialAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(61,255,84,0.15)', borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  testimonialAvatarText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accent },
  testimonialName: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  testimonialRole: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },
  starsRow: { flexDirection: 'row', gap: 2 },
  testimonialText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t, lineHeight: 20 },
});
