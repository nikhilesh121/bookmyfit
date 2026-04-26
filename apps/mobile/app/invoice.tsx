import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconDownload, IconFileText, IconDollar } from '../components/Icons';
import { subscriptionsApi } from '../lib/api';

const FALLBACK_INVOICE = {
  invoiceNumber: 'BMF-2025-00142',
  invoiceDate: '2025-05-14',
  customer: { name: '—', phone: '', email: '' },
  gym: { name: 'PowerZone Fitness', city: 'Mumbai' },
  items: [
    { description: 'Elite Plan – 3 Months', quantity: 1, unitPrice: 3999, amount: 3999 },
  ],
  subtotal: 3999,
  cgst: 360,
  sgst: 360,
  total: 4719,
  paymentMethod: 'UPI / Cashfree',
  status: 'paid',
};

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

export default function InvoiceScreen() {
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscriptionId) {
      setInvoice(FALLBACK_INVOICE);
      setLoading(false);
      return;
    }
    subscriptionsApi.invoice(subscriptionId)
      .then((data: any) => setInvoice(data?.invoice || data || FALLBACK_INVOICE))
      .catch(() => setInvoice(FALLBACK_INVOICE))
      .finally(() => setLoading(false));
  }, [subscriptionId]);

  const handleShare = async () => {
    if (!invoice) return;
    try {
      await Share.share({
        message: `BookMyFit Invoice #${invoice.invoiceNumber}\nDate: ${formatDate(invoice.invoiceDate)}\nTotal: ${formatCurrency(invoice.total)}\n\nThank you for choosing BookMyFit!`,
        title: `Invoice ${invoice.invoiceNumber}`,
      });
    } catch (e: any) {
      Alert.alert('Share', e?.message || 'Unable to share invoice.');
    }
  };

  if (loading) {
    return (
      <AuroraBackground><SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView></AuroraBackground>
    );
  }

  const inv = invoice || FALLBACK_INVOICE;
  const items = inv.items || [];
  const subtotal = inv.subtotal ?? items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const cgst = inv.cgst ?? Math.round(subtotal * 0.09);
  const sgst = inv.sgst ?? Math.round(subtotal * 0.09);
  const total = inv.total ?? subtotal + cgst + sgst;

  return (
    <AuroraBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <IconArrowLeft size={18} color={colors.t} />
          </TouchableOpacity>
          <Text style={s.pageTitle}>Invoice</Text>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
            <IconDownload size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Invoice card */}
        <View style={s.invoiceCard}>
          {/* Company header */}
          <View style={s.companyHeader}>
            <View style={s.logoBox}>
              <IconFileText size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.companyName}>BookMyFit Technologies Pvt Ltd</Text>
              <Text style={s.companyAddress}>Mumbai, Maharashtra – 400001</Text>
              <Text style={s.companyAddress}>support@bookmyfit.in</Text>
            </View>
            <View style={[s.statusBadge, inv.status === 'paid' && s.statusPaid]}>
              <Text style={[s.statusText, inv.status === 'paid' && s.statusTextPaid]}>
                {(inv.status || 'PAID').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Invoice meta */}
          <View style={s.metaRow}>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Invoice No.</Text>
              <Text style={s.metaValue}>{inv.invoiceNumber || '—'}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{formatDate(inv.invoiceDate || '')}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Payment</Text>
              <Text style={s.metaValue}>{inv.paymentMethod || 'Online'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Customer details */}
          <Text style={s.sectionLabel}>Bill To</Text>
          <Text style={s.customerName}>{inv.customer?.name || '—'}</Text>
          {!!inv.customer?.phone && <Text style={s.customerDetail}>{inv.customer.phone}</Text>}
          {!!inv.customer?.email && <Text style={s.customerDetail}>{inv.customer.email}</Text>}
          {!!inv.gym?.name && (
            <Text style={s.customerDetail}>Gym: {inv.gym.name}{inv.gym?.city ? `, ${inv.gym.city}` : ''}</Text>
          )}

          <View style={s.divider} />

          {/* Line items */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { flex: 3 }]}>Description</Text>
            <Text style={[s.tableHeaderText, { width: 36, textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.tableHeaderText, { width: 80, textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]} numberOfLines={2}>{item.description || item.name || '—'}</Text>
              <Text style={[s.tableCell, { width: 36, textAlign: 'center' }]}>{item.quantity || 1}</Text>
              <Text style={[s.tableCell, { width: 80, textAlign: 'right' }]}>{formatCurrency(item.amount || 0)}</Text>
            </View>
          ))}

          <View style={s.divider} />

          {/* Totals */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>CGST (9%)</Text>
            <Text style={s.totalValue}>{formatCurrency(cgst)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>SGST (9%)</Text>
            <Text style={s.totalValue}>{formatCurrency(sgst)}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.totalRow}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <View style={s.grandTotalValueWrap}>
              <IconDollar size={13} color={colors.accent} />
              <Text style={s.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <View style={s.divider} />
        </View>

        {/* Share button */}
        <TouchableOpacity style={s.shareFullBtn} onPress={handleShare}>
          <IconDownload size={16} color="#000" />
          <Text style={s.shareFullBtnText}>Share Invoice</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 24, color: '#fff', letterSpacing: -0.5 },
  shareBtn: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  invoiceCard: {
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
    borderRadius: radius.xl, padding: 20, marginBottom: 16,
  },
  companyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  logoBox: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  companyName: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff', marginBottom: 3 },
  companyAddress: { fontFamily: fonts.sans, fontSize: 10, color: colors.t2, lineHeight: 15 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  statusPaid: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  statusText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.t2, letterSpacing: 0.5 },
  statusTextPaid: { color: colors.accent },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaCol: { flex: 1 },
  metaLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  metaValue: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff' },
  sectionLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.t2, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  customerName: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 4 },
  customerDetail: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 2 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8 },
  tableHeaderText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.t2, letterSpacing: 0.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 7 },
  tableCell: { fontFamily: fonts.sans, fontSize: 12, color: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  totalLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  totalValue: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff' },
  grandTotalLabel: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
  grandTotalValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  grandTotalValue: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.accent },
  noteBox: {
    backgroundColor: 'rgba(255,205,55,0.06)', borderWidth: 1, borderColor: 'rgba(255,205,55,0.15)',
    borderRadius: radius.md, padding: 12,
  },
  noteText: { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(255,205,55,0.7)', lineHeight: 16 },
  shareFullBtn: {
    height: 52, borderRadius: radius.lg,
    backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareFullBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: '#000' },
});
