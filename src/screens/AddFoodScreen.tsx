import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddFoodScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📷 Add Food</Text>
      <Text style={styles.sub}>Barcode scanner coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#4A5D43' },
  sub: { fontSize: 14, color: '#6B7566', marginTop: 8 },
});
