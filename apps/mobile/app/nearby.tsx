import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconPin, IconRefresh, IconSearch, IconStar } from '../components/Icons';
import { gymsApi } from '../lib/api';
import { DEFAULT_GYM_IMAGE, firstImage } from '../lib/imageFallbacks';
import {
  distanceLabel,
  getLocationPermissionState,
  getNearbyCoords,
  nearbyBestSort,
  nearbyQueryParams,
  openLocationSettings,
  requestNearbyCoords,
  UserCoords,
} from '../lib/location';

interface NearbyGym {
  id: string;
  _id?: string;
  name: string;
  address?: string;
  city?: string;
  area?: string;
  location?: { area?: string; city?: string };
  rating?: number;
  avgRating?: number;
  reviewCount?: number;
  distance?: string;
  distanceKm?: number;
  images?: string[];
  photos?: string[];
  coverImage?: string;
  coverPhoto?: string;
  amenities?: string[];
  categories?: string[];
}

function gymId(gym: NearbyGym) {
  return String(gym.id || gym._id || '');
}

function gymImage(gym: NearbyGym) {
  return firstImage(gym.coverPhoto, gym.coverImage, gym.photos, gym.images) || DEFAULT_GYM_IMAGE;
}

function gymRating(gym: NearbyGym) {
  const value = Number(gym.avgRating || gym.rating || 0);
  return Number.isFinite(value) && value > 0 ? Math.min(5, value) : null;
}

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const [gyms, setGyms] = useState<NearbyGym[]>([]);
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [notice, setNotice] = useState('');
  const [needsSettings, setNeedsSettings] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const nextCoords = await getNearbyCoords();
      const permission = await getLocationPermissionState();
      setNeedsSettings(permission.needsSettings);
      setCoords(nextCoords);
      const params: any = { page: 1, limit: 100, ...nearbyQueryParams(nextCoords) };
      const data: any = await gymsApi.list(params);
      const list: NearbyGym[] = Array.isArray(data) ? data : data?.data || data?.gyms || data?.items || [];
      setGyms(list);
      setNotice(nextCoords ? '' : permission.needsSettings
        ? 'Location permission is blocked. Open settings to show gyms closest to you first.'
        : 'Allow location to show gyms closest to you first. Until then, you can still browse partner gyms.');
    } catch (e: any) {
      setGyms([]);
      setNotice(e?.message || 'Could not load gyms near you.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLocationPress = useCallback(async () => {
    if (needsSettings) {
      await openLocationSettings();
      setNotice('After enabling location in settings, return here and tap refresh.');
      return;
    }
    setRefreshing(true);
    setNotice('Asking for location access...');
    try {
      const nextCoords = await requestNearbyCoords();
      const permission = await getLocationPermissionState();
      setNeedsSettings(permission.needsSettings);
      if (!nextCoords) {
        setNotice(permission.needsSettings
          ? 'Location permission is blocked. We opened settings so you can enable it for BookMyFit.'
          : 'Location was not enabled. Tap Allow Location and choose Allow when your phone asks.');
      } else {
        setCoords(nextCoords);
        setNotice('');
      }
      const params: any = { page: 1, limit: 100, ...nearbyQueryParams(nextCoords) };
      const data: any = await gymsApi.list(params);
      const list: NearbyGym[] = Array.isArray(data) ? data : data?.data || data?.gyms || data?.items || [];
      setGyms(list);
    } catch (e: any) {
      setNotice(e?.message || 'Could not enable location. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsSettings]);

  useFocusEffect(useCallback(() => {
    load('initial');
  }, [load]));

  const filteredGyms = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = [...gyms].sort(nearbyBestSort);
    if (!q) return list;
    return list.filter((gym) => {
      const haystack = [
        gym.name,
        gym.city,
        gym.area,
        gym.location?.area,
        gym.location?.city,
        ...(gym.amenities || []),
        ...(gym.categories || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [gyms, searchText]);

  const headerSubtitle = coords
    ? `${filteredGyms.length} best nearby gyms`
    : `${filteredGyms.length} partner gyms`;

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.82}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Gyms Near You</Text>
          <Text style={s.headerSub}>{headerSubtitle}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => load('refresh')} activeOpacity={0.82}>
          {refreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <IconRefresh size={16} color={colors.accent} />}
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <IconSearch size={15} color={colors.t3} />
        <TextInput
          style={s.searchInput}
          placeholder="Search nearby gym, area, amenity..."
          placeholderTextColor={colors.t3}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={s.loadingText}>Finding nearby gyms...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGyms}
          keyExtractor={(item) => gymId(item)}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.accent} />}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 28 }]}
          ListHeaderComponent={(
            <TouchableOpacity
              style={[s.statusCard, coords && s.statusCardActive]}
              onPress={handleLocationPress}
              activeOpacity={0.84}
            >
              <View style={s.statusIcon}>
                <IconPin size={17} color={coords ? colors.accent : colors.t2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>{coords ? 'Closest gyms are shown first' : 'Use location for nearby gyms'}</Text>
                <Text style={s.statusText}>
                  {notice || 'Nearby results use distance first, then rating, reviews, and popularity.'}
                </Text>
              </View>
              {!coords && (
                <View style={s.statusAction}>
                  <Text style={s.statusActionText}>{needsSettings ? 'Settings' : 'Allow Location'}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={(
            <View style={s.empty}>
              <IconPin size={34} color={colors.t3} />
              <Text style={s.emptyTitle}>No gyms found</Text>
              <Text style={s.emptyText}>{notice || 'Try another search or refresh your GPS location.'}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const id = gymId(item);
            const rating = gymRating(item);
            const distance = distanceLabel(item);
            const area = item.area || item.location?.area || '';
            const city = item.city || item.location?.city || '';
            const tags = [...(item.amenities || []), ...(item.categories || [])].filter(Boolean).slice(0, 3);
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id } } as any)}
              >
                <ImageBackground source={{ uri: gymImage(item) }} style={s.cardImage} imageStyle={s.cardImageRadius}>
                  <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.72)']} style={s.cardShade}>
                    {distance ? (
                      <View style={s.distancePill}>
                        <IconPin size={11} color={colors.accent} />
                        <Text style={s.distanceText}>{distance}</Text>
                      </View>
                    ) : null}
                    <Text style={s.cardTitle} numberOfLines={1}>{item.name || 'Gym'}</Text>
                    <Text style={s.cardLocation} numberOfLines={1}>{[area, city].filter(Boolean).join(', ') || item.address || 'Location not added'}</Text>
                  </LinearGradient>
                </ImageBackground>
                <View style={s.cardBody}>
                  <View style={s.metaRow}>
                    {rating !== null ? (
                      <>
                        <IconStar size={12} color="#FBBF24" />
                        <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
                        <Text style={s.metaText}>{Number(item.reviewCount || 0)} reviews</Text>
                      </>
                    ) : (
                      <Text style={s.metaText}>No reviews yet</Text>
                    )}
                  </View>
                  {tags.length > 0 ? (
                    <View style={s.tagRow}>
                      {tags.map((tag) => (
                        <View key={String(tag)} style={s.tag}><Text style={s.tagText} numberOfLines={1}>{String(tag)}</Text></View>
                      ))}
                    </View>
                  ) : null}
                  <View style={s.actionRow}>
                    <Text style={s.actionHint}>View plans, timings, gallery, and amenities</Text>
                    <View style={s.viewBtn}><Text style={s.viewBtnText}>View</Text></View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: fonts.serif, fontSize: 22, color: '#fff' },
  headerSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 13,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: '#fff' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  listContent: { paddingHorizontal: 16, paddingTop: 2, gap: 14 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statusCardActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', marginBottom: 3 },
  statusText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 17 },
  statusAction: {
    minWidth: 104,
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statusActionText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#050505' },
  card: {
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  cardImage: { height: 174 },
  cardImageRadius: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  cardShade: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  distancePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,106,0.28)',
  },
  distanceText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.accent },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 19, color: '#fff', marginBottom: 4 },
  cardLocation: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.76)' },
  cardBody: { padding: 14, gap: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#FBBF24' },
  metaText: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    maxWidth: 120,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.t2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actionHint: { flex: 1, fontFamily: fonts.sans, fontSize: 11, color: colors.t3 },
  viewBtn: {
    minWidth: 72,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
  },
  viewBtnText: { fontFamily: fonts.sansBold, fontSize: 12, color: '#050505' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginTop: 14, marginBottom: 6 },
  emptyText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, textAlign: 'center', lineHeight: 19 },
});
