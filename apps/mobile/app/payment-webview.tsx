import { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft } from '../components/Icons';
import { subscriptionsApi } from '../lib/api';

const CASHFREE_BASE_URL: string =
  (Constants.expoConfig?.extra as any)?.cashfreeBaseUrl ?? 'https://sandbox.cashfree.com';

export default function PaymentWebview() {
  const { orderId, sessionId, planId, gymId, subId } = useLocalSearchParams<{
    orderId: string; sessionId: string; planId: string; gymId: string; subId?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef<any>(null);

  const checkoutUrl = `${CASHFREE_BASE_URL}/pg/orders/pay?order_id=${orderId}`;

  const handleSuccess = async () => {
    // Verify + activate subscription if subId available
    if (subId) {
      try { await subscriptionsApi.verify(subId); } catch {}
    }
    router.replace({ pathname: '/success', params: { orderId, planId, gymId, subscriptionId: subId || '' } });
  };

  const handleNavigationChange = (navState: any) => {
    const url = navState.url || '';
    if (url.includes('success') || url.includes('bookmyfit://payment-success') || url.includes('payment_status=SUCCESS')) {
      handleSuccess();
    } else if (url.includes('failure') || url.includes('payment_status=FAILED') || url.includes('payment_status=USER_DROPPED')) {
      Alert.alert('Payment Failed', 'Your payment was not completed. Please try again.', [
        { text: 'Try Again', onPress: () => webviewRef.current?.reload() },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    }
  };

  const injectedJs = `
    window.cashfreePaymentSuccess = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'SUCCESS', data}));
    };
    window.cashfreePaymentFailure = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'FAILURE', data}));
    };
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS') {
        handleSuccess();
      } else if (msg.type === 'FAILURE') {
        Alert.alert('Payment Failed', 'Please try again.', [
          { text: 'Try Again', onPress: () => webviewRef.current?.reload() },
          { text: 'Cancel', onPress: () => router.back() },
        ]);
      }
    } catch {}
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => {
          Alert.alert('Cancel Payment?', 'Are you sure you want to cancel?', [
            { text: 'Continue', style: 'cancel' },
            { text: 'Cancel', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Secure Payment</Text>
        <View style={s.securityBadge}>
          <Text style={s.securityText}>SSL Secured</Text>
        </View>
      </View>

      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={s.loadingText}>Loading secure payment…</Text>
        </View>
      )}

      <WebView
        ref={webviewRef}
        source={{ uri: checkoutUrl }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleMessage}
        injectedJavaScript={injectedJs}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="compatibility"
        style={{ flex: 1, backgroundColor: colors.bg }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', marginLeft: 12 },
  securityBadge: {
    backgroundColor: 'rgba(204,255,0,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: colors.accentBorder,
  },
  securityText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent, letterSpacing: 0.5 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, zIndex: 10,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2 },
});
