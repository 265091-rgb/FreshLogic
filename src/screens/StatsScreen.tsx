import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getWeeklyStats, getWeeklyHistory, WeekSummary } from '../services/stats.service';
import { WeeklyStats } from '../types';

// ─── Chart helpers ────────────────────────────────────────────────────────────

const wasteColor = (pct: number) =>
  pct >= 30 ? '#D4635E' : pct >= 15 ? '#E89B6C' : '#6B7F5F';

/** Grouped vertical bar chart — added (green) vs wasted (red) per week */
function WeeklyBarChart({ weeks }: { weeks: WeekSummary[] }) {
  const chronological = [...weeks].reverse();
  const maxVal = Math.max(...chronological.flatMap((w) => [w.items_added, w.items_wasted]), 1);
  const H = 100;

  return (
    <View style={chart.wrapper}>
      {/* Bars */}
      <View style={[chart.barsRow, { height: H }]}>
        {chronological.map((w, i) => (
          <View key={i} style={chart.barGroup}>
            <View style={chart.barPair}>
              <View style={[chart.bar, { height: Math.max((w.items_added / maxVal) * H, 3), backgroundColor: '#6B7F5F' }]} />
              <View style={[chart.bar, { height: Math.max((w.items_wasted / maxVal) * H, 3), backgroundColor: '#D4635E' }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Value labels above bars — shown when non-zero */}
      <View style={chart.valueLabelRow}>
        {chronological.map((w, i) => (
          <View key={i} style={chart.barGroup}>
            <Text style={chart.valueLabel}>{w.items_added > 0 ? w.items_added : ''}</Text>
          </View>
        ))}
      </View>

      {/* X-axis labels */}
      <View style={chart.labelRow}>
        {chronological.map((_, i) => (
          <Text key={i} style={chart.axisLabel}>
            {i === 3 ? 'Now' : i === 2 ? '-1w' : i === 1 ? '-2w' : '-3w'}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={chart.legend}>
        <View style={chart.legendItem}>
          <View style={[chart.legendDot, { backgroundColor: '#6B7F5F' }]} />
          <Text style={chart.legendText}>Added</Text>
        </View>
        <View style={chart.legendItem}>
          <View style={[chart.legendDot, { backgroundColor: '#D4635E' }]} />
          <Text style={chart.legendText}>Wasted</Text>
        </View>
      </View>
    </View>
  );
}

/** Horizontal progress bars showing waste % trend per week */
function WasteTrend({ weeks }: { weeks: WeekSummary[] }) {
  return (
    <View>
      {[...weeks].reverse().map((w, i) => {
        const color = wasteColor(w.waste_percent);
        const labels = ['3 weeks ago', '2 weeks ago', 'Last week', 'This week'];
        return (
          <View key={i} style={trend.row}>
            <View style={trend.labelRow}>
              <Text style={trend.label}>{labels[i]}</Text>
              <Text style={[trend.pct, { color }]}>{w.waste_percent}%</Text>
            </View>
            <View style={trend.track}>
              <View
                style={[
                  trend.fill,
                  { width: `${Math.min(w.waste_percent, 100)}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 4-week dot calendar + real streak count */
function StreakSection({ weeks }: { weeks: WeekSummary[] }) {
  const streak = (() => {
    let count = 0;
    for (const w of weeks) {
      if (w.waste_percent < 20) count++;
      else break;
    }
    return count;
  })();

  return (
    <View style={streakS.row}>
      <Text style={streakS.fire}>🔥</Text>
      <View style={streakS.info}>
        <Text style={streakS.count}>{streak} week{streak !== 1 ? 's' : ''}</Text>
        <View style={streakS.dots}>
          {[...weeks].reverse().map((w, i) => (
            <View
              key={i}
              style={[streakS.dot, { backgroundColor: wasteColor(w.waste_percent) }]}
            />
          ))}
        </View>
        <Text style={streakS.sub}>
          {streak > 0
            ? 'Waste under 20% — keep it going!'
            : 'Reduce waste below 20% to start your streak'}
        </Text>
      </View>
    </View>
  );
}

// ─── Stat box ────────────────────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const { supabaseUser } = useAuth();
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

  const wColor = wasteColor(stats?.waste_percent ?? 0);

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

        {/* This week — stat boxes */}
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

        {/* Weekly activity bar chart */}
        <Text style={styles.sectionLabel}>WEEKLY ACTIVITY</Text>
        <View style={styles.card}>
          <View style={{ padding: 16 }}>
            {history.length > 0
              ? <WeeklyBarChart weeks={history} />
              : <Text style={styles.emptyChart}>No data yet — add items to your fridge to see trends.</Text>}
          </View>
        </View>

        {/* Waste % trend */}
        <Text style={styles.sectionLabel}>WASTE TREND</Text>
        <View style={[styles.card, { padding: 16 }]}>
          <View style={styles.wasteTopRow}>
            <Text style={[styles.wastePercent, { color: wColor }]}>
              {stats?.waste_percent ?? 0}%
            </Text>
            <View style={[styles.wasteBadge, { backgroundColor: wColor + '18' }]}>
              <Text style={[styles.wasteBadgeText, { color: wColor }]}>
                {(stats?.waste_percent ?? 0) < 15 ? '🟢 Great' : (stats?.waste_percent ?? 0) < 30 ? '🟠 OK' : '🔴 High'}
              </Text>
            </View>
          </View>
          <Text style={styles.wasteSub}>this week</Text>
          {history.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <WasteTrend weeks={history} />
            </View>
          )}
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
        <View style={[styles.card, { padding: 16 }]}>
          {history.length > 0
            ? <StreakSection weeks={history} />
            : (
              <View style={styles.streakEmpty}>
                <Text style={styles.streakEmptyEmoji}>🔥</Text>
                <View>
                  <Text style={styles.streakValue}>0 weeks</Text>
                  <Text style={styles.streakSub}>Keep using items before they expire!</Text>
                </View>
              </View>
            )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, marginBottom: 20 },
  back: { fontSize: 15, color: '#6B7F5F', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7566', letterSpacing: 0.8,
    marginBottom: 8, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E8EDE6', marginBottom: 20,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxValue: { fontSize: 28, fontWeight: '700', color: '#2D3319' },
  statBoxLabel: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  statDivider: { width: 1, height: 48, backgroundColor: '#E8EDE6' },
  emptyChart: { fontSize: 13, color: '#A8B89F', textAlign: 'center', paddingVertical: 20 },
  wasteTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wastePercent: { fontSize: 36, fontWeight: '700' },
  wasteSub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  wasteBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  wasteBadgeText: { fontSize: 13, fontWeight: '600' },
  moneyCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  moneyEmoji: { fontSize: 36 },
  moneyAmount: { fontSize: 28, fontWeight: '700', color: '#6B7F5F' },
  moneySub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
  streakEmpty: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  streakEmptyEmoji: { fontSize: 36 },
  streakValue: { fontSize: 22, fontWeight: '700', color: '#2D3319' },
  streakSub: { fontSize: 12, color: '#6B7566', marginTop: 2 },
});

const chart = StyleSheet.create({
  wrapper: {},
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barGroup: { flex: 1, alignItems: 'center' },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 14, borderRadius: 3 },
  valueLabelRow: { flexDirection: 'row', marginTop: 4 },
  valueLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: '#6B7566' },
  labelRow: { flexDirection: 'row', marginTop: 6 },
  axisLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#A8B89F' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#6B7566' },
});

const trend = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 12, color: '#6B7566' },
  pct: { fontSize: 12, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#F2F5F0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

const streakS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fire: { fontSize: 36 },
  info: {},
  count: { fontSize: 22, fontWeight: '700', color: '#2D3319' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 6 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  sub: { fontSize: 11, color: '#6B7566', marginTop: 4 },
});
