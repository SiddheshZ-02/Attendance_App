import * as Keychain from 'react-native-keychain';

/**
 * Retrieves the auth token securely from react-native-keychain.
 * Returns null if no credentials are stored.
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (!credentials) return null;
    const parsed = JSON.parse(credentials.password);
    return parsed.token ?? null;
  } catch {
    return null;
  }
};
