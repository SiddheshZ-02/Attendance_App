import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { Attendance_API_TIMEOUT } from '@env';
import { loadAuthTokens, persistAuthTokens } from '../auth/secureCredentials';

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

/** POST /refresh using refresh token from Keychain. Returns new access token or null. */
export async function performTokenRefresh(): Promise<{
  token: string;
  refreshToken: string;
} | null> {
  const base = API_BASE_URL;
  if (!base) return null;
  const timeoutMs = Number(Attendance_API_TIMEOUT) || 12000;

  const creds = await loadAuthTokens();
  const refreshToken = creds?.refreshToken;
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
  await persistAuthTokens({ token: newToken, refreshToken: newRefresh });
  return { token: newToken, refreshToken: newRefresh };
}

/**
 * If access JWT expires within `skewSec`, rotate via refresh and return the new access token.
 */
export async function ensureFreshAccessToken(
  accessToken: string | null,
  skewSec = 300,
): Promise<string | null> {
  if (!accessToken) return null;
  const exp = decodeJwtExp(accessToken);
  if (!exp) return accessToken;
  const msLeft = exp * 1000 - Date.now();
  if (msLeft > skewSec * 1000) return accessToken;

  const rotated = await performTokenRefresh();
  return rotated?.token ?? accessToken;
}
