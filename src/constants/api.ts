// API Constants
import { Attendance_API_BASE_URL } from '@env';

export const API_BASE_URL = Attendance_API_BASE_URL;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh'
  },
  ATTENDANCE: {
    CHECK_IN: '/api/attendance/checkin',
    CHECK_OUT: '/api/attendance/checkout',
    TODAY: '/api/attendance/today',
    OFFICE_LOCATION: '/api/attendance/office-location'
  }
};