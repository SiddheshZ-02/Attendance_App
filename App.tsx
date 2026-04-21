import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './src/navigation/Index';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { StyleSheet, AppState, AppStateStatus } from 'react-native';
import { navigationRef } from './src/navigation/navigationRef';
import SessionExpiredModal from './src/components/SessionExpiredModal';
import SessionLifecycle from './src/components/SessionLifecycle';
import { AppSystemProvider } from './src/utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBiometricAppLockEnabled } from './src/services/auth/secureCredentials';
import { STORAGE_KEYS } from './src/constants/app';

const Stack = createNativeStackNavigator();

const GRACE_PERIOD_MS = 30000; // 30 seconds

const App = () => {
  const lastBackgroundTime = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        lastBackgroundTime.current = Date.now();
        // Reset the recent manual login flag so that subsequent backgroundings
        // will trigger the biometric lock after the grace period.
        const { auth } = store.getState();
        if (auth.recentManualLogin) {
          const { setRecentManualLogin } = require('./src/features/auth/authSlice');
          store.dispatch(setRecentManualLogin(false));
        }
      }

      if (nextAppState === 'active' && lastBackgroundTime.current) {
        const elapsed = Date.now() - lastBackgroundTime.current;
        const biometricEnabled = await getBiometricAppLockEnabled();
        const { auth } = store.getState();

        if (
          elapsed > GRACE_PERIOD_MS &&
          biometricEnabled &&
          auth.token &&
          !auth.recentManualLogin
        ) {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Auth' as never, params: { screen: 'Login', params: { mode: 'unlock' } } }],
          });
        }
        lastBackgroundTime.current = null;
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppSystemProvider>
          <SafeAreaView style={styles.safeArea}>
            <NavigationContainer ref={navigationRef}>
              <ToastProvider>
                <SessionExpiredModal />
                <SessionLifecycle />
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Index" component={Index} />
                </Stack.Navigator>
              </ToastProvider>
            </NavigationContainer>
          </SafeAreaView>
        </AppSystemProvider>
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
