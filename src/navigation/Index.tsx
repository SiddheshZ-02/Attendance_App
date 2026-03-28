import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import { useAppDispatch } from '../hooks/reduxHooks';
import { bootstrapSession } from '../features/auth/authSlice';

const Stack = createNativeStackNavigator();

/**
 * Index — the root of the navigation tree.
 *
 * Responsibilities:
 *  1. Dispatch bootstrapSession on mount (reads Keychain locally, < 100ms).
 *  2. Render AuthNavigator, which starts with Login.
 *     Login.tsx watches auth.checkingSession — it plays the splash animation
 *     while waiting and then routes to Tab or shows the form based on the
 *     bootstrapped session state.
 *
 * Why dispatch here and not in Login.tsx?
 *  — Index mounts before any screen renders, so the Keychain read starts
 *    at the earliest possible moment. By the time Login.tsx mounts and
 *    its 1-second animation completes, bootstrapSession is already done.
 */
const Index = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
    </Stack.Navigator>
  );
};

export default Index;
