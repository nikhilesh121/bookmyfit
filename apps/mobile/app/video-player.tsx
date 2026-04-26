import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors, fonts } from '../theme/brand';
import { IconArrowLeft, IconPlay } from '../components/Icons';

const { width, height } = Dimensions.get('window');

export default function VideoPlayer() {
  const { url, title, instructor, duration } = useLocalSearchParams<{
    url: string;
    title?: string;
    instructor?: string;
    duration?: string;
  }>();

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isPlaying = (status as any)?.isPlaying ?? false;
  const positionMs = (status as any)?.positionMillis ?? 0;
  const durationMs = (status as any)?.durationMillis ?? 0;

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressRatio = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={s.root}>
      <StatusBar hidden />
      {/* Video */}
      <View style={s.videoWrap}>
        {url ? (
          <Video
            ref={videoRef}
            source={{ uri: url }}
            style={s.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            onPlaybackStatusUpdate={(st) => {
              setStatus(st);
              if ((st as any).isLoaded) setLoading(false);
            }}
            shouldPlay
          />
        ) : (
          <View style={[s.video, s.noVideo]}>
            <IconPlay size={48} color={colors.accent} />
            <Text style={s.noVideoText}>No video URL provided</Text>
          </View>
        )}
        {loading && url && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
        {/* Play/Pause overlay */}
        {!loading && url && (
          <TouchableOpacity style={s.playOverlay} activeOpacity={0.7} onPress={togglePlay}>
            {!isPlaying && (
              <View style={s.playBtn}>
                <IconPlay size={32} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Controls */}
      <SafeAreaView style={s.controls} edges={['bottom']}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <IconArrowLeft size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.info}>
          {title ? <Text style={s.titleText} numberOfLines={1}>{title}</Text> : null}
          {instructor ? <Text style={s.instructorText}>{instructor}</Text> : null}
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.timeText}>{formatTime(positionMs)}</Text>
            <Text style={s.timeText}>{durationMs > 0 ? formatTime(durationMs) : (duration ?? '--:--')}</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  video: { width, height: height * 0.6 },
  noVideo: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  noVideoText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  controls: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  back: { marginBottom: 12 },
  info: { marginBottom: 16 },
  titleText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff', marginBottom: 4 },
  instructorText: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  progressWrap: { gap: 6 },
  progressTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3 },
});
