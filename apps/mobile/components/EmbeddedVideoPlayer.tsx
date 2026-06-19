import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import { colors, fonts } from '../theme/brand';

type Props = {
  url?: string | null;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  style?: StyleProp<ViewStyle>;
  videoStyle?: StyleProp<ViewStyle>;
  onStatus?: (status: AVPlaybackStatus) => void;
};

export function textParam(value: any) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export function youtubeVideoId(value: any) {
  const raw = textParam(value).trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (host.endsWith('youtube.com')) {
      const watchId = parsed.searchParams.get('v');
      if (watchId) return watchId;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
      if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
    }
  } catch {}
  const loose = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i);
  return loose?.[1] || '';
}

function youtubeHtml(videoId: string, autoPlay: boolean, title?: string) {
  const origin = encodeURIComponent('https://bookmyfit.in');
  const autoplay = autoPlay ? '1' : '0';
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
          .frame { position: fixed; inset: 0; background: #000; }
          iframe { width: 100%; height: 100%; border: 0; background: #000; display: block; }
        </style>
      </head>
      <body>
        <div class="frame">
          <iframe
            id="player"
            src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}"
            title="${String(title || 'BookMyFit video').replace(/"/g, '&quot;')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
      </body>
    </html>
  `;
}

export default function EmbeddedVideoPlayer({
  url,
  title,
  autoPlay = false,
  muted = false,
  controls = true,
  style,
  videoStyle,
  onStatus,
}: Props) {
  const videoRef = useRef<Video>(null);
  const [loading, setLoading] = useState(true);
  const [webError, setWebError] = useState(false);
  const videoUrl = textParam(url).trim();
  const ytId = youtubeVideoId(videoUrl);
  const isYouTube = !!ytId;
  const html = useMemo(() => (ytId ? youtubeHtml(ytId, autoPlay, title) : ''), [ytId, autoPlay, title]);

  if (!videoUrl) {
    return (
      <View style={[styles.root, style, styles.empty]}>
        <Text style={styles.emptyText}>No video available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {isYouTube ? (
        webError ? (
          <View style={[styles.video, videoStyle, styles.empty]}>
            <Text style={styles.emptyTitle}>Video cannot play inside the app</Text>
            <Text style={styles.emptyText}>Ask the gym to use an embeddable YouTube link or upload a direct video file.</Text>
          </View>
        ) : (
          <WebView
            source={{ html, baseUrl: 'https://bookmyfit.in' }}
            style={[styles.video, videoStyle]}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={!autoPlay}
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            scalesPageToFit={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setWebError(true);
            }}
            onHttpError={() => {
              setLoading(false);
              setWebError(true);
            }}
          />
        )
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={[styles.video, videoStyle]}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={controls}
          isMuted={muted}
          shouldPlay={autoPlay}
          onPlaybackStatusUpdate={(status) => {
            onStatus?.(status);
            if ((status as any).isLoaded || (status as any).error) setLoading(false);
          }}
        />
      )}
      {loading && !webError && (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000', overflow: 'hidden' },
  video: { width: '100%', height: '100%', backgroundColor: '#000' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: '#fff', textAlign: 'center', marginBottom: 6 },
  emptyText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.t2, textAlign: 'center' },
});
