import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuroraBackground from '../components/AuroraBackground';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme/brand';
import { IconChevronRight } from '../components/Icons';
import { usersApi } from '../lib/api';

export default function EditProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi.me()
      .then((data: any) => {
        const u = data?.user || data;
        setName(u?.name || '');
        setEmail(u?.email || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await usersApi.update({ name: name.trim(), email: email.trim() || undefined });
      Alert.alert('Success', 'Profile updated', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuroraBackground>
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <IconChevronRight size={20} color={colors.accent} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.t3}
          autoCapitalize="words"
        />

        <Text style={[styles.label, { marginTop: 20 }]}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.t3}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.hint}>Phone number cannot be changed. Contact support if needed.</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.t,
  },
  card: {
    margin: 20,
    padding: 24,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.t,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.t3,
    marginTop: 16,
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#000',
  },
});
