import { StyleSheet } from 'react-native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './src/navigation/Index';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
        <SafeAreaView style={{ flex: 1 }}>
      <ToastProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Index" component={Index} />
            {/* <Stack.Screen   name="App" component={AppNavigator} /> */}
          </Stack.Navigator>
      </ToastProvider>
        </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({});
