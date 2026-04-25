import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePicker from 'react-native-image-crop-picker';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { validateSession, logout, logoutAllDevices, updateProfilePicture, setBiometricEnabled as setReduxBiometricEnabled } from '../../../features/auth/authSlice';
import { resetAttendance } from '../../../features/attendance/attendanceSlice';
import { STORAGE_KEYS } from '../../../constants/app';
import {
  getSupportedBiometryLabel,
  getBiometricAppLockEnabled,
  hasSavedCredentials,
  migrateKeychainFromBiometricSilent,
  migrateKeychainToBiometricIfNeeded,
  peekKeychainPasswordJson,
  setBiometricAppLockEnabled,
} from '../../../services/auth/secureCredentials';

export const useProfile = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const user = auth.user;

  const handleUpdateProfilePicture = useCallback(async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        compressImageQuality: 0.7,
        mediaType: 'photo',
      });

      if (image) {
        setIsUploadingImage(true);
        const fileName = image.path.split('/').pop() || `profile-${Date.now()}.jpg`;
        
        await dispatch(updateProfilePicture({
          uri: Platform.OS === 'android' ? image.path : image.path.replace('file://', ''),
          type: image.mime,
          name: fileName,
        })).unwrap();
        
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', error?.message || 'Failed to update profile picture');
      }
    } finally {
      setIsUploadingImage(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!auth.token) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
      return;
    }

    if (!user) {
      setIsLoading(true);
      dispatch(validateSession())
        .unwrap()
        .then(result => {
          if (!result) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [auth.token, user, dispatch, navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isEnabled = await getBiometricAppLockEnabled();
      const hasCreds = await hasSavedCredentials();
      if (!cancelled) {
        setBiometricEnabled(isEnabled);
        const label = await getSupportedBiometryLabel();
        if (!cancelled) setBiometricLabel(label);
        if (!hasCreds && isEnabled) {
          await setBiometricAppLockEnabled(false);
          if (!cancelled) setBiometricEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const onToggleBiometric = useCallback(
    async (next: boolean) => {
      const supported = await Keychain.getSupportedBiometryType();
      let canAuth = Boolean(supported);
      if (!canAuth) {
        try {
          canAuth = await Keychain.canImplyAuthentication();
        } catch {
          canAuth = false;
        }
      }
      if (next && !canAuth) {
        Alert.alert(
          'Not available',
          'This device does not support Face ID, fingerprint, or device PIN for app lock.',
        );
        return;
      }
      setBiometricBusy(true);
      try {
        if (next) {
          const ok = await migrateKeychainToBiometricIfNeeded();
          if (!ok) {
            Alert.alert('Could not enable', 'Sign in again, then enable app lock.');
            await setBiometricAppLockEnabled(false);
            setBiometricEnabled(false);
            return;
          }
          setBiometricEnabled(true);
          dispatch(setReduxBiometricEnabled(true));
        } else {
          // Silent off: use current tokens from state to avoid hardware prompt
          const ok = await migrateKeychainFromBiometricSilent({
            token: auth.token || '',
            refreshToken: auth.refreshToken || '',
          });
          if (!ok) {
            await setBiometricAppLockEnabled(false);
          }
          setBiometricEnabled(false);
          dispatch(setReduxBiometricEnabled(false));
        }
      } finally {
        setBiometricBusy(false);
      }
    },
    [],
  );

  const confirmLogoutAllDevices = useCallback(() => {
    Alert.alert(
      'Sign out everywhere',
      'All devices including this phone will be signed out. You will need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out all',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await dispatch(logoutAllDevices()).unwrap();
              dispatch(resetAttendance());
              navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
            } catch {
              dispatch(resetAttendance());
              navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
    );
  }, [dispatch, navigation]);

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await dispatch(logout()).unwrap();
      dispatch(resetAttendance());
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } catch {
      dispatch(resetAttendance());
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const result = await dispatch(validateSession()).unwrap();
      if (!result) {
        // Session invalid - handled by reducer state change
      }
    } catch {
      // Validation failed - do NOT trigger biometric or session expired modal
      // This handles user cancel of biometric or network errors gracefully
    } finally {
      setRefreshing(false);
    }
  };

  return {
    user,
    isLoading,
    isLoggingOut,
    refreshing,
    onRefresh,
    showLogoutModal,
    setShowLogoutModal,
    confirmLogout,
    confirmLogoutAllDevices,
    navigation,
    biometricEnabled,
    biometricLabel,
    biometricBusy,
    onToggleBiometric,
    handleUpdateProfilePicture,
    isUploadingImage,
  };
};
