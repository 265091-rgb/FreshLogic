import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingListItem as Item } from '../types';
import { Colors, Radius } from '../theme';

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
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.onDark, fontSize: 12, fontWeight: '700' },
  name: { fontSize: 15, color: Colors.heading, flex: 1, fontWeight: '400' },
  nameChecked: { color: Colors.muted, textDecorationLine: 'line-through' },
  deleteBtn: { padding: 8 },
  deleteText: { color: Colors.danger, fontSize: 13, fontWeight: '500' },
});
