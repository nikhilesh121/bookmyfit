import { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Image, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../../theme/brand';
import {
  IconArrowLeft, IconStar, IconPin, IconClock, IconCheck,
} from '../../components/Icons';

import { api, getUser, API_BASE } from '../../lib/api';

const SPA_IMAGES: Record<string, string> = {
  serenity: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80',
  royal: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80',
  bliss: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=900&q=80',
  zen: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80',
};
const SVC_IMAGES = [
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
  'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80',
  'https://images.unsplash.com/photo-1610337673044-720471f83677?w=400&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&q=80',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
  'https://images.unsplash.com/photo-1571019614099-9fdcf8b4e43b?w=400&q=80',
];

type Partner = {
  id: string; name: string; serviceType: string; city: string; area: string;
  address?: string; rating: number; reviewCount: number; distanceLabel?: string;
  photos?: string[]; discountPercent?: number;
};
type Service = {
  id: string; name: string; description?: string; price: number;
  originalPrice?: number; durationMinutes: number; imageUrl?: string; category?: string;
};

function getPartnerHero(p: Partner): string {
  if (p.photos && p.photos.length > 0) return p.photos[0];
  const key = Object.keys(SPA_IMAGES).find(k => (p.name || '').toLowerCase().includes(k));
  return key ? SPA_IMAGES[key] : SPA_IMAGES.serenity;
}

export default function WellnessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // booking modal state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API_BASE}/api/v1/wellness/partners?limit=50`)
        .then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/v1/wellness/partners/${id}/services`)
        .then(r => r.json()).catch(() => []),
    ]).then(([pRes, svcs]) => {
      const all: Partner[] = pRes?.data || (Array.isArray(pRes) ? pRes : []);
      const found = all.find((p: Partner) => p.id === id);
      if (found) setPartner(found);
      if (Array.isArray(svcs)) setServices(svcs);
    }).finally(() => setLoading(false));
  }, [id]);

  const openBooking = (svc: Service) => {
    setSelectedService(svc);
    setBookingDate('');
    setBookingTime('');
    setBooked(false);
  };

  const confirmBooking = async () => {
    if (!selectedService) return;
    if (!bookingDate || !bookingTime) {
      Alert.alert('Required', 'Please enter date and time');
      return;
    }
    // Combine date + time into ISO
    const [d, t] = [bookingDate.trim(), bookingTime.trim()];
    const iso = `${d}T${t.length === 5 ? t + ':00' : t}`;
    if (isNaN(new Date(iso).getTime())) {
      Alert.alert('Invalid', 'Use format YYYY-MM-DD for date and HH:MM for time');
      return;
    }
    setBooking(true);
    try {
      const user = await getUser();
      await api.post(`/wellness/services/${selectedService.id}/book`, {
        bookingDate: iso,
        phone: user?.phone || '',
      });
      setBooked(true);
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  const heroUri = partner ? getPartnerHero(partner) : SPA_IMAGES.serenity;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <IconArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {partner?.name || 'Services'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <Image source={{ uri: heroUri }} style={s.heroImg} />

        {/* Partner info card */}
        {partner && (
          <View style={s.infoCard}>
            <Text style={s.partnerName}>{partner.name}</Text>
            <View style={s.metaRow}>
              {partner.rating > 0 && (
                <View style={s.metaChip}>
                  <IconStar size={12} color="#FFD700" />
                  <Text style={s.metaText}>{partner.rating.toFixed(1)}  ({partner.reviewCount})</Text>
                </View>
              )}
              {partner.area && (
                <View style={s.metaChip}>
                  <IconPin size={12} color={colors.accent} />
                  <Text style={s.metaText}>{partner.area}, {partner.city}</Text>
                </View>
              )}
              {partner.distanceLabel && (
                <View style={s.metaChip}>
                  <Text style={s.metaText}>{partner.distanceLabel}</Text>
                </View>
              )}
            </View>
            {partner.address && (
              <Text style={s.address}>{partner.address}</Text>
            )}
          </View>
        )}

        {/* Services */}
        <Text style={s.sectionTitle}>Our Services</Text>

        {services.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No services listed yet</Text>
          </View>
        ) : (
          services.map((svc, i) => {
            const img = svc.imageUrl || SVC_IMAGES[i % SVC_IMAGES.length];
            const hasDiscount = svc.originalPrice && svc.originalPrice > svc.price;
            const pct = hasDiscount
              ? Math.round(100 - (svc.price / svc.originalPrice!) * 100)
              : 0;
            return (
              <View key={svc.id} style={s.svcCard}>
                <Image source={{ uri: img }} style={s.svcImg} />
                <View style={s.svcBody}>
                  {svc.category && (
                    <Text style={s.svcKicker}>{svc.category.toUpperCase()}</Text>
                  )}
                  <Text style={s.svcName}>{svc.name}</Text>
                  {svc.description && (
                    <Text style={s.svcDesc} numberOfLines={2}>{svc.description}</Text>
                  )}
                  <View style={s.svcDur}>
                    <IconClock size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={s.svcDurText}>{svc.durationMinutes} min</Text>
                  </View>
                  <View style={s.svcPriceRow}>
                    <Text style={s.svcPrice}>₹{Number(svc.price).toLocaleString()}</Text>
                    {hasDiscount && (
                      <>
                        <Text style={s.svcOriginal}>
                          ₹{Number(svc.originalPrice).toLocaleString()}
                        </Text>
                        <View style={s.discBadge}>
                          <Text style={s.discText}>{pct}% OFF</Text>
                        </View>
                      </>
                    )}
                  </View>
                  <TouchableOpacity style={s.bookBtn} onPress={() => openBooking(svc)}>
                    <Text style={s.bookBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={!!selectedService}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedService(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {booked ? (
              /* Success state */
              <View style={s.successBox}>
                <View style={s.successIcon}>
                  <IconCheck size={28} color="#060606" />
                </View>
                <Text style={s.successTitle}>Booking Confirmed!</Text>
                <Text style={s.successSub}>
                  {selectedService?.name} at {partner?.name}
                </Text>
                <Text style={s.successSub}>
                  {bookingDate}  {bookingTime}
                </Text>
                <TouchableOpacity
                  style={s.doneBtn}
                  onPress={() => setSelectedService(null)}
                >
                  <Text style={s.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Book Service</Text>
                <Text style={s.sheetSvc}>{selectedService?.name}</Text>
                <Text style={s.sheetPrice}>
                  ₹{selectedService ? Number(selectedService.price).toLocaleString() : 0}
                  {'  '}·{'  '}{selectedService?.durationMinutes} min
                </Text>

                <Text style={s.inputLabel}>Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={bookingDate}
                  onChangeText={setBookingDate}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={s.inputHint}>Format: 2026-04-28</Text>

                <Text style={s.inputLabel}>Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="HH:MM  (e.g. 14:00)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={bookingTime}
                  onChangeText={setBookingTime}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={s.inputHint}>Format: 14:00</Text>

                <TouchableOpacity
                  style={[s.confirmBtn, booking && { opacity: 0.6 }]}
                  onPress={confirmBooking}
                  disabled={booking}
                >
                  {booking
                    ? <ActivityIndicator color="#060606" />
                    : <Text style={s.confirmBtnText}>Confirm Booking</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setSelectedService(null)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.sansBold, fontSize: 17, color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 8,
  },

  heroImg: { width: '100%', height: 220, resizeMode: 'cover' },

  infoCard: {
    margin: 16, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  partnerName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff', marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  metaText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t },
  address: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 4 },

  sectionTitle: {
    fontFamily: fonts.sansBold, fontSize: 18, color: '#fff',
    marginHorizontal: 16, marginTop: 8, marginBottom: 12,
  },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  // Service card
  svcCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  svcImg: { width: '100%', height: 160, resizeMode: 'cover' },
  svcBody: { padding: 14 },
  svcKicker: {
    fontFamily: fonts.sans, fontSize: 10, color: colors.accent,
    letterSpacing: 1.5, marginBottom: 4,
  },
  svcName: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginBottom: 4 },
  svcDesc: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginBottom: 6 },
  svcDur: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  svcDurText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  svcPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  svcPrice: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.accent },
  svcOriginal: { fontFamily: fonts.sans, fontSize: 13, color: colors.t3, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: 'rgba(0,212,106,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },
  bookBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  bookBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#060606' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontFamily: fonts.sansBold, fontSize: 20, color: '#fff', marginBottom: 4 },
  sheetSvc: { fontFamily: fonts.sans, fontSize: 15, color: colors.t, marginBottom: 2 },
  sheetPrice: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accent, marginBottom: 20 },
  inputLabel: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontFamily: fonts.sans, fontSize: 15, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginTop: -10, marginBottom: 8 },
  confirmBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  confirmBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2 },

  // Success
  successBox: { alignItems: 'center', paddingVertical: 20 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontFamily: fonts.sansBold, fontSize: 22, color: '#fff', marginBottom: 8 },
  successSub: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2, marginBottom: 4 },
  doneBtn: {
    marginTop: 20, backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 40, alignItems: 'center',
  },
  doneBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
});
