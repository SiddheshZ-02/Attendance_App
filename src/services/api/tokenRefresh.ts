import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { Attendance_API_TIMEOUT } from '@env';
import {
  loadAuthTokensSilent,
  persistAuthTokens,
} from '../auth/secureCredentials';

function decodeJwtExp(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const json = JSON.parse(global.atob(padded)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

const doFetch = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Industry Standard: Singleton promise for token refresh.
 * This prevents "Race Conditions" where multiple simultaneous API calls 
 * each try to refresh the token, which can invalidate the refresh token 
 * on the server or cause security flags.
 */
let refreshPromise: Promise<{ token: string; refreshToken: string } | null> | null = null;

/** POST /refresh using refresh token from Keychain. Returns new access token or null. */
export async function performTokenRefresh(manualRefreshToken?: string): Promise<{
  token: string;
  refreshToken: string;
} | null> {
  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  const base = API_BASE_URL;
  if (!base) return null;
  const timeoutMs = Number(Attendance_API_TIMEOUT) || 12000;

  // Define the refresh logic as an internal async function so we can capture the promise
  const executeRefresh = async () => {
    try {
      let refreshToken = manualRefreshToken;

      if (!refreshToken) {
        const creds = await loadAuthTokensSilent();
        refreshToken = creds?.refreshToken;
      }
      
      if (!refreshToken) return null;

      const refreshResp = await doFetch(
        `${base}${API_ENDPOINTS.AUTH.REFRESH}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        },
        timeoutMs,
      );
      
      let refreshData: any = null;
      try {
        refreshData = await refreshResp.json();
      } catch {
        refreshData = null;
      }

      if (!refreshResp.ok || !refreshData?.success || !refreshData?.data?.token) {
        return null;
      }

      const newToken = refreshData.data.token as string;
      const newRefresh = (refreshData.data.refreshToken as string) || refreshToken;
      
      // Persist the new tokens to secure storage
      await persistAuthTokens({ token: newToken, refreshToken: newRefresh }, true);
      
      return { token: newToken, refreshToken: newRefresh };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      // CRITICAL: Always clear the promise so the next expiration event can try again
      refreshPromise = null;
    }
  };

  refreshPromise = executeRefresh();
  return refreshPromise;
}

/**
 * If access JWT expires within `skewSec`, rotate via refresh and return the new access token.
 */
export async function ensureFreshAccessToken(
  accessToken: string | null,
  refreshToken?: string | null,
  skewSec = 300,
): Promise<string | null> {
  if (!accessToken) return null;
  const exp = decodeJwtExp(accessToken);
  if (!exp) return accessToken;
  const msLeft = exp * 1000 - Date.now();
  if (msLeft > skewSec * 1000) return accessToken;

  const rotated = await performTokenRefresh(refreshToken || undefined);
  return rotated?.token ?? accessToken;
}
