import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconCheck, IconLock, IconTag, IconMapPin } from '../components/Icons';
import { subscriptionsApi, couponsApi, gymsApi } from '../lib/api';

const GST_RATE = 0.18;

export default function Order() {
  const { planId, planName, gymId, durationMonths, totalAmount, ptAddon, maxGyms } =
    useLocalSearchParams<{
      planId: string; planName: string; gymId?: string;
      durationMonths: string; totalAmount: string; ptAddon?: string; maxGyms?: string;
    }>();

  const hasPt = ptAddon === 'true';
  const months = Number(durationMonths) || 1;
  const total = Number(totalAmount) || 0;
  const gst = Math.round(total / (1 + GST_RATE) * GST_RATE);
  const planBase = total - gst - (hasPt ? 1600 : 0);
  const gymLimit = Number(maxGyms) || 1;
  const isMultiGym = gymLimit > 1;

  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Multi-gym selection state
  const [gymsList, setGymsList] = useState<any[]>([]);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>(
    gymId ? [gymId] : [],
  );

  useEffect(() => {
    if (!isMultiGym) return;
    setGymsLoading(true);
    gymsApi.list({ page: 1 })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.gyms || data?.data || [];
        setGymsList(list);
      })
      .catch(() => setGymsList([]))
      .finally(() => setGymsLoading(false));
  }, [isMultiGym]);

  const toggleGym = (id: string) => {
    setSelectedGymIds((prev) => {
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
    if (isMultiGym && selectedGymIds.length === 0) {
      Alert.alert('Select Gyms', 'Please select at least one gym to continue.');
      return;
    }
    setLoading(true);
    try {
      const order: any = await subscriptionsApi.createOrder({
        planId: planId || '',
        gymId: isMultiGym ? undefined : (gymId || undefined),
        durationMonths: months,
        ptAddon: hasPt,
        couponCode: couponApplied ? coupon : undefined,
      });

      if (order?.paymentSessionId && order?.orderId) {
        router.push({
          pathname: '/payment-webview',
          params: {
            orderId: order.orderId,
            sessionId: order.paymentSessionId,
            planId: planId || '',
            gymId: gymId || '',
          },
        });
      } else {
        // Fallback for free plans or already-paid orders
        router.replace({
          pathname: '/success',
          params: {
            orderId: order?.orderId || 'N/A',
            planName: planName || 'Standard Plan',
            gymName: isMultiGym
              ? `${selectedGymIds.length} gym${selectedGymIds.length > 1 ? 's' : ''} selected`
              : (gymId ? 'Selected Gym' : 'Multi-gym Access'),
            validUntil: new Date(Date.now() + months * 30 * 24 * 3600 * 1000)
              .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            amountPaid: String(finalTotal),
            subscriptionId: order?.subscriptionId || order?.id || 'NEW',
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
              <Text style={s.planBadgeText}>{durationMonths} MONTH{Number(durationMonths) > 1 ? 'S' : ''}</Text>
            </View>
            <Text style={s.planName}>{planName || 'Standard Plan'}</Text>
            <Text style={s.planGym}>
              {isMultiGym ? `Up to ${gymLimit >= 99 ? 'unlimited' : gymLimit} gyms` : (gymId ? 'Selected Gym' : 'Multi-gym Access · 500+ Locations')}
            </Text>
          </View>
        </ImageBackground>

        {/* Multi-gym selection */}
        {isMultiGym && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>
              Select Gyms ({selectedGymIds.length}/{gymLimit >= 99 ? 'unlimited' : gymLimit})
            </Text>
            {gymsLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
            ) : gymsList.length === 0 ? (
              <Text style={s.rowLabel}>No gyms available</Text>
            ) : (
              gymsList.map((g: any) => {
                const id = g._id || g.id;
                const name = g.name || g.gymName || 'Gym';
                const city = g.city || g.location?.city || '';
                const isChecked = selectedGymIds.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.gymSelectRow, isChecked && s.gymSelectRowActive]}
                    activeOpacity={0.75}
                    onPress={() => toggleGym(id)}
                  >
                    <View style={s.gymSelectLeft}>
                      <IconMapPin size={14} color={isChecked ? colors.accent : colors.t2} />
                      <View>
                        <Text style={[s.gymSelectName, isChecked && { color: '#fff' }]}>{name}</Text>
                        {!!city && <Text style={s.gymSelectCity}>{city}</Text>}
                      </View>
                    </View>
                    <View style={[s.checkBox, isChecked && s.checkBoxActive]}>
                      {isChecked && <IconCheck size={10} color="#000" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
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
  gymSelectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  gymSelectRowActive: { backgroundColor: 'rgba(204,255,0,0.05)', borderRadius: radius.md },
  gymSelectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gymSelectName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.t },
  gymSelectCity: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: 1 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
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
