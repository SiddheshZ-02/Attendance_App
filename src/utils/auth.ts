import { loadAuthTokens } from '../services/auth/secureCredentials';

/**
 * Current access token from secure storage (Face ID / PIN when biometric lock is on).
 */
export const getAuthToken = async (): Promise<string | null> => {
  const creds = await loadAuthTokens();
  return creds?.token ?? null;
};
