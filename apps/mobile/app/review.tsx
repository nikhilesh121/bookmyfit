import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ImageBackground, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconArrowLeft, IconStar, IconCheck } from '../components/Icons';
import { miscApi } from '../lib/api';

const MAX_CHARS = 500;

export default function Review() {
  const { gymId, gymName, trainerId, trainerName } =
    useLocalSearchParams<{
      gymId?: string; gymName?: string;
      trainerId?: string; trainerName?: string;
    }>();

  const subject = trainerName || gymName || 'BookMyFit Gym';
  const isGym = !!gymId;

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await miscApi.submitReview({
        gymId: gymId || undefined,
        trainerId: trainerId || undefined,
        rating,
        text: text.trim() || undefined,
      });
      Alert.alert('Review Submitted!', 'Thank you for your feedback.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
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
        <Text style={s.headerTitle}>Rate & Review</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Subject card */}
      <ImageBackground
        source={{
          uri: isGym
            ? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=70'
            : 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=70',
        }}
        style={s.subjectCard}
        imageStyle={{ borderRadius: radius.xl, opacity: 0.35 }}
      >
        <View style={s.subjectOverlay}>
          <Text style={s.subjectKicker}>{isGym ? 'GYM' : 'TRAINER'}</Text>
          <Text style={s.subjectName}>{subject}</Text>
        </View>
      </ImageBackground>

      <View style={s.body}>
        {/* Star rating */}
        <Text style={s.sectionLabel}>Your Rating</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={s.starBtn}
            >
              <IconStar
                size={40}
                color={star <= rating ? 'rgba(255,205,55,0.95)' : 'rgba(255,255,255,0.15)'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={s.ratingLabel}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </Text>
        )}

        {/* Text input */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>Your Experience</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder="Share your thoughts... (optional)"
            placeholderTextColor={colors.t3}
            multiline
            maxLength={MAX_CHARS}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{text.length}/{MAX_CHARS}</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, rating === 0 && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#060606" />
          ) : (
            <>
              <IconCheck size={16} color="#060606" />
              <Text style={s.submitBtnText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>

        {rating === 0 && (
          <Text style={s.hintText}>Select a star rating to continue</Text>
        )}
      </View>
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
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.borderGlass, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 20, color: '#fff' },
  subjectCard: {
    height: 130, marginHorizontal: 20, borderRadius: radius.xl, marginBottom: 24, overflow: 'hidden',
  },
  subjectOverlay: {
    flex: 1, backgroundColor: 'rgba(6,6,6,0.5)',
    borderRadius: radius.xl, padding: 20, justifyContent: 'flex-end',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  subjectKicker: {
    fontSize: 10, letterSpacing: 3, color: colors.accent,
    fontFamily: fonts.sansBold, marginBottom: 6,
  },
  subjectName: { fontFamily: fonts.serif, fontSize: 22, color: '#fff' },
  body: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.accent, fontFamily: fonts.sansBold, marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row', gap: 6,
  },
  starBtn: { padding: 4 },
  ratingLabel: {
    fontFamily: fonts.sansMedium, fontSize: 14, color: 'rgba(255,205,55,0.9)',
    marginTop: 8,
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)', borderRadius: radius.lg,
    padding: 16, marginBottom: 24,
  },
  input: {
    fontFamily: fonts.sans, fontSize: 14, color: '#fff',
    height: 120, lineHeight: 21,
  },
  charCount: {
    fontFamily: fonts.sans, fontSize: 11, color: colors.t3,
    textAlign: 'right', marginTop: 8,
  },
  submitBtn: {
    height: 54, borderRadius: 30, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#060606' },
  hintText: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.t2,
    textAlign: 'center', marginTop: 10,
  },
});
