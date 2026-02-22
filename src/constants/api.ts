<<<<<<< HEAD

=======
// API Constants
// export const API_BASE_URL = process.env.API_BASE_URL || '';
>>>>>>> f6a47b5dac2c78f36b61f82170660ea4c01127ee

import { Attendance_API_BASE_URL } from '@env';

export const API_BASE_URL = Attendance_API_BASE_URL;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout',
<<<<<<< HEAD
    // DEVICES: '/api/auth/devices' - removed per user request
=======
    DEVICES: '/api/auth/devices'
>>>>>>> f6a47b5dac2c78f36b61f82170660ea4c01127ee
  },
  ATTENDANCE: {
    CHECK_IN: '/api/attendance/checkin',
    CHECK_OUT: '/api/attendance/checkout',
    TODAY: '/api/attendance/today'
  }
};