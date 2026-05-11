import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingListItem as Item } from '../types';

interface Props {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
}

export default React.memo(function ShoppingListItem({ item, onToggle, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.checkArea} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F5F0',
  },
  checkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A8B89F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6B7F5F',
    borderColor: '#6B7F5F',
  },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 15, color: '#2D3319', flex: 1 },
  nameChecked: { color: '#A8B89F', textDecorationLine: 'line-through' },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#D4635E', fontSize: 14, fontWeight: '600' },
});
