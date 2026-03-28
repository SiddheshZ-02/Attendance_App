import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { API_CONFIG, apiCall } from '../../services/api/apiConfig';
import { setSessionExpired } from '../auth/authSlice';
import { getAuthToken } from '../../utils/auth';
import { calculateTotalHours } from '../../utils/time';

type AttendanceStats = {
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalHours: string;
};

type OfficeLocation = {
  id: string;
  name: string;
  address: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  radius: number;
};

interface AttendanceState {
  checkedIn: boolean;
  hasCheckedOut: boolean;
  stats: AttendanceStats;
  workMode: string | null;
  checkInLocation: [number, number] | null; // [lng, lat]
  officeLocations: OfficeLocation[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  checkedIn: false,
  hasCheckedOut: false,
  stats: {
    firstCheckIn: null,
    lastCheckOut: null,
    totalHours: '--:--',
  },
  workMode: null,
  checkInLocation: null,
  officeLocations: [],
  loading: false,
  error: null,
};

type TodayAttendancePayload = {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  workMode: string | null;
  attendance: {
    checkInTime: string | null;
    checkOutTime: string | null;
    checkInLocation?: {
      coordinates: [number, number];
    };
  } | null;
};

export const fetchTodayAttendance = createAsyncThunk<TodayAttendancePayload | null>(
  'attendance/fetchToday',
  async (_, thunkAPI) => {
    const token = await getAuthToken();
    if (!token) return null;
    try {
      const data: any = await apiCall(
        API_CONFIG.ENDPOINTS.ATTENDANCE.TODAY,
        'GET',
        null,
        token,
      );
      if (!data?.success) return null;
      return {
        hasCheckedIn: data.hasCheckedIn,
        hasCheckedOut: data.hasCheckedOut,
        workMode: data.workMode || null,
        attendance: data.attendance
          ? {
              checkInTime: data.attendance.checkInTime || null,
              checkOutTime: data.attendance.checkOutTime || null,
              checkInLocation: data.attendance.checkInLocation || null,
            }
          : null,
      };
    } catch (error: any) {
      const sessionCodes = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'SESSION_REVOKED', 'ACCOUNT_INACTIVE'];
      if (sessionCodes.includes(error?.code)) {
        thunkAPI.dispatch(setSessionExpired({ message: error?.message || 'Your session has expired.' }));
      }
      return null;
    }
  },
);

export const fetchOfficeLocations = createAsyncThunk<OfficeLocation[] | null>(
  'attendance/fetchOfficeLocations',
  async (_, thunkAPI) => {
    const token = await getAuthToken();
    if (!token) return null;
    try {
      const data: any = await apiCall(
        API_CONFIG.ENDPOINTS.ATTENDANCE.OFFICE_LOCATION,
        'GET',
        null,
        token,
      );
      if (!data?.success) return null;
      return data.officeLocations;
    } catch (error: any) {
      console.error('fetchOfficeLocations error:', error);
      return null;
    }
  },
);

type LogAttendanceArgs = {
  type: 'check-in' | 'check-out';
  location: { lat: number; lng: number };
  workMode: string | null;
};

type LogAttendanceResult = {
  attendance: {
    checkInTime: string | null;
    checkOutTime: string | null;
    checkInLocation?: {
      coordinates: [number, number];
    };
  } | null;
};

type LogAttendanceError = {
  message: string;
};

export const logAttendance = createAsyncThunk<
  LogAttendanceResult,
  LogAttendanceArgs,
  { rejectValue: LogAttendanceError }
>('attendance/logAttendance', async (payload, thunkAPI) => {
  const token = await getAuthToken();
  if (!token) {
    return thunkAPI.rejectWithValue({
      message: 'Not authenticated. Please login again.',
    });
  }
  const endpoint =
    payload.type === 'check-in'
      ? API_CONFIG.ENDPOINTS.ATTENDANCE.CHECK_IN
      : API_CONFIG.ENDPOINTS.ATTENDANCE.CHECK_OUT;
  const body: Record<string, any> = {
    latitude: payload.location.lat,
    longitude: payload.location.lng,
  };
  if (payload.type === 'check-in') {
    body.workMode = payload.workMode;
  }
  try {
    const data: any = await apiCall(endpoint, 'POST', body, token);
    if (!data?.success) {
      switch (data?.code) {
        case 'OUT_OF_OFFICE_RADIUS':
          return thunkAPI.rejectWithValue({
            message: `You are ${data.distance}m from the office. Must be within ${data.allowedRadius}m.`,
          });
        case 'OUT_OF_WFH_RADIUS':
          return thunkAPI.rejectWithValue({
            message: `You are ${data.distance}m from your check-in location. Must be within ${data.allowedRadius}m.`,
          });
        case 'ALREADY_CHECKED_IN':
          return thunkAPI.rejectWithValue({
            message: 'You are already checked in today.',
          });
        case 'ALREADY_CHECKED_OUT':
          return thunkAPI.rejectWithValue({
            message: 'You have already checked out today.',
          });
        case 'NOT_CHECKED_IN':
          return thunkAPI.rejectWithValue({
            message: 'You have not checked in today.',
          });
        default:
          return thunkAPI.rejectWithValue({
            message: data?.message || `Failed to ${payload.type}`,
          });
      }
    }
    return {
      attendance: data.attendance
        ? {
            checkInTime: data.attendance.checkInTime || null,
            checkOutTime: data.attendance.checkOutTime || null,
            checkInLocation: data.attendance.checkInLocation || null,
          }
        : null,
    };
  } catch (error: any) {
    const sessionCodes = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'SESSION_REVOKED', 'ACCOUNT_INACTIVE'];
    if (sessionCodes.includes(error?.code)) {
      thunkAPI.dispatch(setSessionExpired({ message: error?.message || 'Your session has expired.' }));
      return thunkAPI.rejectWithValue({ message: 'Session expired. Please login again.' });
    }
    return thunkAPI.rejectWithValue({
      message: error?.message || `Failed to ${payload.type}`,
    });
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setWorkMode(state, action: PayloadAction<string | null>) {
      state.workMode = action.payload;
    },
    setCheckedIn(state, action: PayloadAction<boolean>) {
      state.checkedIn = action.payload;
    },
    setStats(state, action: PayloadAction<AttendanceStats>) {
      state.stats = action.payload;
    },
    updateTotalHours(state) {
      if (state.checkedIn && state.stats.firstCheckIn) {
        state.stats.totalHours = calculateTotalHours(state.stats.firstCheckIn, null);
      }
    },
    resetAttendance(state) {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchTodayAttendance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAttendance.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) return;

        state.checkedIn = action.payload.hasCheckedIn && !action.payload.hasCheckedOut;
        state.hasCheckedOut = action.payload.hasCheckedOut;
        state.workMode = action.payload.workMode;

        if (action.payload.attendance) {
          state.stats.firstCheckIn = action.payload.attendance.checkInTime || null;
          state.stats.lastCheckOut = action.payload.attendance.checkOutTime || null;
          state.checkInLocation = action.payload.attendance.checkInLocation?.coordinates || null;
          state.stats.totalHours = calculateTotalHours(
            state.stats.firstCheckIn,
            state.stats.lastCheckOut,
          );
        }
      })
      .addCase(fetchTodayAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || null;
      })
      .addCase(logAttendance.pending, state => {
        state.loading = true;
        state.error = null;
        // Optimistic update
        state.checkedIn = !state.checkedIn;
      })
      .addCase(logAttendance.fulfilled, (state, action) => {
        state.loading = false;
        // Check if this was a check-out operation
        const isCheckout = action.meta.arg.type === 'check-out';
        if (isCheckout) {
          state.checkedIn = false;
          state.hasCheckedOut = true;
        } else {
          state.checkedIn = true;
          state.hasCheckedOut = false;
        }
        
        if (action.payload.attendance) {
          state.stats.firstCheckIn = action.payload.attendance.checkInTime || state.stats.firstCheckIn;
          state.stats.lastCheckOut = action.payload.attendance.checkOutTime || state.stats.lastCheckOut;
          state.checkInLocation = action.payload.attendance.checkInLocation?.coordinates || state.checkInLocation;
          state.stats.totalHours = calculateTotalHours(
            state.stats.firstCheckIn,
            state.stats.lastCheckOut,
          );
        }
      })
      .addCase(logAttendance.rejected, (state, action) => {
        state.loading = false;
        // Rollback optimistic update
        state.checkedIn = !state.checkedIn;
        state.error =
          (action.payload && action.payload.message) ||
          action.error.message ||
          'Failed to log attendance';
      })
      .addCase(fetchOfficeLocations.fulfilled, (state, action) => {
        if (action.payload) {
          state.officeLocations = action.payload;
        }
      });
  },
});

export const { setWorkMode, setCheckedIn, setStats, updateTotalHours, resetAttendance } = attendanceSlice.actions;
export default attendanceSlice.reducer;

