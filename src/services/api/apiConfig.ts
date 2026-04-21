import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { Attendance_API_TIMEOUT } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/app';
import { store } from '../../store';
import { setSessionExpired } from '../../features/auth/authSlice';
import { clearAuthCredentials } from '../auth/secureCredentials';
import { ensureFreshAccessToken, performTokenRefresh } from './tokenRefresh';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS,
};

const STORAGE_CLEAR_KEYS = [
  STORAGE_KEYS.USER_ID,
  STORAGE_KEYS.USER_NAME,
  STORAGE_KEYS.USER_EMAIL,
  STORAGE_KEYS.USER_ROLE,
  STORAGE_KEYS.EMPLOYEE_ID,
  STORAGE_KEYS.DEPARTMENT,
];

/** Server said re-login — do not attempt refresh. */
const NO_REFRESH_ATTEMPT = new Set([
  'SESSION_REVOKED',
  'SESSION_ENDED_PLATFORM_SWITCH',
  'PASSWORD_CHANGED',
  'TOKEN_VERSION_STALE',
  'TOKEN_THEFT_DETECTED',
  'REFRESH_TOKEN_EXPIRED',
  'INVALID_REFRESH_TOKEN',
  'SESSION_EXPIRED',
  'NO_REFRESH_TOKEN',
  'ACCOUNT_INACTIVE',
  'USER_NOT_FOUND',
  'NO_TOKEN',
  'INSUFFICIENT_PERMISSIONS',
]);

const SESSION_FATAL_CODES = new Set([
  ...NO_REFRESH_ATTEMPT,
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
  'TOKEN_REVOKED',
]);

const doFetch = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

async function purgeLocalSession(message: string) {
  await clearAuthCredentials();
  await AsyncStorage.multiRemove(STORAGE_CLEAR_KEYS);
  store.dispatch(setSessionExpired({ message }));
}

export const apiCall = async (
  endpoint: string,
  method: string = 'GET',
  body: any = null,
  token: string | null = null,
) => {
  const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  const base = API_CONFIG.BASE_URL;
  if (!base) {
    throw {
      code: 'BASE_URL_MISSING',
      message: 'API base URL is not configured. Set Attendance_API_BASE_URL in .env',
    };
  }
  const timeoutMs = Number(Attendance_API_TIMEOUT) || 12000;

  const exec = async (authToken?: string | null) => {
    const h = { ...headers } as Record<string, string>;
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    const resp = await doFetch(`${base}${endpoint}`, { ...options, headers: h }, timeoutMs);
    let data: any = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    return { resp, data } as const;
  };

  try {
    let authToken = token;
    if (authToken) {
      authToken = await ensureFreshAccessToken(authToken);
    }

    let { resp, data } = await exec(authToken);

    if (resp.status === 429) {
      throw {
        code: data?.code || 'RATE_LIMIT',
        message: data?.message || 'Too many requests. Please wait and try again.',
      };
    }

    if (resp.status !== 401) {
      return data;
    }

    const code = data?.code || 'TOKEN_EXPIRED';

    if (!token) {
      throw { code, message: data?.message || 'Not authorized.' };
    }

    if (NO_REFRESH_ATTEMPT.has(code)) {
      await purgeLocalSession(
        data?.message || 'Session ended. Your account was used on another platform',
      );
      throw { code, message: data?.message || 'Not authorized.' };
    }

    const rotated = await performTokenRefresh();
    if (rotated?.token) {
      ({ resp, data } = await exec(rotated.token));
      if (resp.status !== 401) {
        return data;
      }
      const code2 = data?.code || 'SESSION_REVOKED';
      await purgeLocalSession(
        data?.message || 'Session ended. Your account was used on another platform',
      );
      throw { code: code2, message: data?.message || 'Session invalid.' };
    }

    await purgeLocalSession(
      data?.message || 'Session ended. Your account was used on another platform',
    );
    throw { code, message: data?.message || 'Not authorized.' };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw { code: 'REQUEST_TIMEOUT', message: 'Request timed out. Please try again.' };
    }
    if (
      token &&
      SESSION_FATAL_CODES.has(error?.code) &&
      !store.getState().auth.sessionExpired
    ) {
      await purgeLocalSession(
        error?.message || 'Session ended. Your account was used on another platform',
      );
    }
    console.error('API call error:', error);
    throw error;
  }
};
