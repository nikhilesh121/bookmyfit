import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import {
  IconArrowLeft, IconDumbbell, IconBolt, IconCheck, IconUser, IconStar, IconCalendar,
} from '../components/Icons';
import { wellnessApi, usersApi } from '../lib/api';

const CATEGORIES = ['All', 'Yoga', 'Meditation', 'Nutrition', 'Physio', 'Training', 'Spa'];

const STATIC_SERVICES = [
  { name: 'Yoga Classes', desc: 'Find certified yoga instructors near you', icon: 'dumbbell', category: 'Yoga', price: 'From ₹499', aurora: 'rgba(204,255,0,0.18)' },
  { name: 'Meditation Sessions', desc: 'Guided mindfulness and stress relief', icon: 'bolt', category: 'Meditation', price: 'From ₹299', aurora: 'rgba(155,0,255,0.18)' },
  { name: 'Nutrition Consult', desc: 'Personalized diet plans by experts', icon: 'check', category: 'Nutrition', price: 'From ₹799', aurora: 'rgba(0,175,255,0.18)' },
  { name: 'Physiotherapy', desc: 'Injury recovery and mobility training', icon: 'calendar', category: 'Physio', price: 'From ₹999', aurora: 'rgba(255,138,0,0.18)' },
  { name: 'Personal Training', desc: '1-on-1 sessions with certified trainers', icon: 'user', category: 'Training', price: 'From ₹1,499', aurora: 'rgba(204,255,0,0.18)' },
  { name: 'Spa & Recovery', desc: 'Post-workout recovery and relaxation', icon: 'star', category: 'Spa', price: 'From ₹1,299', aurora: 'rgba(255,200,50,0.18)' },
];

function ServiceIcon({ icon, size, color }: { icon: string; size: number; color: string }) {
  if (icon === 'dumbbell') return <IconDumbbell size={size} color={color} />;
  if (icon === 'bolt') return <IconBolt size={size} color={color} />;
  if (icon === 'check') return <IconCheck size={size} color={color} />;
  if (icon === 'calendar') return <IconCalendar size={size} color={color} />;
  if (icon === 'user') return <IconUser size={size} color={color} />;
  if (icon === 'star') return <IconStar size={size} color={color} />;
  return <IconBolt size={size} color={color} />;
}

export default function Wellness() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [services, setServices] = useState(STATIC_SERVICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wellnessApi.list()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.services || data?.data || [];
        if (list.length > 0) {
          setServices(list.map((s: any, i: number) => ({
            id: s.id || s._id || null,
            name: s.name || STATIC_SERVICES[i]?.name || 'Service',
            desc: s.description || s.desc || STATIC_SERVICES[i]?.desc || '',
            icon: STATIC_SERVICES[i]?.icon || 'bolt',
            category: s.serviceType || s.category || STATIC_SERVICES[i]?.category || 'Other',
            price: s.price ? `From ₹${s.price}` : (STATIC_SERVICES[i]?.price || ''),
            aurora: STATIC_SERVICES[i]?.aurora || 'rgba(204,255,0,0.18)',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async (svc: any) => {
    if (!svc.id) {
      Alert.alert('Coming Soon', `${svc.name} booking will be available shortly. Stay tuned!`);
      return;
    }
    try {
      const me = await usersApi.me() as any;
      const today = new Date().toISOString().slice(0, 10);
      await wellnessApi.book({ userId: me.id || me._id, serviceId: svc.id, bookingDate: today, phone: me.phone || '' });
      Alert.alert('Booking Confirmed! 🎉', `Your ${svc.name} session has been booked for today. We'll contact you to confirm the time.`);
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.message || 'Could not complete booking. Please try again.');
    }
  };

  const filtered = activeCategory === 'All'
    ? services
    : services.filter((s) => s.category === activeCategory);

  return (
    <AuroraBackground>
    <SafeAreaView style={s.root}>
      {/* Aurora glow */}
      <View style={s.aurora1} />
      <View style={s.aurora2} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Wellness & Services</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* Intro */}
          <Text style={s.intro}>
            Discover wellness services curated for your fitness journey.
          </Text>

          {/* Category pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.pill, activeCategory === cat && s.pillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[s.pillText, activeCategory === cat && s.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Service cards */}
          {filtered.map((svc, idx) => (
            <View key={`${svc.name}-${idx}`} style={s.card}>
              <View style={[s.cardAurora, { backgroundColor: svc.aurora }]} />
              <View style={s.cardRow}>
                {/* Icon box */}
                <View style={s.iconBox}>
                  <ServiceIcon icon={svc.icon} size={22} color={colors.accent} />
                </View>

                {/* Info */}
                <View style={s.cardInfo}>
                  <View style={s.categoryBadge}>
                    <Text style={s.categoryText}>{svc.category}</Text>
                  </View>
                  <Text style={s.cardName}>{svc.name}</Text>
                  <Text style={s.cardDesc}>{svc.desc}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={s.cardFooter}>
                <Text style={s.priceText}>{svc.price}</Text>
                <TouchableOpacity
                  style={s.bookBtn}
                  activeOpacity={0.8}
                  onPress={() => handleBook(svc)}
                >
                  <Text style={s.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filtered.length === 0 && (
            <View style={s.empty}>
              <IconDumbbell size={40} color={colors.accent} />
              <Text style={s.emptyTitle}>No services found</Text>
              <Text style={s.emptyBody}>Try a different category</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  aurora1: {
    position: 'absolute', top: '10%', right: '-10%',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(204,255,0,0.10)',
  },
  aurora2: {
    position: 'absolute', top: '40%', left: '-15%',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(155,0,255,0.09)',
  },
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
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  intro: {
    fontFamily: fonts.sans, fontSize: 13, color: colors.t,
    marginBottom: 18, lineHeight: 20,
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  pillText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  pillTextActive: { color: colors.accent },
  card: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 16, marginBottom: 12, overflow: 'hidden',
  },
  cardAurora: { ...StyleSheet.absoluteFillObject },
  cardRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  iconBox: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.30)', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.t2, letterSpacing: 1, textTransform: 'uppercase' },
  cardName: { fontFamily: fonts.serif, fontSize: 17, color: '#fff' },
  cardDesc: { fontFamily: fonts.sans, fontSize: 12, color: colors.t, lineHeight: 17 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12,
  },
  priceText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accent },
  bookBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  bookBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#060606' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
});
