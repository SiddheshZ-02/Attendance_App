// App Constants
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
  USER_NAME: 'userName',
  USER_EMAIL: 'userEmail',
  USER_ROLE: 'userRole',
  EMPLOYEE_ID: 'employeeId',
  DEPARTMENT: 'department',
  /** `'1'` = Keychain items require Face ID / fingerprint / device PIN to read */
  BIOMETRIC_APP_LOCK: 'biometricAppLockEnabled',
};

export const PERMISSIONS = {
  LOCATION: 'location',
  CAMERA: 'camera',
  CONTACTS: 'contacts'
};

export const ROUTES = {
  LOGIN: 'Login',
  TAB: 'Tab',
  AUTH: 'Auth',
  ATTENDANCE: 'Attendence',
  PROFILE: 'Profile'
};