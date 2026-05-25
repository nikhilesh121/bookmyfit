import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type UserCoords = { lat: number; lng: number };
export type LocationPermissionState = {
  status: Location.PermissionStatus | 'unknown';
  granted: boolean;
  canAskAgain: boolean;
  needsSettings: boolean;
};

let cachedCoords: UserCoords | null = null;
let pendingCoords: Promise<UserCoords | null> | null = null;

function toCoords(position: Location.LocationObject | null | undefined): UserCoords | null {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function waitForPosition(ms: number) {
  const current = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
  const timed = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([current, timed]);
}

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    const granted = permission.status === 'granted';
    return {
      status: permission.status,
      granted,
      canAskAgain: permission.canAskAgain !== false,
      needsSettings: !granted && permission.canAskAgain === false,
    };
  } catch {
    return { status: 'unknown', granted: false, canAskAgain: false, needsSettings: true };
  }
}

export async function openLocationSettings() {
  try {
    await Linking.openSettings();
  } catch {
    // The caller already presents the recovery action; ignore platform failures.
  }
}

async function promptForDeviceLocationServices() {
  const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (enabled) return true;
  if (Platform.OS === 'android') {
    await Location.enableNetworkProviderAsync().catch(() => null);
    return Location.hasServicesEnabledAsync().catch(() => false);
  }
  return false;
}

export async function requestNearbyCoords(): Promise<UserCoords | null> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status !== 'granted') {
      if (existing.canAskAgain === false) {
        await openLocationSettings();
        return null;
      }
      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status !== 'granted') return null;
    }

    const servicesEnabled = await promptForDeviceLocationServices();
    if (!servicesEnabled) {
      await openLocationSettings();
      return null;
    }

    return getNearbyCoords({ requestPermission: false, timeoutMs: 3500 });
  } catch {
    return null;
  }
}

export async function getNearbyCoords(options: { requestPermission?: boolean; timeoutMs?: number } = {}): Promise<UserCoords | null> {
  if (cachedCoords) return cachedCoords;
  if (pendingCoords) return pendingCoords;

  pendingCoords = (async () => {
    try {
      const requestPermission = options.requestPermission !== false;
      const existing = await Location.getForegroundPermissionsAsync();
      let granted = existing.status === 'granted';
      if (!granted && requestPermission && existing.canAskAgain !== false) {
        const requested = await Location.requestForegroundPermissionsAsync();
        granted = requested.status === 'granted';
      }
      if (!granted) return null;

      const lastKnown = toCoords(await Location.getLastKnownPositionAsync({
        maxAge: 10 * 60 * 1000,
        requiredAccuracy: 3000,
      }).catch(() => null));
      if (lastKnown) {
        cachedCoords = lastKnown;
        return lastKnown;
      }

      const current = toCoords(await waitForPosition(options.timeoutMs || 2500));
      if (current) cachedCoords = current;
      return current;
    } catch {
      return null;
    } finally {
      pendingCoords = null;
    }
  })();

  return pendingCoords;
}

export function nearbyQueryParams(coords: UserCoords | null, radiusKm = 50) {
  return coords
    ? { lat: coords.lat, lng: coords.lng, sort: 'nearby_best', radiusKm }
    : {};
}

export function numberFrom(...values: any[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

export function distanceKmValue(item: any) {
  const fromKm = numberFrom(item?.distanceKm, item?.distance_km);
  if (fromKm !== null) return fromKm;
  const text = String(item?.distance || item?.distanceLabel || '');
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

export function distanceLabel(item: any) {
  const distance = item?.distance || item?.distanceLabel;
  if (distance) return String(distance);
  const km = distanceKmValue(item);
  return Number.isFinite(km) ? `${km.toFixed(km < 10 ? 1 : 0)} km` : '';
}

export function ratingValue(item: any) {
  const count = numberFrom(item?.ratingCount, item?.ratingsCount, item?.reviewCount, item?.reviewsCount, item?.review_count) || 0;
  const rating = numberFrom(item?.avgRating, item?.averageRating, item?.rating, item?.avg_rating);
  if (!rating || rating <= 0) return 0;
  return count > 0 ? Math.min(5, Math.max(0, rating)) : Math.min(5, Math.max(0, rating));
}

export function popularityValue(item: any) {
  const count = numberFrom(
    item?.popularityScore,
    item?.totalCheckins,
    item?.checkinsCount,
    item?.visitCount,
    item?.visits,
    item?.subscriberCount,
    item?.membersCount,
    item?.serviceCount,
    item?.ratingCount,
    item?.reviewCount,
  );
  return Math.max(0, count || 0);
}

function distanceBucket(km: number | null) {
  if (km === null) return 6;
  if (km <= 2) return 0;
  if (km <= 5) return 1;
  if (km <= 10) return 2;
  if (km <= 25) return 3;
  if (km <= 50) return 4;
  return 5;
}

export function nearbyBestSort(a: any, b: any) {
  const aDistance = distanceKmValue(a);
  const bDistance = distanceKmValue(b);
  const bucketDelta = distanceBucket(aDistance) - distanceBucket(bDistance);
  if (bucketDelta !== 0) return bucketDelta;

  const qualityA = ratingValue(a) * 20 + Math.log10(popularityValue(a) + 1) * 8;
  const qualityB = ratingValue(b) * 20 + Math.log10(popularityValue(b) + 1) * 8;
  if (qualityA !== qualityB) return qualityB - qualityA;

  if (aDistance !== null && bDistance !== null && aDistance !== bDistance) return aDistance - bDistance;
  return String(a?.name || '').localeCompare(String(b?.name || ''));
}
