import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import InventoryItem from '../components/InventoryItem';
import { getInventory, updateItemQuantity, deleteItem } from '../services/inventory.service';
import { InventoryItem as Item } from '../types';

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface Section {
  key: 'soon' | 'week' | 'fresh';
  label: string;
  emoji: string;
  color: string;
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
    } catch {
      // keep stale data
    }
  }, [supabaseUser]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

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
      { key: 'soon', label: 'Expiring Soon', emoji: '🔴', color: '#D4635E', bg: '#FFF2F2', items: soon },
      { key: 'week', label: 'This Week', emoji: '🟠', color: '#E89B6C', bg: '#FFF8F0', items: week },
      { key: 'fresh', label: 'Good for a While', emoji: '🟢', color: '#6B7F5F', bg: '#F2F5F0', items: fresh },
    ];
  }, [filtered]);

  function toggleSection(key: Section['key']) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleUseHalf(item: Item) {
    const newQty = Math.max(0, item.quantity / 2);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
    try {
      await updateItemQuantity(item.id, newQty);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i)));
    }
  }

  async function handleUseAll(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: 0 } : i)));
    try {
      await updateItemQuantity(item.id, 0);
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
        <ActivityIndicator size="large" color="#8B9D83" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧊 {profile?.name ? `${profile.name}'s Fridge` : 'My Fridge'}</Text>
        <Text style={styles.count}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#A8B89F"
          value={search}
          onChangeText={onSearchChange}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B9D83" />}
      >
        {totalItems === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧊</Text>
            <Text style={styles.emptyTitle}>Your fridge is empty</Text>
            <Text style={styles.emptySub}>Scan a barcode or add items manually to get started.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.key} style={styles.section}>
              {/* Section header */}
              <TouchableOpacity
                style={[styles.sectionHeader, { backgroundColor: section.bg }]}
                onPress={() => toggleSection(section.key)}
                activeOpacity={0.8}
              >
                <View style={styles.sectionLeft}>
                  <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                  <Text style={[styles.sectionLabel, { color: section.color }]}>{section.label}</Text>
                  <View style={[styles.badge, { backgroundColor: section.color }]}>
                    <Text style={styles.badgeText}>{section.items.length}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{openSections[section.key] ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Items */}
              {openSections[section.key] && (
                <View style={styles.itemList}>
                  {section.items.length === 0 ? (
                    <Text style={styles.sectionEmpty}>No items here</Text>
                  ) : (
                    section.items.map((item) => (
                      <InventoryItem
                        key={item.id}
                        item={item}
                        onUseHalf={() => handleUseHalf(item)}
                        onUseAll={() => handleUseAll(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    ))
                  )}
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
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  count: { fontSize: 13, color: '#6B7566' },
  searchRow: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#F2F5F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#2D3319',
    borderWidth: 1,
    borderColor: '#E8EDE6',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionEmoji: { fontSize: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700' },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 11, color: '#6B7566' },
  itemList: {},
  sectionEmpty: {
    fontSize: 13,
    color: '#A8B89F',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4A5D43', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7566', textAlign: 'center', paddingHorizontal: 32 },
});
