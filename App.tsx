import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuthContext } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

function RootContent() {
  const { session, loading } = useAuthContext();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B9D83" />
      </View>
    );
  }

  if (!session) {
    return showSignup ? (
      <SignupScreen onNavigateToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginScreen onNavigateToSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
