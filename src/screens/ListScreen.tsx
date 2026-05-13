import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import ShoppingListItem from '../components/ShoppingListItem';
import {
  getList, addItem, toggleChecked, removeItem, clearChecked, getCommonItems,
} from '../services/shoppingList.service';
import { ShoppingListItem as Item, InventoryItem } from '../types';
import { getInventory } from '../services/inventory.service';
import { Colors, Radius, Shadow } from '../theme';

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fuzzyMatch(inventoryName: string, query: string): boolean {
  const a = inventoryName.toLowerCase().trim();
  const b = query.toLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

function findInventoryMatch(inventory: InventoryItem[], query: string): InventoryItem | null {
  return inventory.find((i) => i.quantity > 0 && fuzzyMatch(i.name, query)) ?? null;
}

// Alert.alert button callbacks don't fire on Expo Web — use window.confirm there instead
function showConfirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: onConfirm },
    ]);
  }
}

export default function ListScreen() {
  const { supabaseUser } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Item[]>([]);
  const [common, setCommon] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!supabaseUser) return;
    const [list, commonList] = await Promise.all([
      getList(supabaseUser.id),
      getCommonItems(supabaseUser.id),
    ]);
    setItems(list);
    setCommon(commonList);
  }, [supabaseUser]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function performAdd(name: string) {
    if (!supabaseUser) return;
    setAdding(true);
    const optimistic: Item = {
      id: `tmp-${Date.now()}`, user_id: supabaseUser.id, name,
      checked: false, added_from: 'manual', created_at: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setText('');
    try {
      const saved = await addItem(supabaseUser.id, name);
      setItems((prev) => prev.map((i) => (i.id === optimistic.id ? saved : i)));
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      Alert.alert('Error', 'Could not add item.');
    } finally {
      setAdding(false);
    }
  }

  async function handleAdd(name: string) {
    if (!supabaseUser || !name.trim()) return;
    setAdding(true);
    try {
      const inventory = await getInventory(supabaseUser.id);
      const match = findInventoryMatch(inventory, name.trim());
      setAdding(false);
      if (!match) {
        await performAdd(name.trim());
        return;
      }
      // Steps 2 & 3 handled below — alert based on expiry
      const days = daysUntil(match.expiration_date);

      if (days <= 3) {
        showConfirm(
          'Expiring Soon',
          `You have ${match.name} in your fridge but it expires in ${days} day${days !== 1 ? 's' : ''}. Add to shopping list to replace it?`,
          () => performAdd(name.trim()),
        );
      } else {
        showConfirm(
          'Already in Your Fridge',
          `You already have ${match.name} in your fridge! You have ${match.quantity} ${match.unit} — are you sure you need more?`,
          () => performAdd(name.trim()),
        );
      }
    } catch {
      setAdding(false);
      Alert.alert('Error', 'Could not check your inventory. Try again.');
    }
  }

  async function handleToggle(item: Item) {
    const newChecked = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i)));
    try {
      await toggleChecked(item.id, newChecked);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)));
    }

    if (newChecked) {
      Alert.alert(
        'Add to fridge?',
        `Do you want to add "${item.name}" to your fridge inventory?`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Add to Fridge', onPress: () => navigation.navigate('Add', { prefillName: item.name }) },
        ]
      );
    }
  }

  async function handleDelete(item: Item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await removeItem(item.id);
    } catch {
      setItems((prev) => [item, ...prev]);
    }
  }

  async function handleClearChecked() {
    if (!supabaseUser) return;
    const checked = items.filter((i) => i.checked);
    if (!checked.length) return;
    Alert.alert('Clear checked?', `Remove ${checked.length} checked item${checked.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          setItems((prev) => prev.filter((i) => !i.checked));
          try { await clearChecked(supabaseUser.id); } catch { load(); }
        },
      },
    ]);
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked   = items.filter((i) => i.checked);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        {checked.length > 0 && (
          <TouchableOpacity onPress={handleClearChecked}>
            <Text style={styles.clearBtn}>Clear {checked.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add an item…"
          placeholderTextColor={Colors.muted}
          returnKeyType="done"
          onSubmitEditing={() => handleAdd(text)}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.addBtn, (!text.trim() || adding) && styles.addBtnDisabled]}
          onPress={() => handleAdd(text)}
          disabled={!text.trim() || adding}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Commonly purchased */}
      {common.length > 0 && (
        <View style={styles.commonSection}>
          <Text style={styles.commonLabel}>Commonly Purchased</Text>
          <View style={styles.commonPills}>
            {common.map((name) => (
              <TouchableOpacity key={name} style={styles.commonPill} onPress={() => handleAdd(name)}>
                <Text style={styles.commonPillText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ShoppingListItem
            item={item}
            onToggle={() => handleToggle(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items above or tap a common item to get started.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.fog },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
  },
  title:   { fontSize: 24, fontWeight: '800', color: Colors.heading, letterSpacing: -0.5 },
  clearBtn: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 14, gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.heading,
    backgroundColor: Colors.card,
  },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 20, justifyContent: 'center',
    ...Shadow.elevated,
  },
  addBtnDisabled: { backgroundColor: Colors.sagePale },
  addBtnText: { color: Colors.onDark, fontWeight: '700', fontSize: 15 },
  commonSection: { paddingHorizontal: 20, marginBottom: 14 },
  commonLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.muted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  commonPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  commonPill: {
    borderWidth: 1, borderColor: Colors.borderMedium, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.card,
  },
  commonPillText: { fontSize: 13, color: Colors.canopy, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.canopy, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
