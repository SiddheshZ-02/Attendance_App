import {
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useToast } from 'react-native-toast-notifications';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchTodayAttendance,
  logAttendance,
  setWorkMode,
} from '../../features/attendance/attendanceSlice';
import { createThemedStyles, useResponsive } from '../../utils/responsive';

const workModeOptions = [
  { label: 'Work from Home', value: 'WFH', icon: 'home-sharp' },
  { label: 'In Office', value: 'Office', icon: 'business' },
];

const Attendence = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const { wp } = useResponsive();
  const styles = useStyles();

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [attendanceStats, setAttendanceStats] = useState({
    firstCheckIn: '--:--',
    lastCheckOut: '--:--',
    totalHours: '--:--',
    checkInDate: null as Date | null,
    checkOutDate: null as Date | null,
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [isFetchingToday, setIsFetchingToday] = useState(true); // loading today's data
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds to wait after check-in

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

  // ═══════════════════════════════════════════════════════════
  // LOAD TODAY'S ATTENDANCE ON MOUNT (GET /api/attendance/today)
  // Restores checkedIn state + stats after app restart
  // ═══════════════════════════════════════════════════════════
  const loadTodayAttendance = useCallback(async () => {
    try {
      setIsFetchingToday(true);
      const result = await dispatch(fetchTodayAttendance()).unwrap();

      if (result && result.attendance) {
        const checkInDate = result.attendance.checkInTime
          ? new Date(result.attendance.checkInTime)
          : null;
        const checkOutDate = result.attendance.checkOutTime
          ? new Date(result.attendance.checkOutTime)
          : null;

        setAttendanceStats(prev => ({
          ...prev,
          firstCheckIn: checkInDate ? formatTime(checkInDate) : '--:--',
          lastCheckOut: checkOutDate ? formatTime(checkOutDate) : '--:--',
          totalHours:
            checkInDate && checkOutDate
              ? calculateTotalHours(checkInDate, checkOutDate)
              : '--:--',
          checkInDate,
          checkOutDate,
        }));
      }
    } catch (error) {
      console.error('❌ Load today attendance error:', error);
    } finally {
      setIsFetchingToday(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadTodayAttendance();
  }, [loadTodayAttendance]);

  // ═══════════════════════════════════════════════════════════
  // GPS HELPERS
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // GPS WARMUP ON MOUNT
  // ═══════════════════════════════════════════════════════════
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cooldown countdown after successful check-in to avoid immediate checkout tap
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(
      () => setCooldownLeft(prev => (prev > 0 ? prev - 1 : 0)),
      1000,
    );
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  // ═══════════════════════════════════════════════════════════
  // LIVE TOTAL HOURS UPDATE (while checked in)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (checkedIn && attendanceStats.checkInDate) {
      interval = setInterval(() => {
        const now = new Date();
        const total = calculateTotalHours(attendanceStats.checkInDate!, now);
        setAttendanceStats(prev => ({ ...prev, totalHours: total }));
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkedIn, attendanceStats.checkInDate]);

  // ═══════════════════════════════════════════════════════════
  // LOCATION VALIDATION
  // ═══════════════════════════════════════════════════════════
  const validateLocationRequirements = async (): Promise<void> => {
    const permitted = await ensureLocationPermission();
    if (!permitted) throw new Error('PERMISSION_REQUIRED');
    const gpsOk = await isGPSEnabled();
    if (!gpsOk) throw new Error('GPS_OFF');
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
    } else if (
      error.message.includes('OUT_OF_OFFICE_RADIUS') ||
      error.message.includes('OUT_OF_WFH_RADIUS')
    ) {
      // Distance errors from backend — already shown as toast via API response handler
    } else {
      toast.show(error.message || 'Unable to access location', {
        type: 'danger',
        placement: 'top',
        duration: 3000,
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

  // ═══════════════════════════════════════════════════════════
  // LOG ATTENDANCE — calls /api/attendance/checkin or /checkout
  // ═══════════════════════════════════════════════════════════
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
      const result = await dispatch(
        logAttendance({
          type,
          location,
          workMode: selectedMode || null,
        }),
      ).unwrap();

      if (result.attendance) {
        const checkInDate = result.attendance.checkInTime
          ? new Date(result.attendance.checkInTime)
          : null;
        const checkOutDate = result.attendance.checkOutTime
          ? new Date(result.attendance.checkOutTime)
          : null;

        setAttendanceStats(prev => ({
          ...prev,
          firstCheckIn: checkInDate
            ? formatTime(checkInDate)
            : prev.firstCheckIn,
          lastCheckOut: checkOutDate
            ? formatTime(checkOutDate)
            : prev.lastCheckOut,
          totalHours:
            checkInDate && checkOutDate
              ? calculateTotalHours(checkInDate, checkOutDate)
              : prev.totalHours,
          checkInDate,
          checkOutDate,
        }));
      }

      // Start a 10s cooldown ONLY after a successful check-in
      if (!checkedIn) {
        setCooldownLeft(10);
      }

      toast.show(
        checkedIn
          ? ` Checked out at ${formatTime(new Date())}`
          : ` Checked in at ${formatTime(new Date())}`,
        { type: 'success', placement: 'top', duration: 3000 },
      );
    } catch (error: any) {
      console.error('Attendance failed:', error);
      // Show backend distance/business errors as toast
      toast.show(error.message || 'Something went wrong', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
      // GPS errors (PERMISSION_REQUIRED, GPS_OFF) go through handleLocationError
      if (['PERMISSION_REQUIRED', 'GPS_OFF'].includes(error.message)) {
        handleLocationError(error);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('Processing...');
      isProcessing.current = false;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // FORMAT UTILITIES
  // ═══════════════════════════════════════════════════════════
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? `0${minutes}` : minutes;
    return `${h}:${m} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${
      months[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()} · ${days[date.getDay()]}`;
  };

  const calculateTotalHours = (checkIn: Date, checkOut: Date) => {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    if (diffMs <= 0) return '--:--';
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
  };

  const getGreetingMessage = () => {
    const currentHour = new Date().getHours();

    if (currentHour >= 5 && currentHour < 12) {
      return 'Good Morning, mark your Attendance';
    } else if (currentHour >= 12 && currentHour < 17) {
      return 'Good Afternoon, mark your Attendance';
    } else {
      return 'Good Evening, mark your Attendance';
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ANIMATION
  // ═══════════════════════════════════════════════════════════
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

  const activeColor = checkedIn ? '#DC2626' : '#16A34A';
  const label = checkedIn ? 'Check Out' : 'Check In';
  const displayLabel = cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : label;
  const selectedModeData = workModeOptions.find(m => m.value === selectedMode);

  // Show loading skeleton while fetching today's data
  if (isFetchingToday) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingAttendanceText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey {auth.user?.name || 'User'}!</Text>
          <Text style={styles.subtitle}>{getGreetingMessage()}</Text>
        </View>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
            disabled={isLoading || checkedIn} // lock mode after check-in
          >
            {selectedModeData ? (
              <Ionicons
                name={selectedModeData.icon}
                size={wp(24)}
                color="#16A34A"
              />
            ) : (
              <Ionicons name="location-sharp" size={wp(24)} color="#d40909" />
            )}
          </TouchableOpacity>
          {showDropdown && !checkedIn && (
            <View style={styles.dropdownMenu}>
              {workModeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    selectedMode === option.value &&
                      styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    dispatch(setWorkMode(option.value));
                    setShowDropdown(false);
                  }}
                >
                  <Ionicons name={option.icon} size={wp(18)} color="#333" />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedMode === option.value &&
                        styles.dropdownItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* SELECTED MODE LABEL */}
      {selectedModeData && (
        <Text
          style={[styles.dropdownItemText, styles.dropdownItemTextSelected]}
        >
          {selectedModeData.label}
        </Text>
      )}

      {/* TIME */}
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
      </View>

      {/* CHECK IN / OUT BUTTON */}
      <View style={styles.screen}>
        <View style={styles.outerRing}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              onPressIn={pressIn}
              onPressOut={pressOut}
              onPress={handlePress}
              style={[
                styles.middleRing,
                (isLoading || cooldownLeft > 0) && styles.middleRingDisabled,
              ]}
              disabled={isLoading || cooldownLeft > 0}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="large" color={activeColor} />
                  <Text style={[styles.loadingText, { color: activeColor }]}>
                    {loadingMessage}
                  </Text>
                </>
              ) : cooldownLeft > 0 ? (
                <>
                  <MaterialIcons
                    name="timer"
                    size={wp(40)}
                    color={activeColor}
                  />
                  <Text style={[styles.text, { color: activeColor }]}>
                    {displayLabel}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="touch-app"
                    size={wp(40)}
                    color={activeColor}
                  />
                  <Text style={[styles.text, { color: activeColor }]}>
                    {displayLabel}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* STATS */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <MaterialIcons
            name="access-time-filled"
            size={wp(24)}
            color="#16A34A"
          />
          <Text style={styles.statValue}>{attendanceStats.firstCheckIn}</Text>
          <Text style={styles.statLabel}>Check In</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons
            name="access-time-filled"
            size={wp(24)}
            color="#DC2626"
          />
          <Text style={styles.statValue}>{attendanceStats.lastCheckOut}</Text>
          <Text style={styles.statLabel}>Check Out</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="more-time" size={wp(24)} color="#b49e9e" />
          <Text style={styles.statValue}>{attendanceStats.totalHours}</Text>
          <Text style={styles.statLabel}>Total Hrs</Text>
        </View>
      </View>

      {/* LOCATION MODAL */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modernModalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowLocationModal(false)}
          />
          <Animated.View style={styles.modernModalContent}>
            <View style={styles.modalTopBar} />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Ionicons name="close" size={wp(24)} color="#666" />
            </TouchableOpacity>
            <View style={styles.modernIconContainer}>
              <View style={styles.iconPulseOuter}>
                <View style={styles.iconPulseInner}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location" size={wp(40)} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.modernTextContainer}>
              <Text style={styles.modernModalTitle}>
                Location Access Needed
              </Text>
              <Text style={styles.modernModalSubtitle}>
                To mark your attendance accurately, we need access to your
                device location
              </Text>
            </View>
            <View style={styles.modernButtonsContainer}>
              <TouchableOpacity
                style={styles.modernPrimaryButton}
                onPress={handleEnableLocation}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="navigate" size={wp(20)} color="#FFFFFF" />
                  <Text style={styles.modernPrimaryButtonText}>
                    Open Settings
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modernSecondaryButton}
                onPress={() => setShowLocationModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modernSecondaryButtonText}>
                  I'll Do It Later
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={wp(14)} color="#16A34A" />
              <Text style={styles.privacyText}>
                Your location is only used for attendance tracking
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default Attendence;

const useStyles = createThemedStyles((colors, radius, spacing) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    padding: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { color: 'grey', marginTop: 2 },
  dropdownContainer: { position: 'relative', zIndex: 1000 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  dropdownItemSelected: { backgroundColor: '#E8F5E9' },
  dropdownItemText: { fontSize: 14, color: '#333', textAlign: 'center' },
  dropdownItemTextSelected: { color: colors.success, fontWeight: '500' },
  timeContainer: {
    height: '20%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  time: { fontSize: 50, fontWeight: '600' },
  date: { fontSize: 18, color: 'grey' },
  screen: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '42%',
  },
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
  },
  middleRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  middleRingDisabled: { opacity: 0.8 },
  text: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  loadingText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAttendanceText: {
    marginTop: 12,
    color: 'grey',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  statLabel: { color: 'grey', marginTop: 4 },
  modernModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modernModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTopBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.xs,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modernIconContainer: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  iconPulseOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(250,204,21,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPulseInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(250,204,21,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modernTextContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  modernModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modernModalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  modernButtonsContainer: { gap: 12, marginBottom: 16 },
  modernPrimaryButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modernPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  modernSecondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modernSecondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  privacyText: {
    fontSize: 12,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
}));
