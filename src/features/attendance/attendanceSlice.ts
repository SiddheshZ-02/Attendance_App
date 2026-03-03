import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, apiCall } from '../../services/api/apiConfig';
import { setSessionExpired } from '../auth/authSlice';

type AttendanceStats = {
  firstCheckIn: string;
  lastCheckOut: string;
  totalHours: string;
};

interface AttendanceState {
  checkedIn: boolean;
  stats: AttendanceStats;
  workMode: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  checkedIn: false,
  stats: {
    firstCheckIn: '--:--',
    lastCheckOut: '--:--',
    totalHours: '--:--',
  },
  workMode: null,
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
  } | null;
};

export const fetchTodayAttendance = createAsyncThunk<TodayAttendancePayload | null>(
  'attendance/fetchToday',
  async (_, thunkAPI) => {
    const token = await AsyncStorage.getItem('authToken');
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
            }
          : null,
      };
    } catch (error: any) {
      if (error?.code === 'TOKEN_EXPIRED' || error?.code === 'INVALID_TOKEN') {
        thunkAPI.dispatch(
          setSessionExpired({
            message: error?.message || 'Your session has expired.',
          }),
        );
        return null;
      }
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
  const token = await AsyncStorage.getItem('authToken');
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
          }
        : null,
    };
  } catch (error: any) {
    if (error?.code === 'TOKEN_EXPIRED' || error?.code === 'INVALID_TOKEN') {
      thunkAPI.dispatch(
        setSessionExpired({
          message: error?.message || 'Your session has expired.',
        }),
      );
      return thunkAPI.rejectWithValue({
        message: 'Session expired. Please login again.',
      });
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
  },
  extraReducers: builder => {
    builder
      .addCase(fetchTodayAttendance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAttendance.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) {
          return;
        }

        state.checkedIn =
          action.payload.hasCheckedIn && !action.payload.hasCheckedOut;

        state.workMode = action.payload.workMode;

        if (action.payload.attendance) {
          const checkInDate = action.payload.attendance.checkInTime
            ? new Date(action.payload.attendance.checkInTime)
            : null;
          const checkOutDate = action.payload.attendance.checkOutTime
            ? new Date(action.payload.attendance.checkOutTime)
            : null;

          state.stats = {
            firstCheckIn: checkInDate ? checkInDate.toISOString() : '--:--',
            lastCheckOut: checkOutDate ? checkOutDate.toISOString() : '--:--',
            totalHours: state.stats.totalHours,
          };
        }
      })
      .addCase(fetchTodayAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || null;
      })
      .addCase(logAttendance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.checkedIn = !state.checkedIn;

        if (action.payload.attendance) {
          const checkInDate = action.payload.attendance.checkInTime
            ? new Date(action.payload.attendance.checkInTime)
            : null;
          const checkOutDate = action.payload.attendance.checkOutTime
            ? new Date(action.payload.attendance.checkOutTime)
            : null;

          state.stats = {
            firstCheckIn: checkInDate ? checkInDate.toISOString() : state.stats.firstCheckIn,
            lastCheckOut: checkOutDate ? checkOutDate.toISOString() : state.stats.lastCheckOut,
            totalHours: state.stats.totalHours,
          };
        }
      })
      .addCase(logAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload && action.payload.message) ||
          action.error.message ||
          null;
      });
  },
});

export const { setWorkMode, setCheckedIn, setStats } = attendanceSlice.actions;
export default attendanceSlice.reducer;

