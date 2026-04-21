import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useToast } from 'react-native-toast-notifications';
import { getCurrentLocation } from '../../services/location/locationService';
import { getBiometricAppLockEnabled } from '../../services/auth/secureCredentials';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { login, validateSession, setBiometricEnabled, setRecentManualLogin } from '../../features/auth/authSlice';
import EMSLogo from '../../assets/svg/EMS.svg';
import { createThemedStyles, useResponsive } from '../../utils/responsive';
import * as Keychain from 'react-native-keychain';


const Login = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const { hp, wp, SCREEN, containerMaxWidth } = useResponsive();
  const styles = useStyles();

  const isUnlockMode = route.params?.mode === 'unlock';
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [canLoginWithBiometric, setCanLoginWithBiometric] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Logging in...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showUnlockUI, setShowUnlockModeUI] = useState(isUnlockMode);

  // Ref to forward keyboard focus from email → password
  const passwordRef = useRef<TextInput>(null);

  // Phase management
  // isSplashDone — true when the 1-second logo animation completes.
  // We wait for BOTH the animation AND auth.checkingSession=false (Keychain
  // read done) before deciding to navigate or show the form.
  const [isSplashDone, setIsSplashDone] = useState(false);
  const hasNavigated = useRef(false);

  // Animated values
  const logoY = useRef(new Animated.Value(SCREEN.height)).current;
  const logoScale = useRef(new Animated.Value(1.5)).current;
  const formY = useRef(new Animated.Value(SCREEN.height)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const isLoading = auth.status === 'loading';

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const isEnabled = await getBiometricAppLockEnabled();
    const supportedType = await Keychain.getSupportedBiometryType();
    
    if (isEnabled && supportedType) {
      setCanLoginWithBiometric(true);
      setBiometricType(supportedType === Keychain.BIOMETRY_TYPE.FACE_ID ? 'Face ID' : 'Fingerprint');
      dispatch(setBiometricEnabled(true));
    }
  };

  const handleBiometricLogin = async () => {
    // If already submitting manual login or already navigating, don't trigger biometric
    if (isSubmitting || hasNavigated.current) return;

    try {
      const creds = await Keychain.getGenericPassword({
        authenticationPrompt: {
          title: 'Unlock App',
          subtitle: 'Please authenticate to continue',
          cancel: 'Cancel',
        },
      });

      if (creds) {
        // Success - navigate to Tab
        hasNavigated.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tab' as never }],
        });

        // Parse token from keychain password field
        try {
          const parsed = JSON.parse(creds.password);
          if (parsed && parsed.token) {
            dispatch(validateSession(parsed.token));
          } else {
            dispatch(validateSession());
          }
        } catch {
          dispatch(validateSession());
        }
      }
    } catch (error) {
      console.log('Biometric login failed', error);
      if (isUnlockMode) {
        toast.show('Biometric authentication failed. Please use password.', { type: 'danger' });
      }
    }
  };

  // Centralized Biometric Auto-Trigger
  useEffect(() => {
    // DO NOT trigger if:
    // 1. Biometric is not enabled
    // 2. Already navigated or navigating
    // 3. In the middle of manual login submission
    // 4. User JUST logged in manually (recentManualLogin is true)
    // 5. Manual login form is visible (means user is choosing to type)
    if (!canLoginWithBiometric || hasNavigated.current || isSubmitting || auth.recentManualLogin || showForm) {
      return;
    }

    // Trigger ONLY in these specific scenarios:
    const isStartupSession = auth.token && auth.user && !auth.checkingSession;
    const isAuthTransition = isUnlockMode || auth.isIntentionalLogout || auth.sessionExpired;

    if (isStartupSession || isAuthTransition) {
      // Small delay for smooth UI transition
      const timer = setTimeout(() => {
        // Double check flags before calling
        if (!hasNavigated.current && !isSubmitting && !showForm) {
          handleBiometricLogin();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    canLoginWithBiometric,
    isUnlockMode,
    auth.isIntentionalLogout,
    auth.sessionExpired,
    auth.token,
    auth.user,
    auth.checkingSession,
    auth.recentManualLogin,
    showForm,
    isSubmitting
  ]);

  useEffect(() => {
    // 1. Initial Logo Animation: Bottom to Center
    Animated.parallel([
      Animated.timing(logoY, {
        toValue: SCREEN.height / 2 - hp(100),
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

    // 2. Session check is handled by bootstrapSession dispatched in Index.tsx.
    //    It reads Keychain locally (< 100ms) and sets auth.checkingSession=false.
    //    By the time this 1-second animation ends, the session is already known.
  }, []);

  // 3. Coordinate transitions.
  //
  // We wait for two things:
  //   a) isSplashDone        — the 1-second logo animation is complete
  //   b) !auth.checkingSession — bootstrapSession (Keychain read) is complete
  //
  // Because checkingSession starts as TRUE and the Keychain read takes < 100ms,
  // there is zero race-condition: the animation always finishes AFTER the read.
  useEffect(() => {
    if (isSplashDone && !auth.checkingSession && !hasNavigated.current) {
      if (auth.token && auth.user) {
        // If form is showing, it means we are in the middle of a manual login process
        // or the user just logged in manually. We should NOT trigger biometric auto-prompt here.
        if (showForm) return;

        // SESSION VALID — navigate instantly
        // Biometric prompt is now handled by the centralized useEffect above.
        // If biometric is NOT enabled or user just logged in manually, navigate instantly.
        if (!canLoginWithBiometric || auth.recentManualLogin) {
          hasNavigated.current = true;
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Tab' as never }],
            });
            dispatch(validateSession());
          }, 200);
        }
      } else {
        // NO SESSION — animate the form in (identical animation as before)
        setShowForm(true);
        Animated.parallel([
          // Logo moves up
          Animated.timing(logoY, {
            toValue: hp(60),
            duration: 800,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          // Form slides up from bottom
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
  }, [isSplashDone, auth.checkingSession, auth.token, auth.user, canLoginWithBiometric]);

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
      dispatch(setRecentManualLogin(true));
    } catch (error: any) {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullFlex}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar backgroundColor="#FFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                <EMSLogo width={wp(80)} height={wp(80)} />
              </View>
              <Text style={styles.splashText}>Employee Management System</Text>
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
                <View
                  style={[
                    styles.form,
                    containerMaxWidth ? { maxWidth: containerMaxWidth } : null,
                  ]}
                >
                  {showUnlockUI ? (
                    <View style={styles.unlockContainer}>
                      <Text style={styles.heading}>Unlock App</Text>
                      <Text style={styles.unlockSubtitle}>Welcome back! Please unlock to continue.</Text>
                      
                      <TouchableOpacity 
                        style={styles.biometricBigButton} 
                        onPress={handleBiometricLogin}
                      >
                        <Ionicons name="finger-print-sharp" size={wp(80)} color="#0A1F4A" />
                        <Text style={styles.biometricButtonText}>Tap to Scan {biometricType}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.usePasswordLink}
                        onPress={() => setShowUnlockModeUI(false)}
                      >
                        <Text style={styles.usePasswordText}>Use password instead</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.heading}>Login</Text>

                      {/* Email */}
                      <View style={styles.inputLabelContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                      </View>
                      <View style={styles.field}>
                        <Icon name="envelope-o" size={wp(18)} color={'#0A1F4A'} />
                        <TextInput
                          placeholder="Enter your email"
                          placeholderTextColor="#5A6272"
                          style={styles.input}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!isLoading}
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                          blurOnSubmit={false}
                        />
                      </View>

                      {/* Password */}
                      <View style={styles.inputLabelContainer}>
                        <Text style={styles.inputLabel}>Password</Text>
                      </View>
                      <View style={styles.field}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={wp(18)}
                          color={'#0A1F4A'}
                        />
                        <TextInput
                          ref={passwordRef}
                          placeholder="Enter your password"
                          placeholderTextColor="#5A6272"
                          secureTextEntry={!isPasswordVisible}
                          style={styles.input}
                          value={password}
                          onChangeText={setPassword}
                          editable={!isLoading}
                          returnKeyType="done"
                          onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                          disabled={isLoading}
                        >
                          <Ionicons
                            name={
                              isPasswordVisible ? 'eye-outline' : 'eye-off-outline'
                            }
                            size={wp(20)}
                            color={'#0A1F4A'}
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
                          activeOpacity={0.8}
                        >
                          {isLoading || isSubmitting ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                              <Text style={[styles.btnText, styles.btnTextSpacing]}>
                                {loadingMessage}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.btnText}>Login</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                    </>
                  )}
                </View>
              </Animated.View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

const useStyles = createThemedStyles(
  (colors, { radius, spacing, hp, wp, fp }) => {
    return {
      fullFlex: { flex: 1 },
      scrollContainer: {
        flexGrow: 1,
      },
      container: {
        flex: 1,
        backgroundColor: colors.background,
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
        paddingTop: hp(220), // Scaled to start below animated logo
      },
      form: {
        width: '90%',
        backgroundColor: '#0A1F4A', // Enterprise Dark Blue
        borderRadius: radius.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.lg,
        borderWidth: 1,
        borderColor: '#0D2B5E',
        shadowColor: '#000',
        // shadowOffset: { width: 0, height: hp(10) },
        // shadowOpacity: 0.3,
        // shadowRadius: wp(15),
        // elevation: 10,
      },
      heading: {
        textAlign: 'center',
        marginVertical: spacing.md,
        color: '#FFF',
        fontSize: fp(28),
        fontWeight: '700',
        letterSpacing: 0.5,
      },
      subHeading: {
        textAlign: 'center',
        color: '#00AACC',
        fontSize: fp(14),
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
        fontWeight: '400',
      },
      inputLabelContainer: {
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
      },
      inputLabel: {
        color: '#fff',
        fontSize: fp(13),
        fontWeight: '600',
        opacity: 0.9,
      },
      field: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: '#0A1F4A',
        //  // Darker blue for inputs
        backgroundColor: '#F4F6F8',
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.xs,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#0D2B5E',
      },
      fieldFocused: {
        borderColor: '#00D4FF',
        backgroundColor: '#0E3A6E',
        shadowColor: '#00D4FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: wp(4),
        elevation: 4,
      },
      input: {
        flex: 1,
        marginLeft: spacing.sm,
        color: '#0A1F4A',
        fontSize: fp(15),
      },
      btnRow: {
        justifyContent: 'center',
        marginTop: spacing.md,
      },
      button: {
        backgroundColor: '#6B7280', // Primary action color
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
        // shadowColor: '#00D4FF',
        // shadowOffset: { width: 0, height: hp(4) },
        // shadowOpacity: 0.3,
        // shadowRadius: wp(6),
        // elevation: 6,
      },
      buttonDisabled: {
        backgroundColor: '#0E3A6E',
        shadowOpacity: 0,
        elevation: 0,
      },
      loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      btnText: {
        color: '#00D4FF', // Contrast text on cyan button
        textAlign: 'center',
        fontWeight: '700',
        fontSize: fp(17),
        letterSpacing: 0.5,
      },
      btnTextSpacing: {
        marginLeft: spacing.sm,
        color: '#FFFFFF',
      },
      footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        opacity: 0.7,
      },
      footerText: {
        color: '#2A7A99',
        fontSize: fp(12),
        marginLeft: spacing.xs,
        fontWeight: '500',
      },
      splashText: {
        fontSize: fp(20),
        fontWeight: '700',
        paddingTop: spacing.sm,
        maxWidth: '60%',
        textAlign: 'center',
        color: '#333',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: wp(1), height: hp(1) },
        textShadowRadius: wp(3),
      },
      logoShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: hp(6) },
        shadowOpacity: 0.3,
        shadowRadius: wp(4.65),
        elevation: 8,
      },
      unlockContainer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
      },
      unlockSubtitle: {
        color: '#fff',
        fontSize: fp(14),
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: spacing.xl,
      },
      biometricBigButton: {
        backgroundColor: '#fff',
        width: wp(160),
        height: wp(160),
        borderRadius: wp(80),
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
      },
      biometricButtonText: {
        color: '#0A1F4A',
        fontSize: fp(12),
        fontWeight: '600',
        marginTop: spacing.sm,
      },
      usePasswordLink: {
        marginTop: spacing.xl,
        padding: spacing.sm,
      },
      usePasswordText: {
        color: '#fff',
        fontSize: fp(14),
        textDecorationLine: 'underline',
        opacity: 0.9,
      },
      biometricLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        padding: spacing.sm,
      },
      biometricLinkText: {
        color: '#fff',
        fontSize: fp(14),
        marginLeft: spacing.sm,
        fontWeight: '600',
      },
    };
  },
);
