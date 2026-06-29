import { Linking, Platform } from 'react-native';

/**
 * Opens the device's native navigation app (Google Maps / Apple Maps) with
 * directions to a gym. Prefers exact coordinates, falls back to a name/address
 * search query. Shared by gym detail and booking confirmation screens (Task 7).
 */
export async function openDirections(opts: {
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
  address?: string | null;
}) {
  const { lat, lng, name, address } = opts;
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && !(Number(lat) === 0 && Number(lng) === 0);
  const destinationText = hasCoords ? `${lat},${lng}` : `${name || ''} ${address || ''}`.trim();
  const destination = encodeURIComponent(destinationText || String(name || 'gym'));
  const label = encodeURIComponent(String(name || 'Gym'));

  const urls = Platform.OS === 'ios'
    ? [
        `http://maps.apple.com/?daddr=${destination}`,
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      ]
    : [
        `geo:0,0?q=${destination}(${label})`,
        `google.navigation:q=${destination}`,
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      ];

  try {
    for (const url of urls) {
      const canOpen = url.startsWith('http') || await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    }
    await Linking.openURL(`https://maps.google.com/?q=${destination}`);
  } catch {
    Linking.openURL(`https://maps.google.com/?q=${destination}`).catch(() => {});
  }
}
