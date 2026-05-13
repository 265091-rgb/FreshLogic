import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../theme';

interface Props {
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export default function QuickActionButton({ icon, label, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.8}>
      {icon && <>{icon}</>}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 4,
    gap: 8,
    ...Shadow.elevated,
  },
  label: {
    color: Colors.onDark,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
