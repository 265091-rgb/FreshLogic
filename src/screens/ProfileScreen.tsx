import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ProfileScreen() {
  const { supabaseUser, profile } = useAuth();
  const navigation = useNavigation<any>();
  const [name, setName] = useState(profile?.name ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  async function handlePickPhoto() {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Photo upload requires the mobile app.');
      return;
    }
    setPickingPhoto(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission denied', 'Enable photo library access in Settings.'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const ImageManipulator = await import('expo-image-manipulator');
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhotoUri(resized.uri);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not pick photo.');
    } finally {
      setPickingPhoto(false);
    }
  }

  async function handleSave() {
    if (!supabaseUser) return;
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      let photoUrl = profile?.photo_url ?? null;

      // Upload photo if changed
      if (photoUri && photoUri !== profile?.photo_url && Platform.OS !== 'web') {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const path = `${supabaseUser.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      await supabase.from('users').update({
        name: name.trim(),
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', supabaseUser.id);

      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        {/* Photo */}
        <TouchableOpacity style={styles.photoArea} onPress={handlePickPhoto} disabled={pickingPhoto} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.photoEdit}>
            {pickingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.photoEditText}>✏️</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>Tap to change photo</Text>

        {/* Name */}
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#A8B89F"
          autoCapitalize="words"
        />

        <Text style={styles.emailNote}>{profile?.email}</Text>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, marginBottom: 32 },
  back: { fontSize: 15, color: '#6B7F5F', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  photoArea: { alignSelf: 'center', marginBottom: 8 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#8B9D83', alignItems: 'center', justifyContent: 'center',
  },
  photoInitial: { color: '#fff', fontSize: 40, fontWeight: '700' },
  photoEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#4A5D43', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  photoEditText: { fontSize: 12 },
  photoHint: { textAlign: 'center', fontSize: 12, color: '#A8B89F', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7566', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#2D3319', marginBottom: 12,
  },
  emailNote: { fontSize: 13, color: '#A8B89F', marginBottom: 32 },
  saveBtn: { backgroundColor: '#6B7F5F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
