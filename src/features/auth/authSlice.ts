import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, apiCall } from '../../services/api/apiConfig';
import { STORAGE_KEYS } from '../../constants/app';
import {
  clearAuthCredentials,
  loadAuthTokens,
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
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  checkingSession: boolean;
  logoutStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  sessionExpired: boolean;
  sessionExpiredMessage?: string | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  status: 'idle',
  error: null,
  checkingSession: true,
  logoutStatus: 'idle',
  sessionExpired: false,
  sessionExpiredMessage: null,
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
    const loginData: Record<string, any> = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      platform: 'app',
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

        await persistAuthTokens({
          token: data.data.token,
          refreshToken: data.data.refreshToken || '',
        });

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

export const bootstrapSession = createAsyncThunk<{ token: string; user: User } | null>(
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

      return { token: creds.token, user };
    } catch {
      return null;
    }
  },
);

type ValidateSessionResult = { token: string; user: User } | null;

export const validateSession = createAsyncThunk<ValidateSessionResult>(
  'auth/validateSession',
  async (_, thunkAPI) => {
    try {
      const creds = await loadAuthTokens();
      if (!creds?.token) return null;

      const data = await apiCall(
        API_CONFIG.ENDPOINTS.AUTH.PROFILE,
        'GET',
        null,
        creds.token,
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

        const updated = await loadAuthTokens();
        const updatedToken = updated?.token || creds.token;

        return { token: updatedToken, user };
      }

      return null;
    } catch {
      return thunkAPI.rejectWithValue(null);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  const creds = await loadAuthTokens();
  const token = creds?.token;
  try {
    if (token) {
      await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, 'POST', {}, token).catch(() => {});
    }
  } finally {
    await clearAuthCredentials();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.USER_EMAIL,
      STORAGE_KEYS.USER_ROLE,
      STORAGE_KEYS.EMPLOYEE_ID,
      STORAGE_KEYS.DEPARTMENT,
    ]);
  }
});

export const logoutAllDevices = createAsyncThunk('auth/logoutAllDevices', async () => {
  const creds = await loadAuthTokens();
  const token = creds?.token;
  try {
    if (token) {
      await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT_ALL, 'POST', {}, token).catch(() => {});
    }
  } finally {
    await clearAuthCredentials();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.USER_EMAIL,
      STORAGE_KEYS.USER_ROLE,
      STORAGE_KEYS.EMPLOYEE_ID,
      STORAGE_KEYS.DEPARTMENT,
    ]);
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
      action: PayloadAction<{ message?: string } | null>,
    ) {
      if (action.payload) {
        state.sessionExpired = true;
        state.sessionExpiredMessage =
          action.payload.message || 'Session ended. Your account was used on another platform';
      } else {
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
      }
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
        state.user = action.payload.user;
        state.error = null;
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
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
          state.user = action.payload.user;
        } else {
          state.token = null;
          state.user = null;
        }
      })
      .addCase(bootstrapSession.rejected, state => {
        state.checkingSession = false;
        state.token = null;
        state.user = null;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        } else {
          state.token = null;
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
      })
      .addCase(logoutAllDevices.rejected, state => {
        state.logoutStatus = 'failed';
        state.token = null;
        state.user = null;
      });
  },
});

export const { setUser, setSessionExpired } = authSlice.actions;
export default authSlice.reducer;

/** @deprecated Use `validateSession` — alias kept for profile refresh hook. */
export const checkSession = validateSession;
