import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
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
import React, { useRef, useState, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import { useToast } from 'react-native-toast-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/api/apiConfig';

const { height } = Dimensions.get('window');

const workModeOptions = [
  { label: 'Work from Home', value: 'WFH', icon: 'home-sharp' },
  { label: 'In Office', value: 'Office', icon: 'business' },
];

const Attendence = () => {
  const scale = useRef(new Animated.Value(1)).current;

  const [checkedIn, setCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [attendanceStats, setAttendanceStats] = useState({
    firstCheckIn: '--:--',
    lastCheckOut: '--:--',
    totalHours: '--:--',
    checkInDate: null as Date | null,
    checkOutDate: null as Date | null,
  });
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('User');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [isFetchingToday, setIsFetchingToday] = useState(true); // loading today's data

  const isProcessing = useRef(false);
  const lastKnownLocation = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);
  const gpsWarmupWatchId = useRef<number | null>(null);

  const navigation = useNavigation();
  const toast = useToast();

  // ═══════════════════════════════════════════════════════════
  // LOAD USER DATA FROM STORAGE
  // ═══════════════════════════════════════════════════════════
  const loadUserData = async () => {
    try {
      const [name, token] = await AsyncStorage.multiGet([
        'userName',
        'authToken',
      ]);
      setUserName(name[1] || 'User');
      setAuthToken(token[1]);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, []),
  );

  // ═══════════════════════════════════════════════════════════
  // LOAD TODAY'S ATTENDANCE ON MOUNT (GET /api/attendance/today)
  // Restores checkedIn state + stats after app restart
  // ═══════════════════════════════════════════════════════════
  const loadTodayAttendance = async () => {
    try {
      setIsFetchingToday(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/attendance/today`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      console.log('📅 Today attendance:', data);

      if (data.success) {
        // Restore checkedIn state
        if (data.hasCheckedIn && !data.hasCheckedOut) {
          setCheckedIn(true);
        } else if (data.hasCheckedOut) {
          setCheckedIn(false); // already fully done for today
        }

        // Restore selected work mode if checked in
        if (data.workMode) {
          setSelectedMode(data.workMode);
        }

        // ✅ Use raw ISO timestamps and format on device (IST timezone)
        // Never trust pre-formatted time strings from server (UTC)
        if (data.attendance) {
          const checkInDate = data.attendance.checkInTime
            ? new Date(data.attendance.checkInTime)
            : null;
          const checkOutDate = data.attendance.checkOutTime
            ? new Date(data.attendance.checkOutTime)
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
      }
    } catch (error) {
      console.error('❌ Load today attendance error:', error);
    } finally {
      setIsFetchingToday(false);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

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
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setTimeout(() => checkGPSStatus(), 500);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  // GPS HELPERS
  // ═══════════════════════════════════════════════════════════
  const warmupGPS = () => {
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
  };

  const hasLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    }
    const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return result === RESULTS.GRANTED;
  };

  const isGPSEnabled = (): Promise<boolean> =>
    new Promise(resolve => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        error => resolve(error.code !== 2),
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 },
      );
    });

  const checkGPSStatus = async () => {
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
  };

  const validateLocationRequirements = async (): Promise<void> => {
    if (!(await hasLocationPermission()))
      throw new Error('PERMISSION_REQUIRED');
    if (!(await isGPSEnabled())) throw new Error('GPS_OFF');
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
            Linking.sendIntent(
              'android.settings.LOCATION_SOURCE_SETTINGS',
            ).catch(() => Linking.openSettings());
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
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
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
  const logAttendance = async (
    type: 'check-in' | 'check-out',
    location: { lat: number; lng: number },
  ) => {
    try {
      setLoadingMessage('Saving attendance...');

      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated. Please login again.');

      // ── Determine endpoint ────────────────────────────────────
      // ✅ Fixed: correct endpoint names (no hyphen) + switches per type
      const endpoint =
        type === 'check-in'
          ? `${API_CONFIG.BASE_URL}/api/attendance/checkin`
          : `${API_CONFIG.BASE_URL}/api/attendance/checkout`;

      // ✅ Fixed: backend expects { latitude, longitude, workMode }
      const body: Record<string, any> = {
        latitude: location.lat,
        longitude: location.lng,
      };

      // workMode only needed on check-in
      if (type === 'check-in') {
        body.workMode = selectedMode; // 'Office' or 'WFH'
      }

      console.log(`📤 ${type} request to ${endpoint}:`, body);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log(`📥 ${type} response:`, data);

      if (!data.success) {
        // ── Backend error codes ──────────────────────────────────
        switch (data.code) {
          case 'OUT_OF_OFFICE_RADIUS':
            throw new Error(
              `You are ${data.distance}m from the office. Must be within ${data.allowedRadius}m.`,
            );
          case 'OUT_OF_WFH_RADIUS':
            throw new Error(
              `You are ${data.distance}m from your check-in location. Must be within ${data.allowedRadius}m.`,
            );
          case 'ALREADY_CHECKED_IN':
            throw new Error('You are already checked in today.');
          case 'ALREADY_CHECKED_OUT':
            throw new Error('You have already checked out today.');
          case 'NOT_CHECKED_IN':
            throw new Error('You have not checked in today.');
          default:
            throw new Error(data.message || `Failed to ${type}`);
        }
      }

      // ✅ Use raw ISO timestamps from attendance object and format
      // on device — avoids server UTC vs device IST timezone mismatch
      if (data.attendance) {
        const checkInDate = data.attendance.checkInTime
          ? new Date(data.attendance.checkInTime)
          : null;
        const checkOutDate = data.attendance.checkOutTime
          ? new Date(data.attendance.checkOutTime)
          : null;

        setAttendanceStats(prev => ({
          ...prev,
          // formatTime() uses device local timezone — correct IST time ✅
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

      return true;
    } catch (error) {
      console.error('❌ Log attendance error:', error);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE CHECK IN / CHECK OUT PRESS
  // ═══════════════════════════════════════════════════════════
  const handlePress = async () => {
    if (isProcessing.current || isLoading) return;

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
      await logAttendance(type, location);

      setCheckedIn(!checkedIn);

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
      return "Good Morning, mark your Attendance";
    } else if (currentHour >= 12 && currentHour < 17) {
      return "Good Afternoon, mark your Attendance";
    } else {
      return "Good Evening, mark your Attendance";
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ANIMATION
  // ═══════════════════════════════════════════════════════════
  const pressIn = () => {
    if (!isLoading)
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
  const selectedModeData = workModeOptions.find(m => m.value === selectedMode);

  // Show loading skeleton while fetching today's data
  if (isFetchingToday) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 12, color: 'grey' }}>
          Loading attendance...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey {userName}!</Text>
          <Text style={styles.subtitle}>
            {getGreetingMessage()}
          </Text>
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
                size={24}
                color="#16A34A"
              />
            ) : (
              <Ionicons name="location-sharp" size={24} color="#d40909" />
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
                    setSelectedMode(option.value);
                    setShowDropdown(false);
                  }}
                >
                  <Ionicons name={option.icon} size={18} color="#333" />
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
                isLoading && styles.middleRingDisabled,
              ]}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="large" color={activeColor} />
                  <Text style={[styles.loadingText, { color: activeColor }]}>
                    {loadingMessage}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="touch-app"
                    size={40}
                    color={activeColor}
                  />
                  <Text style={[styles.text, { color: activeColor }]}>
                    {label}
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
          <MaterialIcons name="access-time-filled" size={24} color="#16A34A" />
          <Text style={styles.statValue}>{attendanceStats.firstCheckIn}</Text>
          <Text style={styles.statLabel}>Check In</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="access-time-filled" size={24} color="#DC2626" />
          <Text style={styles.statValue}>{attendanceStats.lastCheckOut}</Text>
          <Text style={styles.statLabel}>Check Out</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="more-time" size={24} color="#b49e9e" />
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
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.modernIconContainer}>
              <View style={styles.iconPulseOuter}>
                <View style={styles.iconPulseInner}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location" size={40} color="#FFFFFF" />
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
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
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
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { color: 'grey', marginTop: 2 },
  dropdownContainer: { position: 'relative', zIndex: 1000 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dropdownItemSelected: { backgroundColor: '#E8F5E9' },
  dropdownItemText: { fontSize: 14, color: '#333', textAlign: 'center' },
  dropdownItemTextSelected: { color: '#16A34A', fontWeight: '500' },
  timeContainer: {
    height: height * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  time: { fontSize: 50, fontWeight: '600' },
  date: { fontSize: 18, color: 'grey' },
  screen: {
    justifyContent: 'center',
    alignItems: 'center',
    height: height * 0.42,
  },
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F5F6F8',
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
    backgroundColor: '#FFFFFF',
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 20,
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTopBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
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
    backgroundColor: '#F5F5F5',
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
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernModalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  modernButtonsContainer: { gap: 12, marginBottom: 16 },
  modernPrimaryButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#16A34A',
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
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modernSecondaryButtonText: {
    color: '#6B7280',
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
  privacyText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
});
