import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon1 from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';

// Device info collection removed per user request
import { getCurrentLocation } from '../../services/location/locationService';
import { API_CONFIG } from '../../services/api/apiConfig';

const Login = () => {
  const navigation = useNavigation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // checking stored token
  const [loadingMessage, setLoadingMessage] = useState('Logging in...');

  // ── Check AsyncStorage on mount ────────────────────────────────
  // If a valid token already exists → skip login → go to Tab
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        // No token — show login form
        setIsCheckingAuth(false);
        return;
      }

      // Verify token is still valid with backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Token valid — update stored user data with fresh data
        const user = data.data;
        await AsyncStorage.multiSet([
          ['userName', user.name || ''],
          ['userEmail', user.email || ''],
          ['userRole', user.role || ''],
          ['employeeId', user.employeeId || ''],
          ['department', user.department || ''],
        ]);

        console.log('✅ Session valid — auto navigating');
        navigation.reset({ index: 0, routes: [{ name: 'Tab' as never }] });
      } else {
        // Token expired or invalid — clear storage, show login
        console.log('⚠️ Session expired — clearing storage');
        await clearStorage();
        setIsCheckingAuth(false);
      }
    } catch (error) {
      // Network error or server down — still show login form
      console.warn('⚠️ Session check failed (network):', error);
      setIsCheckingAuth(false);
    }
  };

  const clearStorage = async () => {
    await AsyncStorage.multiRemove([
      'authToken',
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'employeeId',
      'department',
      // 'deviceFingerprint' - removed per user request
    ]);
  };

  // ── Validation ─────────────────────────────────────────────────
  const validateInputs = () => {
    if (!email.trim()) {
      toast.show('Please enter your email', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.show('Please enter a valid email', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
      return false;
    }
    if (!password.trim()) {
      toast.show('Please enter your password', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
      return false;
    }
    if (password.length < 6) {
      toast.show('Password must be at least 6 characters', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  // ── Main Login Handler ─────────────────────────────────────────
  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      // STEP 1 — Skip device info collection (removed per user request)

      // STEP 2 — Location (optional)
      // setLoadingMessage('Getting location...');
      const location = await getCurrentLocation();
      console.log(
        location ? '✅ Location collected' : '⚠️ Location not available',
      );

      // STEP 3 — Call /api/auth/login
      // setLoadingMessage('Authenticating...');
      const loginData = {
        email: email.trim().toLowerCase(),
        password,
        location: location
          ? {
              latitude: (location as any).latitude,
              longitude: (location as any).longitude,
              accuracy: (location as any).accuracy,
            }
          : null,
      };

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        },
      );

      const data = await response.json();
      console.log('📥 Response:', { success: data.success, code: data.code });

      // STEP 4 — Handle response
      if (data.success) {
        setLoadingMessage('Login successful!');

        // Save all user data to AsyncStorage
        await AsyncStorage.multiSet([
          ['authToken', data.data.token],
          ['userId', data.data._id],
          ['userName', data.data.name],
          ['userEmail', data.data.email],
          ['userRole', data.data.role],
          ['employeeId', data.data.employeeId || ''],
          ['department', data.data.department || ''],
          // deviceFingerprint removed per user request
        ]);
        console.log('✅ User data saved to storage');

        // Show warnings if any
        if (data.warnings?.newDevice) {
          setTimeout(() => {
            Alert.alert(
              '🔒 New Device Detected',
              "This device has been registered. If this wasn't you, contact support immediately.",
              [{ text: 'OK' }],
            );
          }, 500);
        }
        if (data.warnings?.suspiciousLocation) {
          setTimeout(() => {
            Alert.alert(
              '⚠️ Unusual Location',
              data.warnings.message || 'Unusual login location detected.',
              [{ text: 'OK' }],
            );
          }, 1000);
        }

        toast.show(`Welcome back, ${data.data.name}!`, {
          type: 'success',
          placement: 'top',
          duration: 3000,
        });

        setTimeout(() => navigation.navigate('Tab' as never), 500);
      } else {
        handleLoginError(data);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.show('Login failed. Please check your internet connection.', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('Logging in...');
    }
  };

  // ── Error Handler ──────────────────────────────────────────────
  const handleLoginError = (data: any) => {
    switch (data.code) {
      case 'MISSING_CREDENTIALS':
        toast.show('Please enter email and password', {
          type: 'warning',
          placement: 'top',
          duration: 3000,
        });
        break;
      case 'INVALID_CREDENTIALS':
        toast.show('Invalid email or password.', {
          type: 'danger',
          placement: 'top',
          duration: 3000,
        });
        break;
      case 'ACCOUNT_INACTIVE':
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. Please contact HR.',
          [{ text: 'OK' }],
        );
        break;
      // ACCOUNT_LOCKED handling removed - unlimited login attempts
      // MAX_DEVICES_REACHED handling removed - unlimited devices allowed
      // DEVICE_INFO_REQUIRED case removed - device info no longer collected
      default:
        toast.show(data.message || 'Login failed. Please try again.', {
          type: 'danger',
          placement: 'top',
          duration: 3000,
        });
    }
  };

  // ── Splash screen while checking saved session ─────────────────
  if (isCheckingAuth) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#252525" />
        <Text style={styles.splashText}>Checking session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          <View style={styles.form}>
            <Text style={styles.heading}>Login</Text>

            {/* Email */}
            <View style={styles.field}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#aaa"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Icon name="user" size={20} color="#d2d0d0ff" />
            </View>

            {/* Password */}
            <View style={styles.field}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry={!isPasswordVisible}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                disabled={isLoading}
              >
                <Icon1
                  name={isPasswordVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color="#d2d0d0ff"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.btnText, { marginLeft: 10 }]}>
                      {loadingMessage}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotBtn} disabled={isLoading}>
              {/* <Text style={styles.forgotText}>Forgot Password?</Text> */}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashText: {
    fontSize: 15,
    color: 'grey',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '85%',
    backgroundColor: '#d2d0d0ff',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  heading: {
    textAlign: 'center',
    marginVertical: 24,
    color: '#222',
    fontSize: 30,
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderRadius: 25,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 5,
    paddingRight: 30,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#111',
    fontSize: 15,
  },
  btnRow: {
    justifyContent: 'center',
    marginTop: 30,
  },
  button: {
    backgroundColor: '#252525',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
  },
  forgotBtn: {
    marginTop: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  forgotText: {
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
});
