import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { api } from '../lib/api';
import { IconChevronRight } from '../components/Icons';

export default function MultiGymNetwork() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subscriptions/multigym-network')
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setGyms(list);
      })
      .catch(() => setError('Could not load partner gyms.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Partner Gyms</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.centre}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : error ? (
          <View style={s.centre}>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : gyms.length === 0 ? (
          <View style={s.centre}>
            <Text style={s.emptyText}>Network being set up. Check back soon.</Text>
          </View>
        ) : (
          gyms.map((gym: any) => {
            const gymId = gym.id || gym._id;
            return (
              <TouchableOpacity
                key={gymId}
                style={s.gymCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id: gymId } } as any)}
              >
                <Image
                  source={{ uri: gym.coverPhoto || gym.photos?.[0] || 'https://placehold.co/80x80/1a1a1a/3DFF54?text=BMF' }}
                  style={s.gymImage}
                />
                <View style={s.gymInfo}>
                  <Text style={s.gymName} numberOfLines={1}>{gym.name}</Text>
                  <Text style={s.gymCity} numberOfLines={1}>{gym.city}{gym.area ? `, ${gym.area}` : ''}</Text>
                  {gym.rating > 0 && (
                    <Text style={s.gymRating}>{'★'} {Number(gym.rating).toFixed(1)}</Text>
                  )}
                </View>
                <IconChevronRight size={16} color={colors.t3} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060606' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { width: 60 },
  backText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accent },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: '#fff' },
  container: { padding: 20, paddingBottom: 48 },
  centre: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, color: colors.t2, textAlign: 'center', maxWidth: 260 },
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  gymImage: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginRight: 14,
  },
  gymInfo: { flex: 1 },
  gymName: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff', marginBottom: 4 },
  gymCity: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginBottom: 4 },
  gymRating: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.accent },
});
