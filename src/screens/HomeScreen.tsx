import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../hooks/useAuth';
import AlertCard from '../components/AlertCard';
import QuickActionButton from '../components/QuickActionButton';
import { getExpiringItems } from '../services/inventory.service';
import { getWeeklyStats } from '../services/stats.service';
import { ExpiringItem, WeeklyStats } from '../types';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
    } catch {
      // silently fail — data stays stale
    }
  }, [supabaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B9D83" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {displayName}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.streak}>🔥 0</Text>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Clock */}
        <View style={styles.clockRow}>
          <Text style={styles.clockTime}>{formatTime(now)}</Text>
          <Text style={styles.clockDate}>{formatDate(now)}</Text>
        </View>

        {/* Alerts */}
        {(criticalItems.length > 0 || soonItems.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📢 Alerts</Text>
            {criticalItems.map((item) => (
              <AlertCard
                key={item.id}
                severity="danger"
                message={
                  item.days_until_expiry === 0
                    ? `${item.name} expires today!`
                    : `${item.name} expires tomorrow`
                }
              />
            ))}
            {soonItems.length > 0 && (
              <AlertCard
                severity="warning"
                message={`${soonItems.length} item${soonItems.length > 1 ? 's' : ''} expiring in ${soonItems[soonItems.length - 1].days_until_expiry} days`}
              />
            )}
          </View>
        )}

        {/* Fridge Illustration */}
        <TouchableOpacity
          style={styles.fridgeBox}
          onPress={() => navigation.navigate('Fridge')}
          activeOpacity={0.85}
        >
          <Text style={styles.fridgeEmoji}>🧊</Text>
          <Text style={styles.fridgeLabel}>Your Fridge</Text>
          <Text style={styles.fridgeSub}>Tap to view inventory</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <QuickActionButton
              icon="📷"
              label="Scan Food"
              onPress={() => navigation.navigate('Add')}
            />
            <QuickActionButton
              icon="🛒"
              label="Shopping List"
              onPress={() => navigation.navigate('List')}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>📊 This Week</Text>
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
              <Text style={[styles.statValue, { color: '#6B7F5F' }]}>
                ${(stats?.money_saved ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#2D3319',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streak: {
    fontSize: 16,
    color: '#2D3319',
    fontWeight: '600',
  },
  settingsBtn: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDE6',
    marginBottom: 16,
  },
  clockRow: {
    marginBottom: 20,
  },
  clockTime: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3319',
  },
  clockDate: {
    fontSize: 14,
    color: '#6B7566',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3319',
    marginBottom: 10,
  },
  fridgeBox: {
    backgroundColor: '#F2F5F0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D4DDD0',
  },
  fridgeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  fridgeLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A5D43',
  },
  fridgeSub: {
    fontSize: 13,
    color: '#6B7566',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  statsCard: {
    backgroundColor: '#F2F5F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4DDD0',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3319',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7566',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#D4DDD0',
  },
});
