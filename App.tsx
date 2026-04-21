import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './src/navigation/Index';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { StyleSheet } from 'react-native';
import { navigationRef } from './src/navigation/navigationRef';
import SessionExpiredModal from './src/components/SessionExpiredModal';
import SessionLifecycle from './src/components/SessionLifecycle';
import { AppSystemProvider } from './src/utils/responsive';

const Stack = createNativeStackNavigator();

const App = () => {
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
