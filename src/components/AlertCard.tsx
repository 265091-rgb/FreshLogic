import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
  severity: 'warning' | 'danger';
}

export default function AlertCard({ message, severity }: Props) {
  const isWarning = severity === 'warning';
  return (
    <View style={[styles.card, isWarning ? styles.warning : styles.danger]}>
      <Text style={styles.icon}>{isWarning ? '⚠️' : '🔴'}</Text>
      <Text style={[styles.text, isWarning ? styles.warningText : styles.dangerText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  warning: {
    backgroundColor: '#FFF8F0',
    borderLeftColor: '#E89B6C',
  },
  danger: {
    backgroundColor: '#FFF2F2',
    borderLeftColor: '#D4635E',
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  warningText: {
    color: '#8B5C2A',
  },
  dangerText: {
    color: '#8B2E2E',
  },
});
