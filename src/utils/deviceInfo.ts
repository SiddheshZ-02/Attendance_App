// utils/deviceInfo.js

import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

/**
 * Collects device information automatically
 * NO USER INPUT REQUIRED - All automatic
 */
export const getDeviceInfo = async () => {
  try {
    const deviceInfo = {
      deviceId: await DeviceInfo.getUniqueId(),
      deviceName: await DeviceInfo.getDeviceName(),
      deviceModel: DeviceInfo.getModel(),
      deviceBrand: DeviceInfo.getBrand(),
      systemVersion: DeviceInfo.getSystemVersion(),
      uniqueId: await DeviceInfo.getUniqueId(),
      appInstanceId: await DeviceInfo.getInstanceId(),
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: DeviceInfo.getVersion()
    };
    
    console.log('📱 Device info collected:', deviceInfo);
    return deviceInfo;
  } catch (error) {
    console.error('❌ Error getting device info:', error);
    return null;
  }
};