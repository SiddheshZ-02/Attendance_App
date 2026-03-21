import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, Platform, PermissionsAndroid, Linking, AppState } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useToast } from 'react-native-toast-notifications';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import {
  fetchTodayAttendance,
  logAttendance,
  setWorkMode,
  updateTotalHours,
} from '../../../features/attendance/attendanceSlice';

export const useAttendance = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [isFetchingToday, setIsFetchingToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const isProcessing = useRef(false);
  const lastKnownLocation = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);
  const gpsWarmupWatchId = useRef<number | null>(null);
  const toast = useToast();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const attendance = useAppSelector(state => state.attendance);

  const checkedIn = attendance.checkedIn;
  const selectedMode = attendance.workMode;
  const attendanceStats = attendance.stats;

  const formatTime = useCallback((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? `0${minutes}` : minutes;
    return `${h}:${m} ${ampm}`;
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    try {
      setIsFetchingToday(true);
      await dispatch(fetchTodayAttendance()).unwrap();
    } catch (error) {
      console.error('❌ Load today attendance error:', error);
    } finally {
      setIsFetchingToday(false);
    }
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await dispatch(fetchTodayAttendance()).unwrap();
    } catch (error) {
      console.error('❌ Refresh today attendance error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadTodayAttendance();
  }, [loadTodayAttendance]);

  const warmupGPS = useCallback(() => {
    gpsWarmupWatchId.current = Geolocation.watchPosition(
      position => {
        lastKnownLocation.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };
      },
      error => console.log('⚠️ GPS warmup:', error.message),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
        distanceFilter: 50,
      },
    );
  }, []);

  const hasLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    }
    const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return result === RESULTS.GRANTED;
  };

  const ensureLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted) return true;
      const req = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return req === PermissionsAndroid.RESULTS.GRANTED;
    }
    const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    if (status === RESULTS.GRANTED) return true;
    const reqStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return reqStatus === RESULTS.GRANTED;
  };

  const isGPSEnabled = (): Promise<boolean> =>
    new Promise(resolve => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        error => resolve(error.code !== 2),
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 },
      );
    });

  const checkGPSStatus = useCallback(async () => {
    try {
      const hasPermission = await hasLocationPermission();
      const gpsEnabled = await isGPSEnabled();
      if (!hasPermission || !gpsEnabled) {
        setShowLocationModal(true);
      } else {
        setShowLocationModal(false);
        warmupGPS();
      }
    } catch (error) {
      console.error('GPS check error:', error);
    }
  }, [warmupGPS]);

  useEffect(() => {
    checkGPSStatus();
    warmupGPS();
    return () => {
      if (gpsWarmupWatchId.current !== null) {
        Geolocation.clearWatch(gpsWarmupWatchId.current);
      }
    };
  }, [checkGPSStatus, warmupGPS]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setTimeout(() => checkGPSStatus(), 500);
      }
    });
    return () => subscription.remove();
  }, [checkGPSStatus]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(
      () => setCooldownLeft(prev => (prev > 0 ? prev - 1 : 0)),
      1000,
    );
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (checkedIn) {
      dispatch(updateTotalHours()); // Initial update
      interval = setInterval(() => {
        dispatch(updateTotalHours());
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkedIn, dispatch]);

  const validateLocationRequirements = async (): Promise<void> => {
    const permitted = await ensureLocationPermission();
    if (!permitted) throw new Error('PERMISSION_REQUIRED');
    const gpsOk = await isGPSEnabled();
    if (!gpsOk) throw new Error('GPS_OFF');
  };

  const fetchWithTimeout = (
    highAccuracy: boolean,
    timeout: number,
  ): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      let completed = false;
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error('Timeout'));
        }
      }, timeout);
      Geolocation.getCurrentPosition(
        position => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        error => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: highAccuracy ? 0 : 30000,
          distanceFilter: 0,
        },
      );
    });

  const fetchLocationOptimized = async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    if (lastKnownLocation.current) {
      const age = Date.now() - lastKnownLocation.current.timestamp;
      if (age < 2 * 60 * 1000) {
        setLoadingMessage('Processing location...');
        await new Promise(resolve => setTimeout(() => resolve(undefined), 300));
        return lastKnownLocation.current;
      }
    }
    try {
      setLoadingMessage('Getting your location...');
      const loc = await fetchWithTimeout(false, 2000);
      lastKnownLocation.current = { ...loc, timestamp: Date.now() };
      return loc;
    } catch {
      setLoadingMessage('Pinpointing location...');
      const loc = await fetchWithTimeout(true, 10000);
      lastKnownLocation.current = { ...loc, timestamp: Date.now() };
      return loc;
    }
  };

  const handlePress = async () => {
    if (isProcessing.current || isLoading || cooldownLeft > 0) return;

    if (!selectedMode) {
      toast.show('Please select your work mode first', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
      return;
    }

    isProcessing.current = true;
    setIsLoading(true);
    setLoadingMessage('Processing...');

    try {
      await validateLocationRequirements();
      const location = await fetchLocationOptimized();
      const type = checkedIn ? 'check-out' : 'check-in';
      await dispatch(
        logAttendance({
          type,
          location,
          workMode: selectedMode || null,
        }),
      ).unwrap();

      if (type === 'check-in') {
        setCooldownLeft(10);
      }

      toast.show(
        type === 'check-out'
          ? ` Checked out at ${formatTime(new Date())}`
          : ` Checked in at ${formatTime(new Date())}`,
        { type: 'success', placement: 'top', duration: 3000 },
      );
    } catch (error: any) {
      console.error('Attendance failed:', error);
      toast.show(error.message || 'Something went wrong', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
      if (['PERMISSION_REQUIRED', 'GPS_OFF'].includes(error.message)) {
        handleLocationError(error);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('Processing...');
      isProcessing.current = false;
    }
  };

  const handleLocationError = (error: Error) => {
    if (error.message === 'PERMISSION_REQUIRED') {
      toast.show('Permission Required — Tap to enable', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        onPress: () => Linking.openSettings(),
      });
    } else if (error.message === 'GPS_OFF') {
      toast.show('Please turn on Location', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        onPress: () => {
          if (Platform.OS === 'android') {
            (Linking as any)
              .sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
              .catch(() => Linking.openSettings());
          } else {
            Linking.openSettings();
          }
        },
      });
    }
  };

  const handleEnableLocation = () => {
    if (Platform.OS === 'android') {
      (Linking as any)
        .sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
        .then(() => setShowLocationModal(false))
        .catch(() => {
          Linking.openSettings();
          setShowLocationModal(false);
        });
    } else {
      Linking.openSettings();
      setShowLocationModal(false);
    }
  };

  const pressIn = () => {
    if (!isLoading && cooldownLeft === 0)
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 2,
      useNativeDriver: true,
    }).start();
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const handleSetWorkMode = (mode: string) => {
    dispatch(setWorkMode(mode));
    setShowDropdown(false);
  };

  return {
    scale,
    attendanceStats,
    showDropdown,
    setShowDropdown: toggleDropdown,
    showLocationModal,
    setShowLocationModal,
    isLoading,
    loadingMessage,
    isFetchingToday,
    refreshing,
    onRefresh,
    cooldownLeft,
    checkedIn,
    selectedMode,
    auth,
    handlePress,
    handleEnableLocation,
    handleSetWorkMode,
    pressIn,
    pressOut,
  };
};
