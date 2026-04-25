// API Constants
import { Attendance_API_BASE_URL, Attendance_API_TIMEOUT, APP_ENV } from '@env';

export const API_BASE_URL = Attendance_API_BASE_URL?.replace(/["']/g, '').replace(/\/$/, '');

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    PROFILE_PICTURE: '/api/auth/profile-picture',
    LOGOUT: '/api/auth/logout',
    LOGOUT_ALL: '/api/auth/logout-all',
    REFRESH: '/api/auth/refresh',
  },
  ATTENDANCE: {
    CHECK_IN: '/api/attendance/checkin',
    CHECK_OUT: '/api/attendance/checkout',
    TODAY: '/api/attendance/today',
    OFFICE_LOCATION: '/api/attendance/office-location'
  }
};