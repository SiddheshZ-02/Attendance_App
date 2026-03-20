// services/api/apiConfig.js

import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { Attendance_API_TIMEOUT } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/app';
import { store } from '../../store';
import { setSessionExpired } from '../../features/auth/authSlice';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS
};

const doFetch = async (url: string, options: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

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
    throw { code: 'BASE_URL_MISSING', message: 'API base URL is not configured. Set Attendance_API_BASE_URL in .env' };
  }
  const timeoutMs = Number(Attendance_API_TIMEOUT) || 12000;

  const exec = async (authToken?: string | null) => {
    const h = { ...headers } as any;
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    const resp = await doFetch(`${base}${endpoint}`, { ...options, headers: h }, timeoutMs);
    let data: any = null;
    try { data = await resp.json(); } catch { data = null; }
    return { resp, data } as const;
  };

  try {
    let { resp, data } = await exec(token);
    if (resp.status !== 401) return data;

    const code = data?.code || 'TOKEN_EXPIRED';
    if (['TOKEN_EXPIRED', 'INVALID_TOKEN', 'TOKEN_REVOKED'].includes(code)) {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        const refreshResp = await doFetch(`${base}${API_ENDPOINTS.AUTH.REFRESH}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          },
          timeoutMs,
        );
        let refreshData: any = null;
        try { refreshData = await refreshResp.json(); } catch { refreshData = null; }
        if (refreshResp.ok && refreshData?.success && refreshData?.data?.token) {
          const newToken = refreshData.data.token;
          const newRefreshToken = refreshData.data.refreshToken;
          
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          ({ resp, data } = await exec(newToken));
          if (resp.status === 401) {
            throw { code: data?.code || 'SESSION_REVOKED', message: data?.message || 'Session invalid.' };
          }
          return data;
        }
      }
    }

    throw { code, message: data?.message || 'Not authorized.' };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw { code: 'REQUEST_TIMEOUT', message: 'Request timed out. Please try again.' };
    }
    if (['SESSION_REVOKED', 'TOKEN_REVOKED', 'INVALID_REFRESH', 'REFRESH_TOKEN_EXPIRED'].includes(error?.code)) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.EMPLOYEE_ID,
        STORAGE_KEYS.DEPARTMENT,
      ]);
      store.dispatch(setSessionExpired({ message: error?.message || 'Your session has expired.' }));
    }
    console.error('API call error:', error);
    throw error;
  }
};
