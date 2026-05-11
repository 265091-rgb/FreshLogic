import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import ShoppingListItem from '../components/ShoppingListItem';
import {
  getList, addItem, toggleChecked, removeItem, clearChecked, getCommonItems,
} from '../services/shoppingList.service';
import { ShoppingListItem as Item } from '../types';

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

  async function handleAdd(name: string) {
    if (!supabaseUser || !name.trim()) return;
    setAdding(true);
    const optimistic: Item = {
      id: `tmp-${Date.now()}`, user_id: supabaseUser.id, name: name.trim(),
      checked: false, added_from: 'manual', created_at: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setText('');
    try {
      const saved = await addItem(supabaseUser.id, name.trim());
      setItems((prev) => prev.map((i) => (i.id === optimistic.id ? saved : i)));
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      Alert.alert('Error', 'Could not add item.');
    } finally {
      setAdding(false);
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
  const checked = items.filter((i) => i.checked);
  const checkedCount = checked.length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#8B9D83" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Shopping List</Text>
        {checkedCount > 0 && (
          <TouchableOpacity onPress={handleClearChecked}>
            <Text style={styles.clearBtn}>Clear {checkedCount}</Text>
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
          placeholderTextColor="#A8B89F"
          returnKeyType="done"
          onSubmitEditing={() => handleAdd(text)}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.addBtn, (!text.trim() || adding) && styles.addBtnDisabled]}
          onPress={() => handleAdd(text)}
          disabled={!text.trim() || adding}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Commonly purchased */}
      {common.length > 0 && (
        <View style={styles.commonSection}>
          <Text style={styles.commonLabel}>📦 Commonly Purchased</Text>
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
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items above or tap a common item to get started.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#2D3319' },
  clearBtn: { fontSize: 13, color: '#D4635E', fontWeight: '600' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#D4DDD0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#2D3319',
  },
  addBtn: { backgroundColor: '#6B7F5F', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#A8B89F' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  commonSection: { paddingHorizontal: 20, marginBottom: 12 },
  commonLabel: { fontSize: 13, fontWeight: '600', color: '#6B7566', marginBottom: 8 },
  commonPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  commonPill: {
    borderWidth: 1, borderColor: '#A8B89F', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  commonPillText: { fontSize: 13, color: '#4A5D43', fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4A5D43', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6B7566', textAlign: 'center', paddingHorizontal: 32 },
});
