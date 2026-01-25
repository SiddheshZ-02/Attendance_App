import React from 'react';
import Toast from 'react-native-toast-notifications';

const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Toast>{children}</Toast>;
};

export default ToastWrapper;