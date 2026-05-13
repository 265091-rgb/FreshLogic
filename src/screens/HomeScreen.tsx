import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Camera, ShoppingCart, Settings } from 'lucide-react-native';

import { useAuth } from '../hooks/useAuth';
import AlertCard from '../components/AlertCard';
import { getExpiringItems } from '../services/inventory.service';
import { getWeeklyStats } from '../services/stats.service';
import { ExpiringItem, WeeklyStats } from '../types';
import { Colors, Radius, Shadow } from '../theme';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function HomeScreen() {
  const { profile, supabaseUser } = useAuth();
  const navigation = useNavigation<any>();

  const [now, setNow] = useState(new Date());
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!supabaseUser) return;
    try {
      const [items, weekStats] = await Promise.all([
        getExpiringItems(supabaseUser.id, 7),
        getWeeklyStats(supabaseUser.id),
      ]);
      setExpiringItems(items);
      setStats(weekStats);
    } catch { /* silently fail — stale data is fine */ }
  }, [supabaseUser]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const displayName = profile?.name ?? 'there';
  const criticalItems = expiringItems.filter((i) => i.days_until_expiry <= 1);
  const soonItems = expiringItems.filter((i) => i.days_until_expiry > 1 && i.days_until_expiry <= 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {displayName}</Text>
            <Text style={styles.dateLabel}>{formatDate(now)}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Settings color={Colors.body} size={20} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>

        {/* Time widget */}
        <View style={styles.timeCard}>
          <Text style={styles.clockTime}>{formatTime(now)}</Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>0 week streak</Text>
          </View>
        </View>

        {/* Alerts */}
        {(criticalItems.length > 0 || soonItems.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Alerts</Text>
            {criticalItems.map((item) => (
              <AlertCard
                key={item.id}
                severity="danger"
                message={item.days_until_expiry === 0
                  ? `${item.name} expires today`
                  : `${item.name} expires tomorrow`}
              />
            ))}
            {soonItems.length > 0 && (
              <AlertCard
                severity="warning"
                message={`${soonItems.length} item${soonItems.length > 1 ? 's' : ''} expiring within ${soonItems[soonItems.length - 1].days_until_expiry} days`}
              />
            )}
          </View>
        )}

        {/* Fridge card */}
        <TouchableOpacity
          style={styles.fridgeCard}
          onPress={() => navigation.navigate('Fridge')}
          activeOpacity={0.85}
        >
          <View style={styles.fridgeCardContent}>
            <Text style={styles.fridgeCardTitle}>Your Fridge</Text>
            <Text style={styles.fridgeCardSub}>Tap to view inventory</Text>
          </View>
          <Text style={styles.fridgeArrow}>›</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Add')}
              activeOpacity={0.8}
            >
              <Camera color={Colors.primary} size={22} strokeWidth={1.75} />
              <Text style={styles.actionLabel}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('List')}
              activeOpacity={0.8}
            >
              <ShoppingCart color={Colors.primary} size={22} strokeWidth={1.75} />
              <Text style={styles.actionLabel}>Shopping List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <TouchableOpacity style={styles.statsCard} onPress={() => navigation.navigate('Stats')} activeOpacity={0.85}>
          <Text style={styles.sectionLabel}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.items_added ?? 0}</Text>
              <Text style={styles.statLabel}>Added</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.items_used ?? 0}</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statValueGreen]}>
                ${(stats?.money_saved ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.fog },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.heading,
    letterSpacing: -0.6,
  },
  dateLabel: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 3,
    fontWeight: '400',
  },
  settingsBtn: { padding: 4, marginTop: 4 },

  timeCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    ...Shadow.elevated,
  },
  clockTime: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.onDark,
    letterSpacing: -1,
  },
  streakPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  streakText: { fontSize: 12, color: Colors.onDark, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  fridgeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  fridgeCardContent: {},
  fridgeCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.heading,
    letterSpacing: -0.2,
  },
  fridgeCardSub: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 3,
  },
  fridgeArrow: { fontSize: 22, color: Colors.muted, fontWeight: '300' },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  actionLabel: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  statsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.heading,
    letterSpacing: -0.5,
  },
  statValueGreen: { color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 3, fontWeight: '500' },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.borderLight,
  },
});
