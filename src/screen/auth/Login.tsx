import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { useToast } from 'react-native-toast-notifications';
import { getCurrentLocation } from '../../services/location/locationService';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { checkSession, login } from '../../features/auth/authSlice';
import EMSLogo from '../../assets/svg/EMS.svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Login = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Logging in...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Phase management
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isSessionCheckDone, setIsSessionCheckDone] = useState(false);
  const hasNavigated = useRef(false);

  // Animated values
  const logoY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const logoScale = useRef(new Animated.Value(1.5)).current;
  const formY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const isLoading = auth.status === 'loading';

  useEffect(() => {
    // 1. Initial Logo Animation: Bottom to Center
    Animated.parallel([
      Animated.timing(logoY, {
        toValue: SCREEN_HEIGHT / 2 - 100,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.2,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSplashDone(true);
    });

    // 2. Perform Session Check
    dispatch(checkSession()).finally(() => {
      setIsSessionCheckDone(true);
    });
  }, []);

  // 3. Coordinate transitions
  useEffect(() => {
    if (isSplashDone && isSessionCheckDone && !hasNavigated.current) {
      if (auth.token && auth.user) {
        // SESSION VALID
        hasNavigated.current = true;
        // Optional: Small delay to show logo at center
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Tab' as never }],
          });
        }, 200);
      } else {
        // SESSION INVALID -> Transition to Login Form
        setShowForm(true);
        Animated.parallel([
          // Logo to top
          Animated.timing(logoY, {
            toValue: 60,
            duration: 800,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          // Form from bottom
          Animated.timing(formY, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isSplashDone, isSessionCheckDone, auth.token, auth.user]);

  // Handle successful manual login transition
  useEffect(() => {
    if (auth.token && auth.user && showForm && !hasNavigated.current) {
      hasNavigated.current = true;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tab' as never }],
      });
    }
  }, [auth.token, auth.user, showForm]);

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
    if (isSubmitting || isLoading) return;
    Keyboard.dismiss();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    setLoadingMessage('Getting location...');

    try {
      const location = await getCurrentLocation();
      setLoadingMessage('Logging in...');
      console.log(
        location ? '✅ Location collected' : '⚠️ Location not available',
      );

      const result = await dispatch(
        login({
          email,
          password,
          location: location
            ? {
                latitude: (location as any).latitude,
                longitude: (location as any).longitude,
                accuracy: (location as any).accuracy,
              }
            : null,
        }),
      ).unwrap(); // result contains token and refreshToken

      setLoadingMessage('Login successful!');

      if ((result as any).warnings?.newDevice) {
        setTimeout(() => {
          Alert.alert(
            '🔒 New Device Detected',
            "This device has been registered. If this wasn't you, contact support immediately.",
            [{ text: 'OK' }],
          );
        }, 500);
      }
      if ((result as any).warnings?.suspiciousLocation) {
        setTimeout(() => {
          Alert.alert(
            '⚠️ Unusual Location',
            result.warnings?.message || 'Unusual login location detected.',
            [{ text: 'OK' }],
          );
        }, 1000);
      }

      toast.show(`Welcome back, ${result.user.name}!`, {
        type: 'success',
        placement: 'top',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      if (error && (error.code || error.message)) {
        handleLoginError(error);
      } else {
        toast.show('Login failed. Please check your internet connection.', {
          type: 'danger',
          placement: 'top',
          duration: 4000,
        });
      }
    } finally {
      setIsSubmitting(false);
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

      default:
        toast.show(data.message || 'Login failed. Please try again.', {
          type: 'danger',
          placement: 'top',
          duration: 3000,
        });
    }
  };

  // ── Splash screen while checking saved session ─────────────────
  // We handle it in the main return with animations now.

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullFlex}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ translateY: logoY }, { scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoShadow}>
              <EMSLogo width={100} height={100} />
            </View>
            <Text style={styles.splashText}>Employee Managment System</Text>
          </Animated.View>

          {/* Animated Login Form */}
          {showForm && (
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formY }],
                },
              ]}
            >
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
                    style={[
                      styles.button,
                      (isLoading || isSubmitting) && styles.buttonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={isLoading || isSubmitting}
                  >
                    {isLoading || isSubmitting ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={[styles.btnText, styles.btnTextSpacing]}>
                          {loadingMessage}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.btnText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotBtn}
                  disabled={isLoading}
                ></TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  fullFlex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  formContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.28, // Fixed position from top
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
  },
  heading: {
    textAlign: 'center',
    marginVertical: 24,
    color: '#222',
    fontSize: 30,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  btnTextSpacing: {
    marginLeft: 10,
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
  splashText: {
    fontSize: 20,
    fontWeight: '700',
    paddingTop: 14,
    maxWidth: '60%',
    textAlign: 'center',
    color: '#333',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
