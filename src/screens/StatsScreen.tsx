import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getWeeklyStats, getWeeklyHistory, WeekSummary } from '../services/stats.service';
import { WeeklyStats } from '../types';

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const { supabaseUser, profile } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [history, setHistory] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseUser) return;
    try {
      const [s, h] = await Promise.all([
        getWeeklyStats(supabaseUser.id),
        getWeeklyHistory(supabaseUser.id),
      ]);
      setStats(s);
      setHistory(h);
    } catch {
      // keep stale
    }
  }, [supabaseUser]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const wasteColor = !stats ? '#2D3319'
    : stats.waste_percent >= 30 ? '#D4635E'
    : stats.waste_percent >= 15 ? '#E89B6C'
    : '#6B7F5F';

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
          <Text style={styles.title}>📊 Stats</Text>
        </View>

        {/* This week */}
        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <StatBox value={String(stats?.items_added ?? 0)} label="Added" />
            <View style={styles.statDivider} />
            <StatBox value={String(stats?.items_used ?? 0)} label="Used" color="#6B7F5F" />
            <View style={styles.statDivider} />
            <StatBox value={String(stats?.items_wasted ?? 0)} label="Wasted" color="#D4635E" />
          </View>
        </View>

        {/* Waste % */}
        <Text style={styles.sectionLabel}>WASTE RATE</Text>
        <View style={[styles.card, styles.wasteCard]}>
          <View style={styles.wasteLeft}>
            <Text style={[styles.wastePercent, { color: wasteColor }]}>
              {stats?.waste_percent ?? 0}%
            </Text>
            <Text style={styles.wasteSub}>of items wasted this week</Text>
          </View>
          <View style={styles.wasteBadge(wasteColor)}>
            <Text style={styles.wasteBadgeText}>
              {(stats?.waste_percent ?? 0) < 15 ? '🟢 Great' : (stats?.waste_percent ?? 0) < 30 ? '🟠 OK' : '🔴 High'}
            </Text>
          </View>
        </View>

        {/* Money saved */}
        <Text style={styles.sectionLabel}>MONEY SAVED</Text>
        <View style={[styles.card, styles.moneyCard]}>
          <Text style={styles.moneyEmoji}>💰</Text>
          <View>
            <Text style={styles.moneyAmount}>${(stats?.money_saved ?? 0).toFixed(2)}</Text>
            <Text style={styles.moneySub}>saved this week vs throwing out</Text>
          </View>
        </View>

        {/* Streak */}
        <Text style={styles.sectionLabel}>STREAK</Text>
        <View style={[styles.card, styles.streakCard]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakValue}>0 weeks</Text>
            <Text style={styles.streakSub}>Keep using items before they expire!</Text>
          </View>
        </View>

        {/* 4-week history */}
        <Text style={styles.sectionLabel}>LAST 4 WEEKS</Text>
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Week</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Added</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Waste %</Text>
          </View>
          {history.map((row, i) => (
            <View key={i} style={[styles.tableRow, i < history.length - 1 && styles.tableRowBorder]}>
              <Text style={[styles.tableCell, styles.tableCellWeek, { flex: 2 }]}>{row.week_label}</Text>
              <Text style={styles.tableCell}>{row.items_added}</Text>
              <Text style={[styles.tableCell, { color: row.waste_percent >= 30 ? '#D4635E' : row.waste_percent >= 15 ? '#E89B6C' : '#6B7F5F', fontWeight: '600' }]}>
                {row.waste_percent}%
              </Text>
            </View>
          ))}
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
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7566', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8EDE6', marginBottom: 20 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxValue: { fontSize: 28, fontWeight: '700', color: '#2D3319' },
  statBoxLabel: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  statDivider: { width: 1, height: 48, backgroundColor: '#E8EDE6' },
  wasteCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  wasteLeft: {},
  wastePercent: { fontSize: 36, fontWeight: '700' },
  wasteSub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  wasteBadge: (color: string) => ({
    backgroundColor: color + '18',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  }),
  wasteBadgeText: { fontSize: 13, fontWeight: '600' },
  moneyCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  moneyEmoji: { fontSize: 36 },
  moneyAmount: { fontSize: 28, fontWeight: '700', color: '#6B7F5F' },
  moneySub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  streakEmoji: { fontSize: 36 },
  streakValue: { fontSize: 22, fontWeight: '700', color: '#2D3319' },
  streakSub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAF7', borderRadius: 13 },
  tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#6B7566', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F5F0' },
  tableCell: { flex: 1, fontSize: 14, color: '#2D3319' },
  tableCellWeek: { color: '#4A5D43', fontWeight: '500' },
});
