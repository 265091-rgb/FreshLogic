import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuthContext } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';

function RootContent() {
  const { session, loading } = useAuthContext();
  const [showSignup, setShowSignup] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) { setOnboardingDone(null); return; }
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => setOnboardingDone(v === 'true'));
  }, [session]);

  if (loading || (session && onboardingDone === null)) {
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

  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer>
      <OfflineBanner />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootContent />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
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
