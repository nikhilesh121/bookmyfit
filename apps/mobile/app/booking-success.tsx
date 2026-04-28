import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius, spacing } from '../theme/brand';

export default function BookingSuccessScreen() {
  const { bookingId, orderId, serviceName, amount } = useLocalSearchParams<{
    bookingId: string; orderId: string; serviceName: string; amount: string;
  }>();

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        {/* Animated checkmark circle */}
        <Animated.View style={[s.checkCircle, { transform: [{ scale }] }]}>
          <Text style={s.checkMark}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity }}>
          <Text style={s.title}>Booking Confirmed!</Text>
          <Text style={s.subtitle}>Your wellness session has been booked successfully.</Text>

          <View style={s.detailCard}>
            {serviceName ? (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Service</Text>
                <Text style={s.detailValue}>{serviceName}</Text>
              </View>
            ) : null}
            {amount ? (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Amount Paid</Text>
                <Text style={s.detailValueAccent}>₹{Number(amount).toLocaleString()}</Text>
              </View>
            ) : null}
            {orderId ? (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Order ID</Text>
                <Text style={s.detailValueSmall}>{orderId}</Text>
              </View>
            ) : null}
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Status</Text>
              <View style={s.confirmedBadge}>
                <Text style={s.confirmedText}>Confirmed</Text>
              </View>
            </View>
          </View>

          <Text style={s.note}>
            A confirmation has been sent to your registered contact. You can view this booking in My Bookings.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[s.bottomBtns, { opacity }]}>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.replace('/(tabs)/bookings' as any)}
        >
          <Text style={s.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.ghostBtn}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text style={s.ghostBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.accentSoft, borderWidth: 3, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  checkMark: { fontSize: 42, color: colors.accent },

  title: { fontFamily: fonts.sansBold, fontSize: 26, color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.t2, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  detailCard: {
    backgroundColor: colors.glass, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.borderGlass,
    padding: 20, gap: 12, marginBottom: 20, width: '100%',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  detailValue: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', maxWidth: '55%', textAlign: 'right' },
  detailValueAccent: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.accent },
  detailValueSmall: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, maxWidth: '60%', textAlign: 'right' },
  confirmedBadge: {
    backgroundColor: colors.accentSoft, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  confirmedText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },

  note: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, textAlign: 'center', lineHeight: 18 },

  bottomBtns: {
    paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: 8, gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.xl,
    paddingVertical: 15, alignItems: 'center',
  },
  primaryBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#060606' },
  ghostBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    paddingVertical: 14, alignItems: 'center',
  },
  ghostBtnText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2 },
});
