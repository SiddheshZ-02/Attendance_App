declare module '@env' {
  export const Attendance_API_BASE_URL: string;
  export const Attendance_API_TIMEOUT: number;
  export const APP_ENV: string;
}
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
