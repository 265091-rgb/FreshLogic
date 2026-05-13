import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme';

interface Props {
  message: string;
  severity: 'warning' | 'danger';
}

export default function AlertCard({ message, severity }: Props) {
  const isWarning = severity === 'warning';
  return (
    <View style={[styles.card, isWarning ? styles.warning : styles.danger]}>
      <View style={[styles.dot, isWarning ? styles.dotWarning : styles.dotDanger]} />
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
    borderRadius: Radius.md,
    padding: 13,
    paddingLeft: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    gap: 10,
  },
  warning: {
    backgroundColor: Colors.warningBg,
    borderLeftColor: Colors.warning,
  },
  danger: {
    backgroundColor: Colors.dangerBg,
    borderLeftColor: Colors.danger,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  dotWarning: { backgroundColor: Colors.warning },
  dotDanger: { backgroundColor: Colors.danger },
  text: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  warningText: { color: Colors.warningText },
  dangerText:  { color: Colors.dangerText },
});
