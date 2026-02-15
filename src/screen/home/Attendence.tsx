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
import { useNavigation } from '@react-navigation/native';
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

  // GPS & Location states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const isProcessing = useRef(false);

  // ⚡ OPTIMIZATION: Location caching
  const lastKnownLocation = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);
  const gpsWarmupWatchId = useRef<number | null>(null);

  const navigation = useNavigation();
  const toast = useToast();

  // ============ GPS WARMUP ON MOUNT ============
  useEffect(() => {
    checkGPSStatus();
    warmupGPS();

    return () => {
      if (gpsWarmupWatchId.current !== null) {
        Geolocation.clearWatch(gpsWarmupWatchId.current);
      }
    };
  }, []);

  // ============ RECHECK ON APP FOCUS ============
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - rechecking GPS');
        setTimeout(() => {
          checkGPSStatus();
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ============ LIVE TIME UPDATE ============
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============ GPS WARMUP (BACKGROUND) ============
  const warmupGPS = () => {
    console.log('🔥 Warming up GPS in background...');

    gpsWarmupWatchId.current = Geolocation.watchPosition(
      position => {
        console.log('🌡️ GPS warmed up successfully');
        lastKnownLocation.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        };
      },
      error => {
        console.log('⚠️ GPS warmup error (non-critical):', error.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
        distanceFilter: 50,
      },
    );
  };

  // ============ HELPER: Check Permission ============
  const hasLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    } else {
      const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    }
  };

  // ============ HELPER: Check if GPS is ON ============
  const isGPSEnabled = (): Promise<boolean> => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        error => {
          if (error.code === 2) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 },
      );
    });
  };

  // ============ CHECK GPS STATUS (PASSIVE) ============
  const checkGPSStatus = async () => {
    try {
      const hasPermission = await hasLocationPermission();
      const gpsEnabled = await isGPSEnabled();

      if (!hasPermission || !gpsEnabled) {
        setShowLocationModal(true);
      } else {
        console.log('✅ Location ready');
        setShowLocationModal(false);
        warmupGPS();
      }
    } catch (error) {
      console.error('GPS check error:', error);
    }
  };

  // ============ VALIDATE LOCATION (ACTIVE - BEFORE CHECK-IN) ============
  const validateLocationRequirements = async (): Promise<void> => {
    const hasPermission = await hasLocationPermission();

    if (!hasPermission) {
      throw new Error('PERMISSION_REQUIRED');
    }

    const gpsEnabled = await isGPSEnabled();

    if (!gpsEnabled) {
      throw new Error('GPS_OFF');
    }

    console.log('✅ Location requirements validated');
  };

  // ============ HANDLE LOCATION ERROR (WITH TOAST) ============
  const handleLocationError = (error: Error) => {
    const errorMessage = error.message;

    if (errorMessage === 'PERMISSION_REQUIRED') {
      toast.show('Permission Required - Tap to enable', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
        onPress: () => Linking.openSettings(),
      });
    } else if (errorMessage === 'GPS_OFF') {
      toast.show('Location Required', {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
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
    } else {
      toast.show(error.message || 'Unable to access location', {
        type: 'danger',
        placement: 'top',
        duration: 3000,
        animationType: 'slide-in',
      });
    }
  };

  // ============ HANDLE ENABLE LOCATION FROM MODAL ============
  const handleEnableLocation = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
        .then(() => {
          setShowLocationModal(false);
          toast.show('Enable location and grant permission', {
            type: 'normal',
            placement: 'top',
            duration: 4000,
          });
        })
        .catch(() => {
          Linking.openSettings();
          setShowLocationModal(false);
        });
    } else {
      Linking.openSettings();
      setShowLocationModal(false);
      toast.show('Turn ON location services and grant permission', {
        type: 'normal',
        placement: 'top',
        duration: 4000,
      });
    }
  };

  // ============ OPTIMIZED LOCATION FETCH ============
  const fetchLocationOptimized = async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    console.log('🔍 Starting optimized location fetch...');

    if (lastKnownLocation.current) {
      const age = Date.now() - lastKnownLocation.current.timestamp;
      const twoMinutes = 2 * 60 * 1000;

      if (age < twoMinutes) {
        console.log('✅ Using cached location');
        setLoadingMessage('Processing location...');
        await new Promise(resolve => setTimeout(resolve, 300));
        return lastKnownLocation.current;
      }
    }

    try {
      setLoadingMessage('Getting your location...');
      const quickLocation = await fetchWithTimeout(false, 2000);
      lastKnownLocation.current = { ...quickLocation, timestamp: Date.now() };
      return quickLocation;
    } catch (quickError) {
      console.log('⚠️ Quick fetch failed, trying high accuracy...');
    }

    try {
      setLoadingMessage('Pinpointing location...');
      const preciseLocation = await fetchWithTimeout(true, 10000);
      lastKnownLocation.current = { ...preciseLocation, timestamp: Date.now() };
      return preciseLocation;
    } catch (error) {
      throw new Error(
        'Unable to get your location. Please ensure GPS is enabled.',
      );
    }
  };

  // ============ FETCH WITH TIMEOUT HELPER ============
  const fetchWithTimeout = (
    highAccuracy: boolean,
    timeout: number,
  ): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      let completed = false;

      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error(`Timeout`));
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
          timeout: timeout,
          maximumAge: highAccuracy ? 0 : 30000,
          distanceFilter: 0,
        },
      );
    });
  };

  // ============ LOG ATTENDANCE ============
  const logAttendance = async (
    type: 'check-in' | 'check-out',
    location: { lat: number; lng: number },
  ) => {
    try {
      setLoadingMessage('Saving attendance...');

      const timestamp = new Date();

      const attendanceData = {
        type,
        mode: selectedMode,
        location: {
          latitude: location.lat,
          longitude: location.lng,
        },
        timestamp: timestamp.toISOString(),
        time: formatTime(timestamp),
      };

      console.log('📍 Logging attendance:', attendanceData);

      // ⚡ REPLACE WITH YOUR API CALL
      await new Promise(resolve => setTimeout(resolve, 500));

      if (type === 'check-in') {
        setAttendanceStats(prev => ({
          ...prev,
          firstCheckIn: formatTime(timestamp),
        }));
      } else {
        setAttendanceStats(prev => ({
          ...prev,
          lastCheckOut: formatTime(timestamp),
        }));
      }

      return true;
    } catch (error) {
      console.error('Log attendance error:', error);
      throw error;
    }
  };

  // ============ HANDLE CHECK IN/OUT (WITH TOAST) ============
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
          ? `Checked out at ${formatTime(new Date())}`
          : `Checked in at ${formatTime(new Date())}`,
        {
          type: 'success',
          placement: 'top',
          duration: 3000,
        },
      );
    } catch (error: any) {
      console.error('Attendance marking failed:', error);
      handleLocationError(error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('Processing...');
      isProcessing.current = false;
    }
  };

  // ============ FORMAT UTILITIES ============
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
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

    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();

    return `${month} ${dayNum}, ${year} · ${day}`;
  };


const calculateTotalHours = (checkIn: Date, checkOut: Date) => {
  const diffMs = checkOut.getTime() - checkIn.getTime();

  if (diffMs <= 0) return '--:--';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const formattedHours = hours < 10 ? `0${hours}` : hours;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${formattedHours}:${formattedMinutes}`;
};



useEffect(() => {
  let interval: NodeJS.Timeout;

  if (checkedIn && attendanceStats.checkInDate) {
    interval = setInterval(() => {
      const now = new Date();
      const total = calculateTotalHours(attendanceStats.checkInDate!, now);

      setAttendanceStats(prev => ({
        ...prev,
        totalHours: total,
      }));
    }, 60000); // update every 1 min
  }

  return () => clearInterval(interval);
}, [checkedIn, attendanceStats.checkInDate]);



  // ============ ANIMATION HANDLERS ============
  const pressIn = () => {
    if (!isLoading) {
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    }
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 2,
      useNativeDriver: true,
    }).start();
  };

  // ============ UI LOGIC ============
  const activeColor = checkedIn ? '#DC2626' : '#16A34A';
  const label = checkedIn ? 'Check Out' : 'Check In';
  const selectedModeData = workModeOptions.find(m => m.value === selectedMode);

  return (
    <View style={styles.container}>
      {/* ============ HEADER ============ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey Siddhesh !</Text>
          <Text style={styles.subtitle}>Good Morning Mark your Attendance</Text>
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
            disabled={isLoading}
          >
            {selectedModeData ? (
              <Ionicons
                name={selectedModeData.icon}
                size={24}
                color="#16A34A"
              />
            ) : (
              <Ionicons name="location-sharp" size={24} color="#b49e9e" />
            )}
          </TouchableOpacity>

          {showDropdown && (
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
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ============ SELECTED MODE LABEL ============ */}
      {selectedModeData && (
        <Text
          style={[
            styles.dropdownItemText,
            selectedMode === selectedModeData?.value &&
              styles.dropdownItemTextSelected,
          ]}
        >
          {selectedModeData?.label}
        </Text>
      )}

      {/* ============ TIME SECTION ============ */}
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
      </View>

      {/* ============ CHECK IN/OUT BUTTON ============ */}
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

      {/* ============ STATS ============ */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <MaterialIcons name="access-time-filled" size={24} color="#16A34A" />
          <Text style={styles.statValue}>{attendanceStats.firstCheckIn}</Text>
          <Text style={styles.statLabel}>Check In(First)</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="access-time-filled" size={24} color="#DC2626" />
          <Text style={styles.statValue}>{attendanceStats.lastCheckOut}</Text>
          <Text style={styles.statLabel}>Check Out(Last)</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="more-time" size={24} color="#b49e9e" />
          <Text style={styles.statValue}>{attendanceStats.totalHours}</Text>
          <Text style={styles.statLabel}>Total Hrs</Text>
        </View>
      </View>

      {/* ============ MODERN LOCATION MODAL ============ */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modernModalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowLocationModal(false)}
          />

          <Animated.View style={styles.modernModalContent}>
            {/* Decorative Top Bar */}
            <View style={styles.modalTopBar} />

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Animated Location Icon */}
            <View style={styles.modernIconContainer}>
              <View style={styles.iconPulseOuter}>
                <View style={styles.iconPulseInner}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location" size={40} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>

            {/* Title & Description */}
            <View style={styles.modernTextContainer}>
              <Text style={styles.modernModalTitle}>
                Location Access Needed
              </Text>
              <Text style={styles.modernModalSubtitle}>
                To mark your attendance accurately, we need access to your
                device location
              </Text>
            </View>

            {/* Modern Buttons */}
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

            {/* Privacy Note */}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  subtitle: {
    color: 'grey',
    marginTop: 2,
  },

  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },

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
    minWidth: 20,
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

  dropdownItemSelected: {
    backgroundColor: '#E8F5E9',
  },

  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },

  dropdownItemTextSelected: {
    color: '#16A34A',
    fontWeight: '500',
  },

  timeContainer: {
    height: height * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  time: {
    fontSize: 50,
    fontWeight: '600',
  },

  date: {
    fontSize: 18,
    color: 'grey',
  },

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

  middleRingDisabled: {
    opacity: 0.8,
  },

  text: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 20,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },

  statLabel: {
    color: 'grey',
    marginTop: 4,
  },

  // ============ MODERN MODAL STYLES ============
  modernModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

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

  modernIconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },

  iconPulseOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconPulseInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(250, 204, 21, 0.15)', // soft yellow background
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FACC15', // alert yellow
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FACC15', // yellow shadow
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

  stepsContainer: {
    backgroundColor: ' #F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: ' #E5E7EB',
  },

  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ' #16A34A',
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  stepDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 17,
    marginVertical: 8,
  },

  modernButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },

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

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

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

  privacyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
