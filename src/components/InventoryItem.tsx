import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InventoryItem as Item } from '../types';

interface Props {
  item: Item;
  onUseHalf: () => void;
  onUseAll: () => void;
  onDelete: () => void;
}

function daysUntilExpiry(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function expiryLabel(days: number | null): string {
  if (days === null) return 'No expiry';
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function expiryColor(days: number | null): string {
  if (days === null) return '#6B7566';
  if (days <= 1) return '#D4635E';
  if (days <= 7) return '#E89B6C';
  return '#6B7F5F';
}

export default React.memo(function InventoryItem({ item, onUseHalf, onUseAll, onDelete }: Props) {
  const days = daysUntilExpiry(item.expiration_date);
  const color = expiryColor(days);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
        </View>
        <Text style={[styles.expiry, { color }]}>{expiryLabel(days)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnHalf} onPress={onUseHalf} activeOpacity={0.8}>
          <Text style={styles.btnHalfText}>Use Half</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAll} onPress={onUseAll} activeOpacity={0.8}>
          <Text style={styles.btnAllText}>Use All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDelete} onPress={onDelete} activeOpacity={0.8}>
          <Text style={styles.btnDeleteText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8EDE6',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3319',
    marginBottom: 2,
  },
  qty: {
    fontSize: 13,
    color: '#6B7566',
  },
  expiry: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnHalf: {
    flex: 1,
    backgroundColor: '#F2F5F0',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4DDD0',
  },
  btnHalfText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5D43',
  },
  btnAll: {
    flex: 1,
    backgroundColor: '#6B7F5F',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  btnAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  btnDelete: {
    width: 36,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5D0CE',
  },
  btnDeleteText: {
    fontSize: 14,
  },
});
