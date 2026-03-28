import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { API_CONFIG, apiCall } from '../../services/api/apiConfig';

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
  // ✅ Starts as TRUE — navigation waits until Keychain is read.
  //    This is the key fix that prevents Login flashing on re-open.
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
  checkingSession: true, // ← FIXED: was false (caused race condition)
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

export const login = createAsyncThunk<LoginResult, LoginArgs, { rejectValue: LoginError }>(
  'auth/login',
  async (payload, thunkAPI) => {
    const loginData: Record<string, any> = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
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

        await Keychain.setGenericPassword(
          'auth_tokens',
          JSON.stringify({
            token: data.data.token,
            refreshToken: data.data.refreshToken || '',
          }),
        );

        await AsyncStorage.multiSet([
          ['userId', data.data._id],
          ['userName', data.data.name || ''],
          ['userEmail', data.data.email || ''],
          ['userRole', data.data.role || ''],
          ['employeeId', data.data.employeeId || ''],
          ['department', data.data.department || ''],
        ]);

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

// ─────────────────────────────────────────────────────────────────────────────
// bootstrapSession — LOCAL ONLY, zero network calls.
//
// Reads Keychain + AsyncStorage to restore token/user in < 100ms.
// Dispatched on app start from Index.tsx BEFORE navigation renders.
// Because checkingSession starts as true, Login.tsx waits for this
// to complete before deciding to navigate or show the login form.
//
// Also fires a fire-and-forget ping to /api/health to pre-warm the
// Render free-tier server while the user watches the splash animation.
// ─────────────────────────────────────────────────────────────────────────────
export const bootstrapSession = createAsyncThunk<{ token: string; user: User } | null>(
  'auth/bootstrapSession',
  async () => {
    try {
      // Pre-warm Render so the server is ready when the user interacts.
      // fire-and-forget — we do NOT await this.
      fetch(`${API_CONFIG.BASE_URL}/api/health`).catch(() => {});

      const credentials = await Keychain.getGenericPassword();
      if (!credentials) return null;

      const parsed = JSON.parse(credentials.password);
      const token: string | undefined = parsed?.token;
      if (!token) return null;

      // Restore user from AsyncStorage — fast local read, no network.
      const stored = await AsyncStorage.multiGet([
        'userId',
        'userName',
        'userEmail',
        'userRole',
        'employeeId',
        'department',
      ]);
      const kv: Record<string, string> = {};
      stored.forEach(([k, v]) => { if (v) kv[k] = v; });

      // If userId is missing we cannot build a user object — force login.
      if (!kv.userId) return null;

      const user: User = {
        id: kv.userId,
        name: kv.userName || '',
        email: kv.userEmail || '',
        role: kv.userRole || '',
        employeeId: kv.employeeId || '',
        department: kv.department || '',
      };

      return { token, user };
    } catch {
      return null;
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// validateSession — Silent background network call.
//
// Called AFTER the app has already navigated to Tab (user is in the app).
// Silently verifies the token with the server and refreshes user data.
//
// Success → update Redux with fresh profile data (silent, no flash).
// Server rejects token (401) → set sessionExpired → SessionExpiredModal shows.
// Network error / timeout → do NOTHING (user may be offline, keep session).
// ─────────────────────────────────────────────────────────────────────────────
type ValidateSessionResult = { token: string; user: User } | null;

export const validateSession = createAsyncThunk<ValidateSessionResult>(
  'auth/validateSession',
  async (_, thunkAPI) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (!credentials) return null;

      const { token } = JSON.parse(credentials.password);
      if (!token) return null;

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

        // Refresh AsyncStorage cache with fresh server data.
        await AsyncStorage.multiSet([
          ['userName', user.name],
          ['userEmail', user.email],
          ['userRole', user.role || ''],
          ['employeeId', user.employeeId || ''],
          ['department', user.department || ''],
        ]);

        // Token may have been rotated by the refresh-token logic in apiCall.
        const updatedCreds = await Keychain.getGenericPassword();
        const updatedToken = updatedCreds
          ? JSON.parse(updatedCreds.password).token
          : token;

        return { token: updatedToken, user };
      }

      // Server responded but said the session is invalid.
      return null;
    } catch {
      // Network error or Render timeout — keep the locally bootstrapped session.
      // User may simply be offline. Never force-logout on a network failure.
      return thunkAPI.rejectWithValue(null);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    const credentials = await Keychain.getGenericPassword();
    const token = credentials ? JSON.parse(credentials.password).token : null;

    if (token) {
      try {
        await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, 'POST', {}, token);
      } catch {
      }
    }

    await Keychain.resetGenericPassword();
    await AsyncStorage.multiRemove([
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'employeeId',
      'department',
    ]);
  } catch {
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
          action.payload.message || 'Your session has expired.';
      } else {
        state.sessionExpired = false;
        state.sessionExpiredMessage = null;
      }
    },
  },
  extraReducers: builder => {
    builder
      // ── login ────────────────────────────────────────────────────
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

      // ── bootstrapSession (fast local, < 100ms) ───────────────────
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

      // ── validateSession (silent background network call) ──────────
      .addCase(validateSession.fulfilled, (state, action) => {
        if (action.payload) {
          // Server confirmed the session — update with fresh profile data.
          state.token = action.payload.token;
          state.user = action.payload.user;
        } else {
          // null = server responded and explicitly rejected the token.
          // Show session-expired modal (graceful UX, not a hard crash).
          state.token = null;
          state.user = null;
          state.sessionExpired = true;
          state.sessionExpiredMessage =
            'Your session has expired. Please log in again.';
        }
      })
      // validateSession.rejected = network / timeout error → do nothing,
      // keep the locally bootstrapped session alive.

      // ── logout ───────────────────────────────────────────────────
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
      });
  },
});

export const { setUser, setSessionExpired } = authSlice.actions;
export default authSlice.reducer;
