import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Circle } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { colors, fonts, radius, spacing } from '../theme/brand';
import { IconChevronLeft, IconStar, IconPin } from '../components/Icons';
import { API_BASE } from '../lib/api';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = W * 0.72;
const MAP_H = H * 0.55;

interface NearbyGym {
  id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  images?: string[];
  tier?: string;
  minPrice?: number;
}

// Dark map style — minimal, material-ish
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f0f12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c24' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#232330' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a3a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a28' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070710' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2d2d40' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// Fallback gyms with Bhubaneswar coords
const FALLBACK_GYMS: NearbyGym[] = [
  { id: '1', name: 'Iron Temple Gym',        address: 'Sahid Nagar',    latitude: 20.2961, longitude: 85.8245, rating: 4.8, tier: 'elite' },
  { id: '2', name: 'FitZone Premier',         address: 'Patia',         latitude: 20.3495, longitude: 85.8163, rating: 4.6, tier: 'pro' },
  { id: '3', name: 'PowerHouse Fitness',      address: 'Jaydev Vihar',  latitude: 20.3112, longitude: 85.8130, rating: 4.5, tier: 'pro' },
  { id: '4', name: 'Zen Yoga & Wellness',     address: 'Nayapalli',     latitude: 20.2868, longitude: 85.8004, rating: 4.7, tier: 'individual' },
  { id: '5', name: 'CrossFit Bhubaneswar',    address: 'Khandagiri',    latitude: 20.2524, longitude: 85.7793, rating: 4.4, tier: 'pro' },
  { id: '6', name: 'The Muscle Factory',      address: 'Chandrasekharpur', latitude: 20.3212, longitude: 85.8235, rating: 4.3, tier: 'individual' },
];

const TIER_COLORS: Record<string, string> = {
  elite: '#FBBF24', pro: colors.accent, individual: '#60A5FA',
};

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gyms, setGyms] = useState<NearbyGym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  // Get location + gyms
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 20.2961, lng = 85.8245; // Bhubaneswar default
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } catch {}
      }
      setLocation({ lat, lng });

      // Fetch nearby gyms
      try {
        const res = await fetch(`${API_BASE}/api/v1/gyms?lat=${lat}&lng=${lng}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          const items: NearbyGym[] = (data.items || data || []).filter((g: NearbyGym) => g.latitude && g.longitude);
          setGyms(items.length > 0 ? items : FALLBACK_GYMS);
        } else {
          setGyms(FALLBACK_GYMS);
        }
      } catch {
        setGyms(FALLBACK_GYMS);
      }
      setLoading(false);
    })();
  }, []);

  const selectGym = (gym: NearbyGym) => {
    setSelectedId(gym.id);
    // Pan map to gym
    if (gym.latitude && gym.longitude) {
      mapRef.current?.animateToRegion({
        latitude: gym.latitude - 0.006,
        longitude: gym.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 400);
    }
    // Scroll card into view
    const idx = gyms.findIndex((g) => g.id === gym.id);
    if (idx >= 0) flatRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };

  const region = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : { latitude: 20.2961, longitude: 85.8245, latitudeDelta: 0.06, longitudeDelta: 0.06 };

  return (
    <View style={s.root}>
      {/* ── Map ── */}
      {loading ? (
        <View style={[s.mapPlaceholder, { height: MAP_H }]}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={s.loadingText}>Finding gyms near you…</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={{ width: W, height: MAP_H }}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          customMapStyle={DARK_MAP_STYLE}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
        >
          {/* User radius ring */}
          {location && (
            <Circle
              center={{ latitude: location.lat, longitude: location.lng }}
              radius={3500}
              strokeColor={colors.accent + '33'}
              fillColor={colors.accent + '0A'}
              strokeWidth={1}
            />
          )}

          {/* Gym pins */}
          {gyms.map((gym) => (
            <Marker
              key={gym.id}
              coordinate={{ latitude: gym.latitude!, longitude: gym.longitude! }}
              onPress={() => selectGym(gym)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={[s.pin, selectedId === gym.id && s.pinActive]}>
                <Text style={[s.pinText, selectedId === gym.id && s.pinTextActive]}>
                  {gym.name.split(' ')[0]}
                </Text>
                <View style={[s.pinDot, { backgroundColor: TIER_COLORS[gym.tier || 'individual'] ?? colors.accent }]} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* ── Back button overlay ── */}
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity
          style={[s.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <IconChevronLeft size={18} color="#fff" />
        </TouchableOpacity>
        <View style={[s.headerLabel, { top: insets.top + 10 }]}>
          <Text style={s.headerTitle}>Gyms Near You</Text>
          <Text style={s.headerSub}>{gyms.length} found · Bhubaneswar</Text>
        </View>
      </SafeAreaView>

      {/* ── Bottom sheet ── */}
      <View style={s.sheet}>
        {/* Pill */}
        <View style={s.sheetPill} />

        <FlatList
          ref={flatRef}
          data={gyms}
          keyExtractor={(g) => g.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 18, gap: 12, paddingBottom: 8 }}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => {
            const selected = selectedId === item.id;
            return (
              <TouchableOpacity
                style={[s.card, selected && s.cardSelected]}
                onPress={() => selectGym(item)}
                activeOpacity={0.88}
              >
                {/* Accent bar */}
                <View style={[s.cardBar, { backgroundColor: TIER_COLORS[item.tier || 'individual'] ?? colors.accent }]} />

                <View style={s.cardBody}>
                  <View style={s.cardRow}>
                    <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                    {item.tier === 'elite' && (
                      <View style={s.eliteBadge}><Text style={s.eliteBadgeText}>Elite</Text></View>
                    )}
                  </View>

                  <View style={s.locRow}>
                    <IconPin size={10} color={colors.t2} />
                    <Text style={s.locText} numberOfLines={1}>{item.address || item.city || 'Bhubaneswar'}</Text>
                  </View>

                  <View style={s.cardMeta}>
                    {item.rating && (
                      <View style={s.ratingRow}>
                        <IconStar size={11} color="#FBBF24" />
                        <Text style={s.ratingText}>{item.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    {item.minPrice && (
                      <Text style={s.priceText}>₹{item.minPrice}/day</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[s.viewBtn, selected && s.viewBtnActive]}
                    onPress={() => router.push(`/gym/${item.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.viewBtnText, selected && s.viewBtnTextActive]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  mapPlaceholder: {
    width: W,
    backgroundColor: '#0a0a0e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },

  // Back button
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    position: 'absolute',
    left: W / 2 - 90,
    width: 180,
    alignItems: 'center',
  },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerSub:   { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.6)', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  // Custom marker
  pin: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,20,0.88)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pinActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  pinText:       { fontFamily: fonts.sansBold, fontSize: 10, color: '#fff' },
  pinTextActive: { color: '#000' },
  pinDot:        { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  // Bottom sheet
  sheet: {
    flex: 1,
    backgroundColor: colors.surface ?? '#0e0e14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  sheetPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Gym card
  card: {
    width: CARD_W,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardSelected: {
    borderColor: colors.accent + '55',
    backgroundColor: colors.accent + '08',
  },
  cardBar: { width: 3, borderRadius: 2 },
  cardBody: { flex: 1, padding: 14, gap: 6 },

  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:  { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', flex: 1 },
  eliteBadge:     { backgroundColor: '#FBBF2415', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FBBF2440' },
  eliteBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#FBBF24' },

  locRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText:  { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, flex: 1 },

  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.sansMedium, fontSize: 12, color: '#FBBF24' },
  priceText:  { fontFamily: fonts.sans, fontSize: 11, color: colors.t2 },

  viewBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  viewBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '18' },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
  viewBtnTextActive: { color: colors.accent },
});
