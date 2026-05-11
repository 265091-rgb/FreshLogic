import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';

export const ONBOARDING_KEY = 'freshlogic:onboarding_complete';

const TOTAL_STEPS = 5;

const DIETARY_OPTIONS = [
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'vegetarian', label: '🥦 Vegetarian' },
  { key: 'gluten-free', label: '🌾 Gluten-Free' },
  { key: 'dairy-free', label: '🥛 Dairy-Free' },
  { key: 'nut-free', label: '🥜 Nut-Free' },
];

const WASTE_OPTIONS = [
  { label: '🌱 Less than 10%', sublabel: "I'm pretty careful", value: 5 },
  { label: '😊 Around 20%', sublabel: 'Some waste occasionally', value: 20 },
  { label: '😅 Around 30%', sublabel: 'Average household', value: 30 },
  { label: '😬 Over 50%', sublabel: 'I waste quite a bit', value: 50 },
];

const FREQUENCY_OPTIONS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { supabaseUser, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [dietary, setDietary] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('weekly');
  const [wastePercent, setWastePercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleDietary(key: string) {
    setDietary((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  function canAdvance() {
    if (step === 4) return wastePercent !== null;
    return true;
  }

  async function handleComplete() {
    if (!supabaseUser) return;
    setSaving(true);
    try {
      await supabase.from('user_preferences').upsert({
        user_id: supabaseUser.id,
        dietary_preferences: dietary,
        baseline_waste_percent: wastePercent ?? 20,
      }, { onConflict: 'user_id' });
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onComplete();
    } catch {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.dot, i + 1 <= step && styles.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <View style={styles.stepWrap}>
            <Text style={styles.bigEmoji}>🥦</Text>
            <Text style={styles.heading}>Welcome to FreshLogic{profile?.name ? `, ${profile.name}` : ''}!</Text>
            <Text style={styles.sub}>
              Let's get you set up in a few quick steps so we can personalise your experience.
            </Text>
          </View>
        )}

        {/* ── Step 2: Dietary ── */}
        {step === 2 && (
          <View style={styles.stepWrap}>
            <Text style={styles.bigEmoji}>🍽️</Text>
            <Text style={styles.heading}>Any dietary preferences?</Text>
            <Text style={styles.sub}>We'll filter recipes and alerts to match. You can change these any time in Settings.</Text>
            <View style={styles.card}>
              {DIETARY_OPTIONS.map((opt, i) => (
                <View key={opt.key} style={[styles.prefRow, i < DIETARY_OPTIONS.length - 1 && styles.prefBorder]}>
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
          </View>
        )}

        {/* ── Step 3: Shopping frequency ── */}
        {step === 3 && (
          <View style={styles.stepWrap}>
            <Text style={styles.bigEmoji}>🛒</Text>
            <Text style={styles.heading}>How often do you shop?</Text>
            <Text style={styles.sub}>We'll use this to time your reminders and shopping list suggestions.</Text>
            <View style={styles.choiceGroup}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.choiceBtn, frequency === opt.key && styles.choiceBtnActive]}
                  onPress={() => setFrequency(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.choiceBtnText, frequency === opt.key && styles.choiceBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 4: Baseline waste ── */}
        {step === 4 && (
          <View style={styles.stepWrap}>
            <Text style={styles.bigEmoji}>♻️</Text>
            <Text style={styles.heading}>How much food do you typically waste?</Text>
            <Text style={styles.sub}>Be honest — this baseline helps us measure your real improvement over time.</Text>
            <View style={styles.choiceGroup}>
              {WASTE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.wasteBtn, wastePercent === opt.value && styles.wasteBtnActive]}
                  onPress={() => setWastePercent(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wasteBtnLabel, wastePercent === opt.value && styles.wasteBtnLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.wasteBtnSub, wastePercent === opt.value && styles.wasteBtnSubActive]}>
                    {opt.sublabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <View style={styles.stepWrap}>
            <Text style={styles.bigEmoji}>✅</Text>
            <Text style={styles.heading}>You're all set!</Text>
            <Text style={styles.sub}>
              Start adding items to your fridge to track freshness, get recipe ideas, and reduce waste.
            </Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Quick tips</Text>
              <Text style={styles.tipItem}>📷 Scan barcodes to add items in seconds</Text>
              <Text style={styles.tipItem}>🧊 Check your fridge daily for expiry alerts</Text>
              <Text style={styles.tipItem}>🛒 Tick off shopping items to move them to your fridge</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            onPress={() => canAdvance() && setStep((s) => s + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleComplete} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>Get Started 🚀</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4DDD0' },
  dotActive: { backgroundColor: '#6B7F5F', width: 20 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  stepWrap: { alignItems: 'center', paddingTop: 32 },
  bigEmoji: { fontSize: 72, marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: '700', color: '#2D3319', textAlign: 'center', marginBottom: 12 },
  sub: { fontSize: 15, color: '#6B7566', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  card: { width: '100%', backgroundColor: '#F8FAF7', borderRadius: 14, borderWidth: 1, borderColor: '#E8EDE6' },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  prefBorder: { borderBottomWidth: 1, borderBottomColor: '#E8EDE6' },
  prefLabel: { fontSize: 15, color: '#2D3319' },
  choiceGroup: { width: '100%', gap: 12 },
  choiceBtn: {
    borderWidth: 2, borderColor: '#D4DDD0', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center',
  },
  choiceBtnActive: { borderColor: '#6B7F5F', backgroundColor: '#F2F5F0' },
  choiceBtnText: { fontSize: 16, fontWeight: '600', color: '#6B7566' },
  choiceBtnTextActive: { color: '#4A5D43' },
  wasteBtn: {
    borderWidth: 2, borderColor: '#D4DDD0', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  wasteBtnActive: { borderColor: '#6B7F5F', backgroundColor: '#F2F5F0' },
  wasteBtnLabel: { fontSize: 16, fontWeight: '600', color: '#6B7566', marginBottom: 2 },
  wasteBtnLabelActive: { color: '#4A5D43' },
  wasteBtnSub: { fontSize: 13, color: '#A8B89F' },
  wasteBtnSubActive: { color: '#6B7566' },
  tipCard: { width: '100%', backgroundColor: '#F2F5F0', borderRadius: 14, padding: 20, gap: 10 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#4A5D43', marginBottom: 4 },
  tipItem: { fontSize: 14, color: '#4A5D43', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F2F5F0' },
  backBtn: { paddingVertical: 12, paddingHorizontal: 4 },
  backBtnText: { fontSize: 15, color: '#6B7566', fontWeight: '600' },
  nextBtn: { backgroundColor: '#6B7F5F', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnDisabled: { backgroundColor: '#A8B89F' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
