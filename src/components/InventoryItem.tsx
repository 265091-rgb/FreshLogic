import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { InventoryItem as Item } from '../types';
import { Colors, Radius, Shadow } from '../theme';

interface Props {
  item: Item;
  onUse: (newQty: number) => void;
  onDelete: () => void;
}

// ─── Expiry helpers ───────────────────────────────────────────────────────────

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

// ─── Serving config ───────────────────────────────────────────────────────────

interface ServingConfig {
  step: number;                          // slider step in stored unit
  toServings: (qty: number) => number;   // stored qty → human-readable count
  label: (n: number) => string;          // e.g. "2 cups", "3 eggs", "16 fl oz"
  buttonHint: string;                    // shown on the collapsed Use button
}

function getServingConfig(item: Item): ServingConfig | null {
  const name = item.name.toLowerCase();
  const unit = item.unit.toLowerCase();

  // ── Eggs (any count, step by single egg) ──────────────────────────────────
  if (name.includes('egg') && unit === 'count' && item.quantity >= 1) {
    return {
      step: 1,
      toServings: (q) => Math.round(q),
      label: (n) => n === 1 ? '1 egg' : `${n} eggs`,
      buttonHint: 'by egg',
    };
  }

  // ── Gallons → cups (1 cup = 1/16 gal = 0.0625) ───────────────────────────
  if (unit === 'gallon' && item.quantity >= 0.0625) {
    return {
      step: 0.0625,
      toServings: (q) => Math.round(q / 0.0625),
      label: (n) => n === 1 ? '1 cup' : `${n} cups`,
      buttonHint: 'by cup',
    };
  }

  // ── Litres → cups (1 cup ≈ 0.25 L for clean steps) ──────────────────────
  if (unit === 'l' && item.quantity >= 0.25) {
    return {
      step: 0.25,
      toServings: (q) => Math.round(q / 0.25),
      label: (n) => n === 1 ? '1 cup' : `${n} cups`,
      buttonHint: 'by cup',
    };
  }

  // ── fl oz / oz → cups (8 fl oz = 1 cup); show fl oz too ──────────────────
  if ((unit === 'oz' || unit === 'fl oz') && item.quantity >= 8) {
    return {
      step: 8,
      toServings: (q) => Math.round(q / 8),
      label: (n) => n === 1 ? '8 fl oz (1 cup)' : `${n * 8} fl oz (${n} cups)`,
      buttonHint: 'by cup',
    };
  }

  // ── oz / fl oz < 8 → single fl oz steps ──────────────────────────────────
  if ((unit === 'oz' || unit === 'fl oz') && item.quantity >= 1) {
    return {
      step: 1,
      toServings: (q) => Math.round(q),
      label: (n) => `${n} fl oz`,
      buttonHint: 'by fl oz',
    };
  }

  // ── ml → 250 ml steps (≈ 1 cup) for large; 50 ml for small ───────────────
  if (unit === 'ml' && item.quantity >= 250) {
    return {
      step: 250,
      toServings: (q) => Math.round(q / 250),
      label: (n) => `${n * 250} ml`,
      buttonHint: 'by 250 ml',
    };
  }
  if (unit === 'ml' && item.quantity >= 50) {
    return {
      step: 50,
      toServings: (q) => Math.round(q / 50),
      label: (n) => `${n * 50} ml`,
      buttonHint: 'by 50 ml',
    };
  }

  return null; // fall back to generic decimal slider
}

function defaultStep(qty: number): number {
  if (qty <= 1) return 0.1;
  if (qty <= 5) return 0.25;
  return 0.5;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default React.memo(function InventoryItem({ item, onUse, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [useAmount, setUseAmount] = useState(0);

  const days = daysUntilExpiry(item.expiration_date);
  const color = expiryColor(days);
  const serving = getServingConfig(item);
  // Stored serving_size takes priority over the heuristic
  const step = (item.serving_size && item.serving_size > 0)
    ? item.serving_size
    : serving ? serving.step : defaultStep(item.quantity);
  const remaining = Math.max(0, item.quantity - useAmount);

  // Human-readable labels for slider readout
  const usingLabel = serving
    ? serving.label(serving.toServings(useAmount))
    : `${fmt(useAmount)} ${item.unit}`;
  const leftLabel = serving
    ? serving.label(serving.toServings(remaining))
    : `${fmt(remaining)} ${item.unit}`;

  // Edge labels for min/max ends of the slider
  const edgeMin = serving ? serving.label(0) : '0';
  const edgeMax = serving
    ? serving.label(serving.toServings(item.quantity))
    : `${fmt(item.quantity)} ${item.unit}`;

  function handleOpen() {
    // Default to half when opening (snapped to nearest step)
    const half = Math.round((item.quantity / 2) / step) * step;
    setUseAmount(Math.min(half, item.quantity));
    setExpanded(true);
  }

  function handleApply() {
    onUse(Math.max(0, Math.round(remaining * 1000) / 1000));
    setExpanded(false);
  }

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
        </View>
        <Text style={[styles.expiry, { color }]}>{expiryLabel(days)}</Text>
      </View>

      {/* Collapsed */}
      {!expanded && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.useBtn} onPress={handleOpen} activeOpacity={0.8}>
            <Text style={styles.useBtnText}>
              {serving ? `Use… (${serving.buttonHint})` : 'Use…'}
            </Text>
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
              Using <Text style={styles.labelValue}>{usingLabel}</Text>
            </Text>
            <Text style={styles.labelLeft}>
              Left <Text style={styles.labelValue}>{leftLabel}</Text>
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
            <Text style={styles.edgeLabel}>{edgeMin}</Text>
            <Text style={styles.edgeLabel}>{edgeMax}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E3EAE0',
    shadowColor: '#2D3319', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  top: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#2D3319', marginBottom: 2 },
  qty: { fontSize: 13, color: '#6B7566' },
  expiry: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  useBtn: {
    flex: 1, backgroundColor: '#6B7F5F', borderRadius: 8,
    paddingVertical: 7, alignItems: 'center',
  },
  useBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDelete: {
    width: 36, backgroundColor: '#FFF2F2', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F5D0CE',
  },
  btnDeleteText: { fontSize: 14 },
  sliderSection: { gap: 4 },
  sliderLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2,
  },
  labelUsing: { fontSize: 12, color: '#6B7566' },
  labelLeft: { fontSize: 12, color: '#6B7566' },
  labelValue: { fontWeight: '700', color: '#2D3319' },
  slider: { width: '100%', height: 36 },
  sliderEdges: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: -4, marginBottom: 8,
  },
  edgeLabel: { fontSize: 10, color: '#A8B89F' },
  sliderActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#D4DDD0',
    borderRadius: 8, paddingVertical: 7, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7566' },
  applyBtn: {
    flex: 2, backgroundColor: '#6B7F5F', borderRadius: 8,
    paddingVertical: 7, alignItems: 'center',
  },
  applyBtnDisabled: { backgroundColor: '#A8B89F' },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
