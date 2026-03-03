import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  checkingSession: false,
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

        await AsyncStorage.multiSet([
          ['authToken', data.data.token],
          ['refreshToken', data.data.refreshToken || ''],
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

type CheckSessionResult =
  | {
      token: string;
      user: User;
    }
  | null;

export const checkSession = createAsyncThunk<CheckSessionResult>(
  'auth/checkSession',
  async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return null;
      }

      const data = await apiCall(
        API_CONFIG.ENDPOINTS.AUTH.PROFILE,
        'GET',
        null,
        token,
      );

      if (data.success && data.data) {
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
          ['userName', user.name],
          ['userEmail', user.email],
          ['userRole', user.role || ''],
          ['employeeId', user.employeeId || ''],
          ['department', user.department || ''],
        ]);

        const updatedToken = (await AsyncStorage.getItem('authToken')) || token;
        return { token: updatedToken, user };
      }

      return null;
    } catch {
      return null;
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');

    if (token) {
      try {
        await apiCall(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, 'POST', {}, token);
      } catch {
      }
    }

    await AsyncStorage.multiRemove([
      'authToken',
      'refreshToken',
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
      .addCase(checkSession.pending, state => {
        state.checkingSession = true;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.checkingSession = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        } else {
          state.token = null;
          state.user = null;
        }
      })
      .addCase(checkSession.rejected, state => {
        state.checkingSession = false;
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
      });
  },
});

export const { setUser, setSessionExpired } = authSlice.actions;
export default authSlice.reducer;
