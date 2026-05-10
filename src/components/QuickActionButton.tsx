import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export default function QuickActionButton({ icon, label, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: '#8B9D83',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
