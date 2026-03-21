import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './src/navigation/Index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { StyleSheet } from 'react-native';
import { navigationRef } from './src/navigation/navigationRef';
import SessionExpiredModal from './src/components/SessionExpiredModal';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaView style={styles.safeArea}>
        <NavigationContainer ref={navigationRef}>
          <ToastProvider>
            <SessionExpiredModal />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Index" component={Index} />
            </Stack.Navigator>
          </ToastProvider>
        </NavigationContainer>
      </SafeAreaView>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
