import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Alert, Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconPlay, IconLock, IconClock } from '../components/Icons';
import { miscApi } from '../lib/api';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const FILTERS = ['All', 'Free', 'Premium', 'Cardio', 'Yoga', 'HIIT'];

const DUMMY_VIDEOS = [
  {
    id: '1', title: 'Morning HIIT Blast', instructor: 'Coach Aryan', duration: '22 min',
    category: 'HIIT', premium: false,
    thumb: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70',
  },
  {
    id: '2', title: 'Yoga Flow — Deep Stretch', instructor: 'Priya Mehta', duration: '35 min',
    category: 'Yoga', premium: false,
    thumb: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=70',
  },
  {
    id: '3', title: 'Core Strength Circuit', instructor: 'Coach Dev', duration: '18 min',
    category: 'Cardio', premium: false,
    thumb: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=70',
  },
  {
    id: '4', title: 'Elite Power Lifting', instructor: 'Raj Fitness', duration: '45 min',
    category: 'HIIT', premium: true,
    thumb: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=70',
  },
  {
    id: '5', title: 'Mindful Yoga Nidra', instructor: 'Ananya S.', duration: '28 min',
    category: 'Yoga', premium: true,
    thumb: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=70',
  },
  {
    id: '6', title: 'Cardio Burn 5K', instructor: 'Coach Vikram', duration: '30 min',
    category: 'Cardio', premium: false,
    thumb: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=70',
  },
];

export default function Videos() {
  const [filter, setFilter] = useState('All');
  const [videos, setVideos] = useState(DUMMY_VIDEOS);
  const [loading, setLoading] = useState(false);
  const [playModal, setPlayModal] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await miscApi.videos();
      const raw = Array.isArray(data) ? data : data?.videos || data?.data || [];
      if (raw.length > 0) {
        const normalized = raw.map((v: any) => ({
          ...v,
          id: v._id || v.id || String(Math.random()),
          duration: v.duration || (v.durationSeconds ? `${Math.floor(v.durationSeconds / 60)} min` : '—'),
          instructor: v.instructor || v.instructorName || '—',
          category: v.category || v.type || 'General',
          thumb: v.thumb || v.thumbnail || v.thumbnailUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70',
          premium: v.premium || v.isPremium || false,
        }));
        setVideos(normalized);
      }
    } catch {
      // fallback to dummy data — no-op
    } finally {
      setLoading(false);
    }
  };

  const filtered = videos.filter((v) => {
    if (filter === 'All') return true;
    if (filter === 'Free') return !v.premium;
    if (filter === 'Premium') return v.premium;
    return v.category === filter;
  });

  const handleVideoPress = (video: typeof DUMMY_VIDEOS[0]) => {
    if (video.premium) {
      Alert.alert('Premium Content', 'Upgrade to Pro or Elite plan to unlock this video.', [
        { text: 'Upgrade', onPress: () => router.push('/plans') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      setPlayModal(video.title);
    }
  };

  return (
    <AuroraBackground variant="default">
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <IconArrowLeft size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Workout Videos</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.pill, filter === f && s.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.pillText, filter === f && s.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
        {filtered.map((video) => (
          <TouchableOpacity
            key={video.id}
            style={s.videoCard}
            onPress={() => handleVideoPress(video)}
            activeOpacity={0.85}
          >
            <ImageBackground
              source={{ uri: video.thumb }}
              style={s.thumb}
              imageStyle={{ borderRadius: radius.lg }}
            >
              <View style={s.thumbOverlay} />
              {/* Duration badge */}
              <View style={s.durationBadge}>
                <IconClock size={10} color="#fff" />
                <Text style={s.durationText}>{video.duration}</Text>
              </View>
              {/* Play / Lock */}
              <View style={s.playBtn}>
                {video.premium
                  ? <IconLock size={16} color="#fff" />
                  : <IconPlay size={16} color="#060606" />
                }
              </View>
              {/* Premium badge */}
              {video.premium && (
                <View style={s.premiumBadge}>
                  <Text style={s.premiumBadgeText}>PRO</Text>
                </View>
              )}
            </ImageBackground>
            <Text style={s.videoTitle} numberOfLines={2}>{video.title}</Text>
            <Text style={s.instructor}>{video.instructor}</Text>
            <View style={[s.freeBadge, video.premium && s.proBadge]}>
              <Text style={[s.freeBadgeText, video.premium && s.proBadgeText]}>
                {video.premium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Play Modal */}
      <Modal
        visible={!!playModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPlayModal(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.playerPlaceholder}>
              <IconPlay size={40} color={colors.accent} />
            </View>
            <Text style={s.modalTitle}>{playModal}</Text>
            <Text style={s.modalSub}>Video player coming soon</Text>
            <TouchableOpacity style={s.modalClose} onPress={() => setPlayModal(null)}>
              <Text style={s.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  back: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderGlass,
  },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.t },
  pillTextActive: { color: colors.accent },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
  },
  videoCard: { width: CARD_W },
  thumb: {
    width: CARD_W, height: CARD_W * 0.65, borderRadius: radius.lg,
    marginBottom: 8, overflow: 'hidden', justifyContent: 'space-between',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.lg,
  },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start',
    margin: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  durationText: { fontFamily: fonts.sansBold, fontSize: 10, color: '#fff' },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 8,
  },
  premiumBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(155,0,255,0.85)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill,
  },
  premiumBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#fff', letterSpacing: 1 },
  videoTitle: {
    fontFamily: fonts.sansMedium, fontSize: 13, color: '#fff', lineHeight: 18, marginBottom: 4,
  },
  instructor: { fontFamily: fonts.sans, fontSize: 11, color: colors.t2, marginBottom: 6 },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  freeBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.accent },
  proBadge: {
    backgroundColor: 'rgba(155,0,255,0.15)', borderColor: 'rgba(155,0,255,0.35)',
  },
  proBadgeText: { color: '#B44FFF' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCard: {
    width: width - 48, backgroundColor: 'rgba(20,20,20,0.98)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.xl, padding: 24, alignItems: 'center',
  },
  playerPlaceholder: {
    width: '100%', height: 180, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginBottom: 20 },
  modalClose: {
    height: 48, width: '100%', borderRadius: 24,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.accent },
});
