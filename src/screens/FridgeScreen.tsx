import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import InventoryItem from '../components/InventoryItem';
import { getInventory, updateItemQuantity, deleteItem } from '../services/inventory.service';
import { InventoryItem as Item } from '../types';
import { Colors, Radius, Shadow } from '../theme';

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface Section {
  key: 'soon' | 'week' | 'fresh';
  label: string;
  accentColor: string;
  bg: string;
  items: Item[];
}

export default function FridgeScreen() {
  const { supabaseUser, profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState({ soon: true, week: true, fresh: true });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = useCallback(async () => {
    if (!supabaseUser) return;
    try {
      const data = await getInventory(supabaseUser.id);
      setItems(data);
    } catch { /* keep stale data */ }
  }, [supabaseUser]);

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function onSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  }

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, debouncedSearch]);

  const sections: Section[] = useMemo(() => {
    const soon: Item[] = [];
    const week: Item[] = [];
    const fresh: Item[] = [];

    filtered.forEach((item) => {
      if (item.quantity <= 0) return;
      const d = daysUntil(item.expiration_date);
      if (d <= 3) soon.push(item);
      else if (d <= 7) week.push(item);
      else fresh.push(item);
    });

    return [
      { key: 'soon',  label: 'Expiring Soon',    accentColor: Colors.danger,  bg: Colors.dangerBg,  items: soon  },
      { key: 'week',  label: 'This Week',         accentColor: Colors.warning, bg: Colors.warningBg, items: week  },
      { key: 'fresh', label: 'Good for a While',  accentColor: Colors.primary, bg: Colors.glass,     items: fresh },
    ];
  }, [filtered]);

  function toggleSection(key: Section['key']) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleUse(item: Item, newQty: number) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
    try {
      await updateItemQuantity(item.id, newQty);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i)));
    }
  }

  async function handleDelete(item: Item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteItem(item.id);
    } catch {
      setItems((prev) => [...prev, item]);
    }
  }

  const totalItems = items.filter((i) => i.quantity > 0).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {profile?.name ? `${profile.name}'s Fridge` : 'My Fridge'}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{totalItems}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search color={Colors.muted} size={16} strokeWidth={1.75} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {sections.every((s) => s.items.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{debouncedSearch ? 'No results' : 'Your fridge is empty'}</Text>
            <Text style={styles.emptySub}>
              {debouncedSearch
                ? `Nothing matched "${debouncedSearch}"`
                : 'Scan a barcode or add items manually to get started.'}
            </Text>
          </View>
        ) : (
          sections.map((section) => section.items.length === 0 ? null : (
            <View key={section.key} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.key)}
                activeOpacity={0.75}
              >
                <View style={styles.sectionLeft}>
                  <View style={[styles.sectionDot, { backgroundColor: section.accentColor }]} />
                  <Text style={[styles.sectionLabel, { color: section.accentColor }]}>{section.label}</Text>
                  <View style={[styles.badge, { backgroundColor: section.accentColor }]}>
                    <Text style={styles.badgeText}>{section.items.length}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{openSections[section.key] ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {openSections[section.key] && (
                <View style={styles.itemList}>
                  {section.items.map((item) => (
                    <InventoryItem
                      key={item.id}
                      item={item}
                      onUse={(newQty) => handleUse(item, newQty)}
                      onDelete={() => handleDelete(item)}
                    />
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.fog },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.heading, letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: Colors.glass,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  countText: { fontSize: 13, fontWeight: '700', color: Colors.canopy },
  searchRow: { paddingHorizontal: 20, paddingBottom: 14 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.heading,
  },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 6,
  },
  sectionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot:   { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: { color: Colors.onDark, fontSize: 11, fontWeight: '700' },
  chevron:   { fontSize: 10, color: Colors.muted },
  itemList:  {},
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.canopy, marginBottom: 8 },
  emptySub:  { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
