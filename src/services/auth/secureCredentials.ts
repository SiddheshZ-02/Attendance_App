import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { STORAGE_KEYS } from '../../constants/app';

const AUTH_KEYCHAIN_USER = 'auth_tokens';

const biometricPrompt = {
  title: 'Unlock attendance',
  subtitle: 'Confirm your identity to continue',
  cancel: 'Cancel',
};

async function isBiometricAppLockEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_APP_LOCK);
  return v === '1';
}

export async function setBiometricAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_APP_LOCK, enabled ? '1' : '0');
}

/** Raw read — works for migrating to/from biometric-protected items. */
export async function peekKeychainPasswordJson(): Promise<string | null> {
  try {
    const row = await Keychain.getGenericPassword();
    if (!row || !row.password) return null;
    return row.password;
  } catch {
    return null;
  }
}

export async function loadAuthTokens(): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const biometric = await isBiometricAppLockEnabled();
    const row = biometric
      ? await Keychain.getGenericPassword({
          authenticationPrompt: biometricPrompt,
        })
      : await Keychain.getGenericPassword();

    if (!row || !row.password) return null;
    const parsed = JSON.parse(row.password) as { token?: string; refreshToken?: string };
    if (!parsed?.token) return null;
    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken || '',
    };
  } catch {
    return null;
  }
}

export async function persistAuthTokens(tokens: {
  token: string;
  refreshToken: string;
}): Promise<void> {
  const json = JSON.stringify({
    token: tokens.token,
    refreshToken: tokens.refreshToken || '',
  });
  const biometric = await isBiometricAppLockEnabled();

  await Keychain.resetGenericPassword();

  if (biometric) {
    await Keychain.setGenericPassword(AUTH_KEYCHAIN_USER, json, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
      authenticationPrompt: biometricPrompt,
      ...(Platform.OS === 'android'
        ? { storage: Keychain.STORAGE_TYPE.AES_GCM }
        : {}),
    });
  } else {
    await Keychain.setGenericPassword(AUTH_KEYCHAIN_USER, json);
  }
}

export async function clearAuthCredentials(): Promise<void> {
  await Keychain.resetGenericPassword();
}

/** After enabling biometrics: re-save current tokens with hardware protection. */
export async function migrateKeychainToBiometricIfNeeded(): Promise<boolean> {
  const raw = await peekKeychainPasswordJson();
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { token?: string; refreshToken?: string };
    if (!parsed?.token) return false;
    await setBiometricAppLockEnabled(true);
    await persistAuthTokens({
      token: parsed.token,
      refreshToken: parsed.refreshToken || '',
    });
    return true;
  } catch {
    return false;
  }
}

/** Turn off biometric lock and keep tokens accessible without prompt. */
export async function migrateKeychainFromBiometric(): Promise<boolean> {
  const tokens = await loadAuthTokens();
  if (!tokens?.token) return false;
  await setBiometricAppLockEnabled(false);
  await persistAuthTokens(tokens);
  return true;
}

export async function getSupportedBiometryLabel(): Promise<string | null> {
  const t = await Keychain.getSupportedBiometryType();
  if (t === Keychain.BIOMETRY_TYPE.FACE_ID) return 'Face ID';
  if (t === Keychain.BIOMETRY_TYPE.TOUCH_ID) return 'Touch ID';
  if (t === Keychain.BIOMETRY_TYPE.FINGERPRINT) return 'Fingerprint';
  if (t === Keychain.BIOMETRY_TYPE.FACE) return 'Face unlock';
  if (t === Keychain.BIOMETRY_TYPE.IRIS) return 'Iris';
  return null;
}
