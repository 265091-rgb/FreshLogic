import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🛒 Shopping List</Text>
      <Text style={styles.sub}>List management coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#4A5D43' },
  sub: { fontSize: 14, color: '#6B7566', marginTop: 8 },
});
