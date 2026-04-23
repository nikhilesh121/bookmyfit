import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconCheck, IconLock, IconTag } from '../components/Icons';
import { subscriptionsApi, couponsApi } from '../lib/api';

const GST_RATE = 0.18;

export default function Order() {
  const { planId, planName, gymId, durationMonths, totalAmount, ptAddon, maxGyms, isDayPass: isDayPassParam } =
    useLocalSearchParams<{
      planId: string; planName: string; gymId?: string;
      durationMonths: string; totalAmount: string; ptAddon?: string; maxGyms?: string; isDayPass?: string;
    }>();

  const hasPt = ptAddon === 'true';
  const isDayPassRoute = isDayPassParam === 'true';
  const months = Number(durationMonths) || 1;
  const total = Number(totalAmount) || 0;
  const gst = Math.round(total / (1 + GST_RATE) * GST_RATE);
  const planBase = total - gst - (hasPt ? 1600 : 0);
  const isMultigym = planId?.startsWith('multigym_');

  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGyms, setSelectedGyms] = useState<string[]>([]);
  const gymLimit = isMultigym ? (Number(maxGyms) || 999) : 1;

  const toggleGym = (id: string) => {
    setSelectedGyms((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= gymLimit) {
        Alert.alert('Limit Reached', `You can select up to ${gymLimit} gym${gymLimit > 1 ? 's' : ''} with this plan.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const result: any = await couponsApi.validate(coupon, planId || undefined);
      const discountPct = result?.discountPercent || result?.discount || 0;
      const d = Math.round(planBase * (discountPct / 100));
      setDiscount(d);
      setCouponApplied(true);
      Alert.alert('Coupon Applied!', `${discountPct}% discount added.`);
    } catch {
      if (coupon.toUpperCase() === 'BMF20') {
        const d = Math.round(planBase * 0.20);
        setDiscount(d);
        setCouponApplied(true);
        Alert.alert('Coupon Applied!', '20% discount added.');
      } else {
        Alert.alert('Invalid Coupon', 'This code is not valid or has expired.');
      }
    }
  };

  const finalTotal = Math.max(0, total - discount);

  const handlePay = async () => {
    setLoading(true);
    try {
      const result: any = await subscriptionsApi.createOrder({
        planId: planId || '',
        gymId: isMultigym ? undefined : (gymId || undefined),
        durationMonths: months,
        ptAddon: hasPt,
        couponCode: couponApplied ? coupon : undefined,
        totalAmount: finalTotal,
        isDayPass: isDayPassRoute,
      });

      // New API returns { subscription, payment }
      const subRecord = result?.subscription || result;
      const paymentInfo = result?.payment || result;
      const subId = subRecord?.id || subRecord?._id;
      const orderId = paymentInfo?.orderId || result?.orderId;
      const sessionId = paymentInfo?.paymentSessionId || result?.paymentSessionId;

      if (sessionId && orderId && !paymentInfo?.mock) {
        router.push({
          pathname: '/payment-webview',
          params: { orderId, sessionId, planId: planId || '', gymId: gymId || '', subId: subId || '' },
        });
      } else {
        // Dev mode or mock payment — subscription already activated by backend
        router.replace({
          pathname: '/success',
          params: {
            orderId: orderId || 'N/A',
            planName: planName || 'Standard Plan',
            gymName: isMultigym ? 'Any gym on BookMyFit' : (gymId ? 'Selected Gym' : 'Multi-gym Access'),
            validUntil: new Date(Date.now() + Math.max(months, 1) * 30 * 24 * 3600 * 1000)
              .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            amountPaid: String(finalTotal),
            subscriptionId: subId || 'NEW',
          },
        });
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err?.message || 'Unable to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order Summary</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Plan card */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=70' }}
          style={s.planCard}
          imageStyle={{ borderRadius: radius.xl, opacity: 0.3 }}
        >
          <View style={s.planCardOverlay}>
            <View style={s.planBadge}>
              <Text style={s.planBadgeText}>
                {isDayPassRoute ? '🌶️ DAY PASS' : `${durationMonths} MONTH${Number(durationMonths) > 1 ? 'S' : ''}`}
              </Text>
            </View>
            <Text style={s.planName}>{planName || 'Standard Plan'}</Text>
            <Text style={s.planGym}>
              {isMultigym ? 'Any gym in our network · No restrictions' : (gymId ? 'Your selected gym' : 'Gym Access')}
            </Text>
          </View>
        </ImageBackground>

        {/* Multi-gym access notice */}
        {isMultigym && (
          <View style={[s.card, { borderColor: colors.accentBorder }]}>
            <Text style={[s.sectionLabel, { marginBottom: 6 }]}>Multi-Gym Access Included</Text>
            <Text style={s.rowLabel}>
              With this plan you can check in at <Text style={{ color: colors.accent, fontFamily: fonts.sansMedium }}>any BookMyFit gym</Text>. No pre-selection needed — just browse gyms, generate your QR, and walk in.
            </Text>
          </View>
        )}

        {/* Breakdown */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Price Breakdown</Text>

          <View style={s.row}>
            <Text style={s.rowLabel}>Plan Price</Text>
            <Text style={s.rowVal}>₹{planBase.toLocaleString('en-IN')}</Text>
          </View>
          {hasPt && (
            <View style={s.row}>
              <Text style={s.rowLabel}>PT Add-on (8 sessions)</Text>
              <Text style={s.rowVal}>₹1,600</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.rowLabel}>GST (18%)</Text>
            <Text style={s.rowVal}>₹{gst.toLocaleString('en-IN')}</Text>
          </View>
          {couponApplied && (
            <View style={s.row}>
              <Text style={[s.rowLabel, { color: colors.accent }]}>Discount (BMF20)</Text>
              <Text style={[s.rowVal, { color: colors.accent }]}>-₹{discount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.totalLabel}>Total Payable</Text>
            <Text style={s.totalVal}>₹{finalTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Coupon */}
        <View style={s.couponRow}>
          <View style={s.couponInputWrap}>
            <IconTag size={14} color={colors.t2} />
            <TextInput
              style={s.couponInput}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.t3}
              value={coupon}
              onChangeText={setCoupon}
              autoCapitalize="characters"
              editable={!couponApplied}
            />
          </View>
          <TouchableOpacity
            style={[s.applyBtn, couponApplied && s.applyBtnDone]}
            onPress={couponApplied ? undefined : applyCoupon}
          >
            {couponApplied
              ? <IconCheck size={16} color={colors.accent} />
              : <Text style={s.applyBtnText}>Apply</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Security badge */}
        <View style={s.securedRow}>
          <IconLock size={12} color={colors.t2} />
          <Text style={s.securedText}>Secured by Cashfree · 256-bit SSL encryption</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#060606" />
            : <Text style={s.payBtnText}>Pay ₹{finalTotal.toLocaleString('en-IN')}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  back: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  planCard: {
    height: 140, borderRadius: radius.xl, marginBottom: 16, overflow: 'hidden',
  },
  planCardOverlay: {
    flex: 1, backgroundColor: 'rgba(6,6,6,0.55)', borderRadius: radius.xl,
    padding: 20, justifyContent: 'flex-end',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  planBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  planBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 2 },
  planName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', marginBottom: 4 },
  planGym: { fontFamily: fonts.sans, fontSize: 13, color: colors.t },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)', borderRadius: radius.xl, padding: 18, marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2 },
  rowVal: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.t },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.09)', marginVertical: 10 },
  totalLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff' },
  totalVal: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.accent },
  couponRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14,
  },
  couponInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)', borderRadius: radius.md, paddingHorizontal: 14,
    height: 48,
  },
  couponInput: {
    flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: '#fff',
  },
  applyBtn: {
    height: 48, paddingHorizontal: 20, borderRadius: radius.md,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtnDone: { backgroundColor: 'rgba(255,255,255,0.05)' },
  applyBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent },
  securedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 16,
  },
  securedText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  gymSelectRow: { flexDirection: 'row' }, // kept for TS but unused
  gymSelectRowActive: {},
  gymSelectLeft: { flexDirection: 'row' },
  gymSelectName: { fontFamily: fonts.sans, fontSize: 14, color: colors.t },
  gymSelectCity: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },
  checkBox: { width: 22, height: 22 },
  checkBoxActive: {},
  footer: {
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 14,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(6,6,6,0.95)',
  },
  payBtn: {
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
});
