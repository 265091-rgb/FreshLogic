import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { addItem } from '../services/inventory.service';
import { lookupBarcode, defaultExpiryDate, mapCategory } from '../services/barcode.service';

const CATEGORIES = ['dairy', 'produce', 'protein', 'grains', 'beverages', 'other'];
const UNITS = ['count', 'oz', 'lbs', 'kg', 'g', 'gallon', 'L', 'ml', 'bag', 'box', 'can', 'bottle'];

type Mode = 'choose' | 'scanning' | 'form' | 'voice';

interface FormState {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiration_date: string;
}

export default function AddFoodScreen() {
  const { supabaseUser } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [mode, setMode] = useState<Mode>('choose');
  const [form, setForm] = useState<FormState>({
    name: '', category: 'other', quantity: '1', unit: 'count', expiration_date: '',
  });
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [Scanner, setScanner] = useState<any>(null);
  const [voiceText, setVoiceText] = useState('');

  // Dynamically load BarCodeScanner only on native
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('expo-barcode-scanner').then((mod) => setScanner(() => mod.BarCodeScanner));
    }
  }, []);

  // Pre-fill from shopping list "Add to fridge" flow.
  // useFocusEffect fires every time this tab gains focus, which is what we
  // need since tab screens stay mounted and useEffect won't re-fire for the
  // same param value. We clear the param after use so it re-triggers correctly.
  useFocusEffect(
    useCallback(() => {
      const prefillName = route.params?.prefillName as string | undefined;
      if (prefillName) {
        setForm({ name: prefillName, category: 'other', quantity: '1', unit: 'count', expiration_date: defaultExpiryDate('other') });
        setMode('form');
        navigation.setParams({ prefillName: undefined });
      }
    }, [route.params?.prefillName, navigation])
  );

  function handleVoiceSubmit() {
    const text = voiceText.trim();
    if (!text) return;
    // Parse "2 lbs chicken" → { quantity: '2', unit: 'lbs', name: 'chicken' }
    const unitList = ['oz', 'lbs', 'lb', 'kg', 'g', 'gallon', 'L', 'ml', 'bag', 'box', 'can', 'bottle'];
    const re = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${unitList.join('|')})?\\s+(.+)$`, 'i');
    const match = text.match(re);
    const parsed = match
      ? { quantity: match[1], unit: match[2]?.toLowerCase().replace('lb', 'lbs') ?? 'count', name: match[3].trim() }
      : { quantity: '1', unit: 'count', name: text };
    setForm({
      name: parsed.name,
      category: 'other',
      quantity: parsed.quantity,
      unit: parsed.unit,
      expiration_date: defaultExpiryDate('other'),
    });
    setVoiceText('');
    setMode('form');
  }

  async function requestCameraPermission() {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Barcode scanning requires the mobile app. Use manual entry instead.');
      return false;
    }
    if (!Scanner) return false;
    const { status } = await Scanner.requestPermissionsAsync();
    return status === 'granted';
  }

  async function handleScanPress() {
    const granted = await requestCameraPermission();
    if (granted) {
      setScanned(false);
      setMode('scanning');
    } else if (Platform.OS !== 'web') {
      Alert.alert('Camera permission denied', 'Enable camera access in Settings to scan barcodes.');
    }
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(100);
    setLookingUp(true);
    setMode('form');

    const result = await lookupBarcode(data);
    if (result) {
      setForm({
        name: result.name || data,
        category: result.category,
        quantity: '1',
        unit: 'count',
        expiration_date: defaultExpiryDate(result.category),
      });
    } else {
      setForm((f) => ({ ...f, name: '', expiration_date: defaultExpiryDate('other') }));
      Alert.alert('Product not found', 'We couldn\'t find this barcode. Fill in the details manually.');
    }
    setLookingUp(false);
  }

  function handleManualPress() {
    setForm({ name: '', category: 'other', quantity: '1', unit: 'count', expiration_date: defaultExpiryDate('other') });
    setMode('form');
  }

  async function handleSave() {
    if (!supabaseUser) return;
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter an item name.'); return; }
    if (!form.quantity || isNaN(Number(form.quantity))) { Alert.alert('Invalid quantity', 'Enter a valid number.'); return; }

    setSaving(true);
    try {
      await addItem({
        user_id: supabaseUser.id,
        name: form.name.trim(),
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        expiration_date: form.expiration_date || undefined,
      });
      Alert.alert('Added!', `${form.name} added to your fridge.`, [
        { text: 'Add Another', onPress: () => setMode('choose') },
        { text: 'Done', style: 'default' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  }

  // ── Scanning view ──────────────────────────────────────────
  if (mode === 'scanning' && Scanner) {
    return (
      <View style={styles.scanContainer}>
        <Scanner
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Point at a barcode</Text>
        </View>
        <TouchableOpacity style={styles.cancelScan} onPress={() => setMode('choose')}>
          <Text style={styles.cancelScanText}>✕ Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Voice mode ─────────────────────────────────────────────
  if (mode === 'voice') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.voiceBackBtn} onPress={() => { setVoiceText(''); setMode('choose'); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.voiceCenter}>
          <View style={styles.micRing}>
            <View style={styles.micBtn}>
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
          </View>
          <Text style={styles.voiceTitle}>Voice Input</Text>
          <Text style={styles.voiceSub}>Type naturally — quantity, unit, and item name:</Text>
        </View>

        <View style={styles.voiceInputSection}>
          <TextInput
            style={styles.voiceInput}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder='e.g. "2 lbs chicken" or "3 apples"'
            placeholderTextColor="#A8B89F"
            autoCapitalize="none"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleVoiceSubmit}
          />
          <TouchableOpacity
            style={[styles.voiceSubmitBtn, !voiceText.trim() && styles.voiceSubmitDisabled]}
            onPress={handleVoiceSubmit}
            disabled={!voiceText.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.voiceSubmitText}>Add Item →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.voiceNote}>
          <Text style={styles.voiceNoteText}>
            🔌 Full hands-free voice input coming in Phase 3 via Raspberry Pi + Whisper.cpp
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Choose mode ────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>Add Food Item</Text>
        <Text style={styles.subtitle}>How would you like to add it?</Text>

        <View style={styles.choiceList}>
          <TouchableOpacity style={styles.choicePrimary} onPress={handleScanPress} activeOpacity={0.85}>
            <Text style={styles.choiceIcon}>📷</Text>
            <View>
              <Text style={styles.choicePrimaryLabel}>Scan Barcode</Text>
              <Text style={styles.choicePrimaryHint}>Fastest — auto-fills details</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.choiceSecondary} onPress={handleManualPress} activeOpacity={0.85}>
            <Text style={styles.choiceIcon}>✏️</Text>
            <View>
              <Text style={styles.choiceSecondaryLabel}>Manual Entry</Text>
              <Text style={styles.choiceSecondaryHint}>Type item details yourself</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.choiceVoice} onPress={() => setMode('voice')} activeOpacity={0.85}>
            <Text style={styles.choiceIcon}>🎙</Text>
            <View>
              <Text style={styles.choiceVoiceLabel}>Voice Input</Text>
              <Text style={styles.choiceVoiceHint}>Speak or type naturally</Text>
            </View>
            <View style={styles.voiceBadge}>
              <Text style={styles.voiceBadgeText}>Phase 3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confirmation form ──────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setMode('choose')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Item Details</Text>
        </View>

        {lookingUp && (
          <View style={styles.lookupBanner}>
            <ActivityIndicator size="small" color="#6B7F5F" />
            <Text style={styles.lookupText}>Looking up product…</Text>
          </View>
        )}

        <Text style={styles.label}>Item Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Organic Milk"
          placeholderTextColor="#A8B89F"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, form.category === cat && styles.pillActive]}
              onPress={() => setForm((f) => ({ ...f, category: cat, expiration_date: defaultExpiryDate(cat) }))}
            >
              <Text style={[styles.pillText, form.category === cat && styles.pillTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={form.quantity}
              onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor="#A8B89F"
            />
          </View>
          <View style={[styles.flex1, { marginLeft: 12 }]}>
            <Text style={styles.label}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.pill, form.unit === u && styles.pillActive]}
                  onPress={() => setForm((f) => ({ ...f, unit: u }))}
                >
                  <Text style={[styles.pillText, form.unit === u && styles.pillTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={styles.label}>Expiration Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={form.expiration_date}
          onChangeText={(v) => setForm((f) => ({ ...f, expiration_date: v }))}
          placeholder="2026-05-20"
          placeholderTextColor="#A8B89F"
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add to Fridge</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#2D3319', paddingHorizontal: 20, paddingTop: 20, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7566', paddingHorizontal: 20, marginBottom: 32 },
  choiceList: { paddingHorizontal: 20, gap: 12 },
  choicePrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#6B7F5F', borderRadius: 14, padding: 20,
  },
  choicePrimaryLabel: { fontSize: 17, fontWeight: '700', color: '#fff' },
  choicePrimaryHint: { fontSize: 12, color: '#D4DDD0', marginTop: 2 },
  choiceSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F2F5F0', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#D4DDD0',
  },
  choiceSecondaryLabel: { fontSize: 17, fontWeight: '700', color: '#2D3319' },
  choiceSecondaryHint: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  choiceIcon: { fontSize: 32 },
  choiceVoice: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F8FAF7', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#D4DDD0',
  },
  choiceVoiceLabel: { fontSize: 17, fontWeight: '700', color: '#2D3319' },
  choiceVoiceHint: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  voiceBadge: {
    marginLeft: 'auto', backgroundColor: '#E8F0E6', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  voiceBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7F5F' },
  // Voice mode
  voiceBackBtn: { paddingHorizontal: 20, paddingTop: 20 },
  voiceCenter: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  micRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E8F0E6', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#6B7F5F', alignItems: 'center', justifyContent: 'center',
  },
  micEmoji: { fontSize: 32 },
  voiceTitle: { fontSize: 22, fontWeight: '700', color: '#2D3319', marginBottom: 6 },
  voiceSub: { fontSize: 14, color: '#6B7566', textAlign: 'center', paddingHorizontal: 32 },
  voiceInputSection: { paddingHorizontal: 20, gap: 12 },
  voiceInput: {
    borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: '#2D3319', backgroundColor: '#fff',
  },
  voiceSubmitBtn: {
    backgroundColor: '#6B7F5F', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  voiceSubmitDisabled: { backgroundColor: '#A8B89F' },
  voiceSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  voiceNote: {
    marginHorizontal: 20, marginTop: 24, padding: 14,
    backgroundColor: '#F8FAF7', borderRadius: 10,
    borderWidth: 1, borderColor: '#E8EDE6',
  },
  voiceNoteText: { fontSize: 12, color: '#6B7566', textAlign: 'center', lineHeight: 18 },
  // Scanner
  scanContainer: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 160, borderWidth: 3, borderColor: '#6B7F5F', borderRadius: 12 },
  scanHint: { color: '#fff', marginTop: 16, fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  cancelScan: {
    position: 'absolute', bottom: 60, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  cancelScanText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Form
  formContent: { paddingHorizontal: 20, paddingBottom: 40 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 20, marginBottom: 4 },
  back: { fontSize: 15, color: '#6B7F5F', fontWeight: '600' },
  lookupBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F2F5F0', borderRadius: 8, padding: 12, marginBottom: 16 },
  lookupText: { fontSize: 14, color: '#6B7566' },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7566', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#2D3319',
  },
  pills: { flexDirection: 'row' },
  pill: {
    borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  pillActive: { backgroundColor: '#6B7F5F', borderColor: '#6B7F5F' },
  pillText: { fontSize: 13, color: '#6B7566', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  saveBtn: { backgroundColor: '#6B7F5F', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
