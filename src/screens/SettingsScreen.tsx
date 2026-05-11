import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services/auth.service';

const DIETARY_OPTIONS = [
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'vegetarian', label: '🥦 Vegetarian' },
  { key: 'gluten-free', label: '🌾 Gluten-Free' },
  { key: 'dairy-free', label: '🥛 Dairy-Free' },
  { key: 'nut-free', label: '🥜 Nut-Free' },
];

export default function SettingsScreen() {
  const { supabaseUser, profile } = useAuth();
  const navigation = useNavigation<any>();
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseUser) return;
    supabase
      .from('user_preferences')
      .select('dietary_preferences')
      .eq('user_id', supabaseUser.id)
      .single()
      .then(({ data }) => {
        if (data?.dietary_preferences) setDietary(data.dietary_preferences);
        setLoading(false);
      });
  }, [supabaseUser]);

  function toggleDietary(key: string) {
    setDietary((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    if (!supabaseUser) return;
    setSaving(true);
    try {
      await supabase.from('user_preferences').upsert({
        user_id: supabaseUser.id,
        dietary_preferences: dietary,
      }, { onConflict: 'user_id' });
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          try { await signOut(); } catch { /* ignore */ }
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            Alert.alert('Contact support', 'To delete your account, please contact support. (Self-deletion coming soon.)');
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#8B9D83" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile */}
        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name ?? 'Your Name'}</Text>
            <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Dietary preferences */}
        <Text style={styles.sectionLabel}>Dietary Preferences</Text>
        <View style={styles.card}>
          {DIETARY_OPTIONS.map((opt, i) => (
            <View key={opt.key} style={[styles.prefRow, i < DIETARY_OPTIONS.length - 1 && styles.prefRowBorder]}>
              <Text style={styles.prefLabel}>{opt.label}</Text>
              <Switch
                value={dietary.includes(opt.key)}
                onValueChange={() => toggleDietary(opt.key)}
                trackColor={{ false: '#D4DDD0', true: '#8B9D83' }}
                thumbColor={dietary.includes(opt.key) ? '#4A5D43' : '#fff'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Preferences</Text>}
        </TouchableOpacity>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Text style={styles.actionLabel}>Sign Out</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.prefRowBorder} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
            <Text style={[styles.actionLabel, { color: '#D4635E' }]}>Delete Account</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, marginBottom: 20 },
  back: { fontSize: 15, color: '#6B7F5F', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#E8EDE6',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#8B9D83', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#2D3319' },
  profileEmail: { fontSize: 13, color: '#6B7566', marginTop: 2 },
  chevron: { fontSize: 22, color: '#A8B89F' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B7566', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8EDE6', marginBottom: 24 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  prefRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F5F0' },
  prefLabel: { fontSize: 15, color: '#2D3319' },
  saveBtn: { backgroundColor: '#6B7F5F', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  actionLabel: { fontSize: 15, color: '#2D3319' },
  actionChevron: { fontSize: 20, color: '#A8B89F' },
});
