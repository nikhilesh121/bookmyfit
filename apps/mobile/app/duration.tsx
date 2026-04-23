import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius, spacing } from '../theme/brand';
import { IconArrowLeft, IconCheck } from '../components/Icons';

const PT_PRICE = 1600;
const GST_RATE = 0.18;

export default function Duration() {
  const { planId, planName, gymId, maxGyms, basePrice } = useLocalSearchParams<{
    planId: string; planName: string; gymId?: string; maxGyms?: string; basePrice?: string;
  }>();

  const monthlyBase = Number(basePrice) || 999;
  const isMultigym = planId?.startsWith('multigym_');
  const dayPassPrice = Math.round(monthlyBase / 20 * 1.5); // ~4.5% of monthly, premium per-day rate

  // Build duration options relative to the plan's monthly base price
  const DURATIONS = useMemo(() => [
    {
      months: 0,
      label: '1 Day Pass',
      sublabel: '🌶️ HOT',
      price: dayPassPrice,
      save: null,
      isDayPass: true,
      hot: true,
    },
    { months: 1, label: '1 Month', sublabel: 'Most flexible', price: monthlyBase, save: null, isDayPass: false, hot: false },
    { months: 3, label: '3 Months', sublabel: 'Popular choice', price: Math.round(monthlyBase * 3 * 0.92), save: 'Save 8%', isDayPass: false, hot: false },
    { months: 6, label: '6 Months', sublabel: 'Best value', price: Math.round(monthlyBase * 6 * 0.85), save: 'Save 15%', isDayPass: false, hot: false },
    { months: 12, label: '12 Months', sublabel: 'Maximum savings', price: Math.round(monthlyBase * 12 * 0.75), save: 'Save 25%', isDayPass: false, hot: false },
  ], [monthlyBase, dayPassPrice]);

  const [selected, setSelected] = useState(1); // default: 1 Month
  const [ptAddon, setPtAddon] = useState(false);

  const dur = DURATIONS[selected];
  const base = dur.price;
  const ptCost = !dur.isDayPass && ptAddon ? PT_PRICE : 0;
  const subtotal = base + ptCost;
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  const handleCheckout = () => {
    router.push({
      pathname: '/order',
      params: {
        planId: planId || '',
        planName: planName || 'Standard Plan',
        gymId: gymId || '',
        durationMonths: String(dur.months),
        totalAmount: String(total),
        ptAddon: ptAddon && !dur.isDayPass ? 'true' : 'false',
        maxGyms: maxGyms || '1',
        isDayPass: dur.isDayPass ? 'true' : 'false',
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
        <Text style={s.headerTitle}>Choose Duration</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.kicker}>Membership Duration</Text>

        {/* Duration options */}
        {DURATIONS.map((d, i) => {
          const active = i === selected;
          return (
            <TouchableOpacity
              key={d.isDayPass ? 'daypass' : d.months}
              style={[s.optionCard, active && s.optionCardActive, d.hot && s.optionCardHot]}
              onPress={() => setSelected(i)}
              activeOpacity={0.8}
            >
              {d.hot && (
                <View style={s.hotBadge}>
                  <Text style={s.hotBadgeText}>🌶️ HOT</Text>
                </View>
              )}

              {/* Radio */}
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>

              <View style={s.optionInfo}>
                <View style={s.optionLabelRow}>
                  <Text style={[s.optionLabel, active && { color: '#fff' }]}>{d.label}</Text>
                  {d.sublabel && !d.hot && (
                    <Text style={s.optionSublabel}>{d.sublabel}</Text>
                  )}
                </View>
                <Text style={[s.optionPrice, active && { color: d.hot ? '#ff6b35' : colors.accent }]}>
                  ₹{d.price.toLocaleString('en-IN')}
                  <Text style={s.optionPricePer}>{d.isDayPass ? '/day' : '/plan'}</Text>
                </Text>
              </View>

              {d.save && (
                <View style={s.savePill}>
                  <Text style={s.savePillText}>{d.save}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* PT Add-on — only for monthly+ plans */}
        {!dur.isDayPass && (
          <View style={s.ptCard}>
            <View style={s.ptLeft}>
              <Text style={s.ptTitle}>Personal Trainer Add-on</Text>
              <Text style={s.ptSub}>8 sessions · Expert-matched PT</Text>
            </View>
            <View style={s.ptRight}>
              <Text style={s.ptPrice}>₹{PT_PRICE.toLocaleString('en-IN')}</Text>
              <Switch
                value={ptAddon}
                onValueChange={setPtAddon}
                trackColor={{ false: colors.border, true: colors.accentBorder }}
                thumbColor={ptAddon ? colors.accent : 'rgba(255,255,255,0.4)'}
              />
            </View>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={s.footer}>
        <View style={s.breakdown}>
          <View style={s.breakRow}>
            <Text style={s.breakLabel}>{dur.label}</Text>
            <Text style={s.breakVal}>₹{base.toLocaleString('en-IN')}</Text>
          </View>
          {ptAddon && !dur.isDayPass && (
            <View style={s.breakRow}>
              <Text style={s.breakLabel}>PT Add-on (8 sessions)</Text>
              <Text style={s.breakVal}>₹{PT_PRICE.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={s.breakRow}>
            <Text style={s.breakLabel}>GST (18%)</Text>
            <Text style={s.breakVal}>₹{gst.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[s.breakRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalVal}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.btnPrimary} onPress={handleCheckout}>
          <Text style={s.btnPrimaryText}>
            {dur.isDayPass ? '🌶️ Get Day Pass' : 'Proceed to Checkout'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  back: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  kicker: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.xl, padding: 18, marginBottom: 12, overflow: 'hidden',
  },
  optionCardActive: {
    borderColor: colors.accent, backgroundColor: 'rgba(204,255,0,0.06)',
  },
  optionCardHot: {
    borderColor: 'rgba(255,107,53,0.6)', backgroundColor: 'rgba(255,107,53,0.08)',
  },
  hotBadge: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.5)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  hotBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#ff6b35' },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  optionInfo: { flex: 1 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  optionLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.t },
  optionSublabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3 },
  optionPrice: { fontFamily: fonts.sansBold, fontSize: 18, color: '#fff' },
  optionPricePer: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  savePill: {
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  savePillText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },
  ptCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.xl, padding: 18, marginTop: 8,
  },
  ptLeft: { flex: 1 },
  ptTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: '#fff', marginBottom: 3 },
  ptSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  ptRight: { alignItems: 'flex-end', gap: 6 },
  ptPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(6,6,6,0.95)',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
  },
  breakdown: { marginBottom: 14 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  breakVal: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.t },
  totalRow: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingTop: 8, marginTop: 4 },
  totalLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff' },
  totalVal: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.accent },
  btnPrimary: {
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
});
