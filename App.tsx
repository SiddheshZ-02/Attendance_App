import React, { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './src/navigation/Index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { View, Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from './src/hooks/reduxHooks';
import { logout, setSessionExpired } from './src/features/auth/authSlice';
import { navigationRef } from './src/navigation/navigationRef';

const Stack = createNativeStackNavigator();

const SessionExpiredModal = () => {
  const dispatch = useAppDispatch();
  const { sessionExpired, sessionExpiredMessage } = useAppSelector(
    s => s.auth,
  );
  const handleOk = useCallback(async () => {
    await dispatch(logout()).unwrap().catch(() => {});
    dispatch(setSessionExpired(null));
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Index' as never }],
      });
    }
  }, [dispatch]);
  return (
    <Modal
      visible={sessionExpired}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Session Expired</Text>
          <Text style={styles.message}>
            {sessionExpiredMessage || 'Please sign in again.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleOk}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
