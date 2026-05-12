import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { InventoryItem as Item } from '../types';

interface Props {
  item: Item;
  onUse: (newQty: number) => void;
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

function sliderStep(qty: number): number {
  if (qty <= 1) return 0.1;
  if (qty <= 5) return 0.25;
  return 0.5;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export default React.memo(function InventoryItem({ item, onUse, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  // Slider controls amount to USE (0 = use nothing, item.quantity = use all)
  const [useAmount, setUseAmount] = useState(item.quantity / 2);

  const days = daysUntilExpiry(item.expiration_date);
  const color = expiryColor(days);
  const remaining = Math.max(0, item.quantity - useAmount);
  const step = sliderStep(item.quantity);

  function handleOpen() {
    setUseAmount(item.quantity / 2);
    setExpanded(true);
  }

  function handleApply() {
    onUse(Math.max(0, Math.round(remaining * 100) / 100));
    setExpanded(false);
  }

  return (
    <View style={styles.card}>
      {/* Top row: name / qty / expiry */}
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
        </View>
        <Text style={[styles.expiry, { color }]}>{expiryLabel(days)}</Text>
      </View>

      {/* Compact actions */}
      {!expanded && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.useBtn} onPress={handleOpen} activeOpacity={0.8}>
            <Text style={styles.useBtnText}>Use…</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDelete} onPress={onDelete} activeOpacity={0.8}>
            <Text style={styles.btnDeleteText}>🗑</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expanded slider */}
      {expanded && (
        <View style={styles.sliderSection}>
          <View style={styles.sliderLabels}>
            <Text style={styles.labelUsing}>
              Using <Text style={styles.labelValue}>{fmt(useAmount)} {item.unit}</Text>
            </Text>
            <Text style={styles.labelLeft}>
              Left <Text style={styles.labelValue}>{fmt(remaining)} {item.unit}</Text>
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={item.quantity}
            value={useAmount}
            step={step}
            onValueChange={setUseAmount}
            minimumTrackTintColor="#6B7F5F"
            maximumTrackTintColor="#E8EDE6"
            thumbTintColor="#6B7F5F"
          />

          <View style={styles.sliderEdges}>
            <Text style={styles.edgeLabel}>0</Text>
            <Text style={styles.edgeLabel}>{fmt(item.quantity)} {item.unit}</Text>
          </View>

          <View style={styles.sliderActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setExpanded(false)} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, useAmount === 0 && styles.applyBtnDisabled]}
              onPress={handleApply}
              disabled={useAmount === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>
                {useAmount >= item.quantity ? 'Use All' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#2D3319', marginBottom: 2 },
  qty: { fontSize: 13, color: '#6B7566' },
  expiry: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  useBtn: {
    flex: 1,
    backgroundColor: '#6B7F5F',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  useBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDelete: {
    width: 36,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5D0CE',
  },
  btnDeleteText: { fontSize: 14 },
  sliderSection: { gap: 4 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  labelUsing: { fontSize: 12, color: '#6B7566' },
  labelLeft: { fontSize: 12, color: '#6B7566' },
  labelValue: { fontWeight: '700', color: '#2D3319' },
  slider: { width: '100%', height: 36 },
  sliderEdges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    marginBottom: 8,
  },
  edgeLabel: { fontSize: 10, color: '#A8B89F' },
  sliderActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D4DDD0',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7566' },
  applyBtn: {
    flex: 2,
    backgroundColor: '#6B7F5F',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: '#A8B89F' },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
