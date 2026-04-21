import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { API_CONFIG, apiCall, purgeLocalSession } from '../../services/api/apiConfig';
import { STORAGE_KEYS } from '../../constants/app';
import {
  loadAuthTokens,
  loadAuthTokensSilent,
  persistAuthTokens,
} from '../../services/auth/secureCredentials';
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeId?: string;
  department?: string;
  phone?: string;
  position?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  checkingSession: boolean;
  logoutStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  sessionExpired: boolean;
  sessionExpiredMessage?: string | null;
  isIntentionalLogout?: boolean;
  isBiometricEnabled: boolean;
  recentManualLogin: boolean;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  status: 'idle',
  error: null,
  checkingSession: true,
  logoutStatus: 'idle',
  sessionExpired: false,
  sessionExpiredMessage: null,
  isIntentionalLogout: false,
  isBiometricEnabled: false,
  recentManualLogin: false,
};

type LoginArgs = {
  email: string;
  password: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
};

type LoginResult = {
  token: string;
  refreshToken: string;
  user: User;
  warnings?: {
    newDevice?: boolean;
    suspiciousLocation?: boolean;
    message?: string;
  };
};

type LoginError = {
  code?: string;
  message?: string;
};

const userStoragePairs = (data: {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  employeeId?: string;
  department?: string;
}) =>
  [
    [STORAGE_KEYS.USER_ID, data._id],
    [STORAGE_KEYS.USER_NAME, data.name || ''],
    [STORAGE_KEYS.USER_EMAIL, data.email || ''],
    [STORAGE_KEYS.USER_ROLE, data.role || ''],
    [STORAGE_KEYS.EMPLOYEE_ID, data.employeeId || ''],
    [STORAGE_KEYS.DEPARTMENT, data.department || ''],
  ] as [string, string][];

export const login = createAsyncThunk<LoginResult, LoginArgs, { rejectValue: LoginError }>(
  'auth/login',
  async (payload, thunkAPI) => {
    const deviceId = await DeviceInfo.getUniqueId();
    const loginData: Record<string, any> = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      platform: 'app',
      deviceId: deviceId,
      location: payload.location
        ? {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
            accuracy: payload.location.accuracy,
          }
        : null,
    };

    try {
      const data = await apiCall(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        'POST',
        loginData,
        null,
      );

      if (data.success) {
        const user: User = {
          id: data.data._id,
          name: data.data.name,
          email: data.data.email,
          role: data.data.role,
          employeeId: data.data.employeeId,
          department: data.data.department,
          phone: data.data.phone || data.data.phoneNumber,
          position: data.data.position || '',
        };

        await persistAuthTokens(
          {
            token: data.data.token,
            refreshToken: data.data.refreshToken || '',
          },
          true,
        );

        await AsyncStorage.multiSet(userStoragePairs(data.data));

        return {
          token: data.data.token,
          refreshToken: data.data.refreshToken || '',
          user,
          warnings: data.warnings,
        };
      }

      return thunkAPI.rejectWithValue({
        code: data.code,
        message: data.message,
      });
    } catch (error: any) {
      return thunkAPI.rejectWithValue({
        message: error?.message || 'Login failed',
      });
    }
  },
);

export const bootstrapSession = createAsyncThunk<{ token: string; refreshToken: string; user: User } | null>(
  'auth/bootstrapSession',
  async () => {
    try {
      fetch(`${API_CONFIG.BASE_URL}/api/health`).catch(() => {});

      const creds = await loadAuthTokens();
      if (!creds?.token) return null;

      const stored = await AsyncStorage.multiGet([
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.EMPLOYEE_ID,
        STORAGE_KEYS.DEPARTMENT,
      ]);
      const kv: Record<string, string> = {};
      stored.forEach(([k, v]) => {
        if (v) kv[k] = v;
      });

      if (!kv[STORAGE_KEYS.USER_ID]) return null;

      const user: User = {
        id: kv[STORAGE_KEYS.USER_ID],
        name: kv[STORAGE_KEYS.USER_NAME] || '',
        email: kv[STORAGE_KEYS.USER_EMAIL] || '',
        role: kv[STORAGE_KEYS.USER_ROLE] || '',
        employeeId: kv[STORAGE_KEYS.EMPLOYEE_ID] || '',
        department: kv[STORAGE_KEYS.DEPARTMENT] || '',
      };

      return { token: creds.token, refreshToken: creds.refreshToken, user };
    } catch {
      return null;
    }
  },
);

type ValidateSessionResult = { token: string; refreshToken?: string; user: User } | null;

export const validateSession = createAsyncThunk<ValidateSessionResult, string | void>(
  'auth/validateSession',
  async (manualToken, thunkAPI) => {
    try {
      // Use manual token, then state token to avoid Keychain/Biometric prompt during active session
      const state = thunkAPI.getState() as { auth: AuthState };
      let token = (manualToken as string) || state.auth.token;

      // If no token anywhere, only then try loading from Keychain (silently)
      if (!token) {
        const creds = await loadAuthTokensSilent();
        if (!creds?.token) return null;
        token = creds.token;
      }

      const data = await apiCall(
        API_CONFIG.ENDPOINTS.AUTH.PROFILE,
        'GET',
        null,
        token,
      );

      if (data?.success && data?.data) {
        const user: User = {
          id: data.data._id,
          name: data.data.name || '',
          email: data.data.email || '',
          role: data.data.role || '',
          employeeId: data.data.employeeId || '',
          department: data.data.department || '',
          phone: data.data.phone || data.data.phoneNumber || '',
          position: data.data.position || '',
        };

        await AsyncStorage.multiSet([
          [STORAGE_KEYS.USER_NAME, user.name],
          [STORAGE_KEYS.USER_EMAIL, user.email],
          [STORAGE_KEYS.USER_ROLE, user.role || ''],
          [STORAGE_KEYS.EMPLOYEE_ID, user.employeeId || ''],
          [STORAGE_KEYS.DEPARTMENT, user.department || ''],
        ]);

        // After apiCall, the token might have been refreshed in state
        const latestState = thunkAPI.getState() as { auth: AuthState };
        const latestToken = latestState.auth.token || token;
        const latestRefreshToken = latestState.auth.refreshToken;

        return { token: latestToken, refreshToken: latestRefreshToken || undefined, user };
      }

      return null;
    } catch {
      return thunkAPI.rejectWithValue(null);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as { auth: AuthState };
  const token = state.auth.token;
  try {
    if (token) {
      await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, 'POST', {}, token).catch(() => {});
    }
  } finally {
    await purgeLocalSession('You have been logged out.', true);
  }
});

export const logoutAllDevices = createAsyncThunk('auth/logoutAllDevices', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as { auth: AuthState };
  const token = state.auth.token;
  try {
    if (token) {
      await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT_ALL, 'POST', {}, token).catch(() => {});
    }
  } finally {
    await purgeLocalSession('You have been logged out from all devices.', true);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setSessionExpired(
      state,
      action: PayloadAction<{ message?: string; isIntentionalLogout?: boolean } | null>,
    ) {
      if (action.payload) {
        state.sessionExpired = true;
        state.sessionExpiredMessage =
          action.payload.message || 'Your session has ended. Please log in again.';
        state.isIntentionalLogout = action.payload.isIntentionalLogout || false;
      } else {
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
        state.isIntentionalLogout = false;
      }
    },
    setTokens(state, action: PayloadAction<{ token: string; refreshToken: string }>) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    setBiometricEnabled(state, action: PayloadAction<boolean>) {
      state.isBiometricEnabled = action.payload;
    },
    setRecentManualLogin(state, action: PayloadAction<boolean>) {
      state.recentManualLogin = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.error = null;
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
        state.isIntentionalLogout = false;
        state.recentManualLogin = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error.message || null;
      })
      .addCase(bootstrapSession.pending, state => {
        state.checkingSession = true;
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.checkingSession = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
          state.isIntentionalLogout = false;
        } else {
          state.token = null;
          state.refreshToken = null;
          state.user = null;
        }
      })
      .addCase(bootstrapSession.rejected, state => {
        state.checkingSession = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          if (action.payload.refreshToken) {
            state.refreshToken = action.payload.refreshToken;
          }
          state.user = action.payload.user;
          state.isIntentionalLogout = false;
        } else {
          state.token = null;
          state.refreshToken = null;
          state.user = null;
          state.sessionExpired = true;
          state.sessionExpiredMessage =
            'Session ended. Your account was used on another platform';
        }
      })
      .addCase(logout.pending, state => {
        state.logoutStatus = 'loading';
      })
      .addCase(logout.fulfilled, state => {
        state.logoutStatus = 'succeeded';
        state.token = null;
        state.user = null;
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
        state.recentManualLogin = false;
      })
      .addCase(logout.rejected, state => {
        state.logoutStatus = 'failed';
        state.token = null;
        state.user = null;
      })
      .addCase(logoutAllDevices.pending, state => {
        state.logoutStatus = 'loading';
      })
      .addCase(logoutAllDevices.fulfilled, state => {
        state.logoutStatus = 'succeeded';
        state.token = null;
        state.user = null;
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
        state.recentManualLogin = false;
      })
      .addCase(logoutAllDevices.rejected, state => {
        state.logoutStatus = 'failed';
        state.token = null;
        state.user = null;
      });
  },
});

export const { setUser, setSessionExpired, setBiometricEnabled, setRecentManualLogin, setTokens } = authSlice.actions;
export default authSlice.reducer;

/** @deprecated Use `validateSession` — alias kept for profile refresh hook. */
export const checkSession = validateSession;
