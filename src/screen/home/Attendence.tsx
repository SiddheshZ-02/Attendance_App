import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon1 from 'react-native-vector-icons/MaterialIcons';
import Icon2 from 'react-native-vector-icons/Entypo';
import Geolocation from '@react-native-community/geolocation';

const { height } = Dimensions.get('window');

// Custom Toast Component
const Toast = ({ 
  visible, 
  message, 
  type = 'success', 
  onClose 
}: { 
  visible: boolean; 
  message: string; 
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#16A34A';
      case 'error': return '#DC2626';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#16A34A';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: getBackgroundColor(),
        }
      ]}
    >
      <View style={styles.toastContent}>
        <Icon1 
          name={
            type === 'success' ? 'check-circle' :
            type === 'error' ? 'error' :
            type === 'warning' ? 'warning' :
            'info'
          } 
          size={20} 
          color="#FFFFFF" 
        />
        <Text style={styles.toastText}>{message}</Text>
        <TouchableOpacity onPress={hideToast} style={styles.toastCloseButton}>
          <Icon2 name="cross" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Interface for location data
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Interface for attendance record
interface AttendanceRecord {
  id?: string;
  userId: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  location?: LocationData;
  status: 'checked_in' | 'checked_out';
}

// Company location (for geofencing)
const COMPANY_LOCATION = {
  latitude: 19.182464, // Mumbai, India - replace with your company location
  longitude: 73.050761,
  radius: 50, // 50 meters radius for geofencing
};

const Attendence = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const [checkedIn, setCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    firstCheckIn: '--:--',
    lastCheckOut: '--:--',
    totalHours: '--:--'
  });
  const [toast, setToast] = useState({ 
    visible: false, 
    message: '', 
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // New state variables for enhanced location handling
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const navigation = useNavigation();

  // Helper function to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Helper function to hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Request location permission on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Update time every second for live time display
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if it's midnight to reset attendance data
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        // Reset all attendance data at midnight
        setAttendanceStats({
          firstCheckIn: '--:--',
          lastCheckOut: '--:--',
          totalHours: '--:--'
        });
        setCheckedIn(false);
      }
    }, 1000); // Update every second instead of every minute

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to verify attendance.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setLocationPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
      }
    } else {
      // For iOS, request authorization and check status
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        setLocationPermission(status === 'granted' || status === 'limited');
      } catch (err) {
        console.warn('iOS location permission error:', err);
      }
    }
  };

  // Enhanced location fetching with retry mechanism
  const getCurrentLocation = async (retryCount = 0): Promise<LocationData> => {
    const maxRetries = 3;
    const baseTimeout = 15000; // 15 seconds
    const timeoutIncrement = 5000; // Increase timeout by 5 seconds each retry
    
    return new Promise((resolve, reject) => {
      if (!locationPermission) {
        reject(new Error('Location permission not granted. Please enable location permissions in settings.'));
        return;
      }

      // Clear previous error
      setLocationError(null);
      
      // Use cached location if available and recent (within 30 seconds)
      if (lastKnownLocation && Date.now() - lastKnownLocation.timestamp < 30000) {
        console.log('Using cached location');
        resolve(lastKnownLocation);
        return;
      }

      setLocationLoading(true);
      
      const timeout = baseTimeout + (retryCount * timeoutIncrement);
      
      Geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
          };
          
          // Cache the location
          setLastKnownLocation(locationData);
          setCurrentLocation(locationData);
          setLocationLoading(false);
          setLocationRetryCount(0); // Reset retry count on success
          resolve(locationData);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationLoading(false);
          
          // Handle different error types
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              setLocationError('Location permission denied. Please enable location access in settings.');
              reject(new Error('Location permission denied'));
              break;
              
            case 2: // POSITION_UNAVAILABLE
              setLocationError('Location unavailable. Please check your GPS settings and try again.');
              if (retryCount < maxRetries) {
                setLocationRetryCount(retryCount + 1);
                setTimeout(() => {
                  getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
                }, 2000); // Wait 2 seconds before retry
              } else {
                reject(new Error('Location service unavailable'));
              }
              break;
              
            case 3: // TIMEOUT
              setLocationError(`Location request timed out. Attempt ${retryCount + 1} of ${maxRetries + 1}`);
              if (retryCount < maxRetries) {
                setLocationRetryCount(retryCount + 1);
                showToast(`Retrying... (${retryCount + 1}/${maxRetries})`, 'info');
                setTimeout(() => {
                  getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
                }, 3000); // Wait 3 seconds before retry with longer timeout
              } else {
                reject(new Error('Location request timed out after multiple attempts'));
              }
              break;
              
            default:
              setLocationError('Unable to get location. Please try again.');
              if (retryCount < maxRetries) {
                setLocationRetryCount(retryCount + 1);
                setTimeout(() => {
                  getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
                }, 2000);
              } else {
                reject(new Error('Unknown location error'));
              }
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: timeout,
          maximumAge: 10000,
          distanceFilter: 10 // Only update if position changes by 10 meters
        }
      );
    });
  };

  // Manual location refresh function
  const refreshLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const location = await getCurrentLocation(0);
      showToast('Location updated successfully', 'success');
      return location;
    } catch (error) {
      showToast('Failed to refresh location', 'error');
      throw error;
    } finally {
      setLocationLoading(false);
    }
  };

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if user is within geofence
  const isWithinGeofence = (location: LocationData): boolean => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      COMPANY_LOCATION.latitude,
      COMPANY_LOCATION.longitude
    );
    return distance <= COMPANY_LOCATION.radius;
  };

  // Format time in HH:MM AM/PM format
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Calculate total hours between check-in and check-out
  const calculateTotalHours = (checkInTime: string, checkOutTime: string): string => {
    if (checkInTime === '--:--' || checkOutTime === '--:--') {
      return '--:--';
    }

    try {
      // Parse check-in time
      const [inTimePart, inAmPm] = checkInTime.split(' ');
      const [inHoursStr, inMinutesStr] = inTimePart.split(':');
      let inHours = parseInt(inHoursStr, 10);
      const inMinutes = parseInt(inMinutesStr, 10);
      
      if (inAmPm === 'PM' && inHours !== 12) {
        inHours += 12;
      } else if (inAmPm === 'AM' && inHours === 12) {
        inHours = 0;
      }

      // Parse check-out time
      const [outTimePart, outAmPm] = checkOutTime.split(' ');
      const [outHoursStr, outMinutesStr] = outTimePart.split(':');
      let outHours = parseInt(outHoursStr, 10);
      const outMinutes = parseInt(outMinutesStr, 10);
      
      if (outAmPm === 'PM' && outHours !== 12) {
        outHours += 12;
      } else if (outAmPm === 'AM' && outHours === 12) {
        outHours = 0;
      }

      // Create Date objects for today
      const now = new Date();
      const checkInDate = new Date(now);
      checkInDate.setHours(inHours, inMinutes, 0, 0);
      
      const checkOutDate = new Date(now);
      checkOutDate.setHours(outHours, outMinutes, 0, 0);

      // Handle case where check-out is next day (e.g., night shift)
      if (checkOutDate < checkInDate) {
        checkOutDate.setDate(checkOutDate.getDate() + 1);
      }

      // Calculate difference in milliseconds
      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating total hours:', error);
      return '--:--';
    }
  };

  // Calculate total hours between check-in and current time (for live tracking while checked in)
  const calculateLiveTotalHours = (checkInTime: string): string => {
    if (checkInTime === '--:--') {
      return '--:--';
    }

    try {
      // Parse check-in time
      const [inTimePart, inAmPm] = checkInTime.split(' ');
      const [inHoursStr, inMinutesStr] = inTimePart.split(':');
      let inHours = parseInt(inHoursStr, 10);
      const inMinutes = parseInt(inMinutesStr, 10);
      
      if (inAmPm === 'PM' && inHours !== 12) {
        inHours += 12;
      } else if (inAmPm === 'AM' && inHours === 12) {
        inHours = 0;
      }

      // Create Date objects for today
      const now = new Date();
      const checkInDate = new Date(now);
      checkInDate.setHours(inHours, inMinutes, 0, 0);

      // Handle case where check-in was yesterday (e.g., night shift)
      if (checkInDate > now) {
        checkInDate.setDate(checkInDate.getDate() - 1);
      }

      // Calculate difference in milliseconds
      const diffMs = now.getTime() - checkInDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating live total hours:', error);
      return '--:--';
    }
  };

  // Format date in Month Day, Year format
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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();

    return `${month} ${dayNum}, ${year} · ${day}`;
  };

  // Animation handlers for button press
  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 2,
      useNativeDriver: true,
    }).start();
  };

  // Enhanced handlePress function with better location handling
  const handlePress = async () => {
    if (loading) return;
    
    setLoading(true);
    setLocationError(null);
    
    try {
      // Check if location permission is granted first
      if (!locationPermission) {
        showToast('Location permission required. Please enable in settings.', 'error');
        setLoading(false);
        return;
      }

      // Show loading state specifically for location
      showToast('Getting your location...', 'info');
      
      // Get current location with retry mechanism
      const location = await getCurrentLocation();
      
      // Show success message for location acquisition
      showToast('Location acquired successfully', 'success');
      
      // Check if user is within geofence
      if (!isWithinGeofence(location)) {
        showToast(`You must be within ${COMPANY_LOCATION.radius} meters of the office. Current distance: ${Math.round(calculateDistance(location.latitude, location.longitude, COMPANY_LOCATION.latitude, COMPANY_LOCATION.longitude))} meters`, 'error');
        setLoading(false);
        return;
      }

      // Verify location accuracy
      if (location.accuracy > 50) {
        const confirm = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Low Accuracy',
            `Your location accuracy is ${Math.round(location.accuracy)} meters. This might affect attendance recording. Do you want to continue?`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Continue', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!confirm) {
          setLoading(false);
          return;
        }
      }

      const now = new Date();
      
      if (!checkedIn) {
        // Check-in action
        setAttendanceStats({
          firstCheckIn: formatTime(now),
          lastCheckOut: '--:--',
          totalHours: '--:--'
        });
        setCheckedIn(true);
        showToast(`Successfully checked in at ${formatTime(now)}`, 'success');
      } else {
        // Check-out action
        const newStats = {
          ...attendanceStats,
          lastCheckOut: formatTime(now)
        };
        
        if (attendanceStats.firstCheckIn !== '--:--') {
          newStats.totalHours = calculateTotalHours(attendanceStats.firstCheckIn, formatTime(now));
        }
        
        setAttendanceStats(newStats);
        setCheckedIn(false);
        showToast(`Successfully checked out at ${formatTime(now)}`, 'success');
      }
    } catch (error: any) {
      console.error('Attendance operation failed:', error);
      let errorMessage = 'Failed to update attendance.';
      
      if (error.message.includes('permission denied')) {
        errorMessage = 'Location permission denied. Please enable location access in your device settings.';
      } else if (error.message.includes('service unavailable')) {
        errorMessage = 'Location service unavailable. Please check your GPS settings and internet connection.';
      } else if (error.message.includes('timed out')) {
        errorMessage = 'Location request timed out. Please ensure you have good GPS signal and try again.';
      } else if (error.message.includes('Location permission not granted')) {
        errorMessage = 'Location permission not granted. Please enable location access in settings.';
      }
      
      showToast(errorMessage, 'error');
      
      // Offer retry option for location issues
      if (error.message.includes('timed out') || error.message.includes('unavailable')) {
        Alert.alert(
          'Location Issue',
          errorMessage + '\n\nWould you like to try again?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handlePress() }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine active color and label based on check-in state
  const activeColor = checkedIn ? '#DC2626' : '#16A34A'; // Red for checked out, green for checked in
  const label = checkedIn ? 'Check Out' : 'Check In';

  // Show location status indicator
  const locationStatus = currentLocation ? 
    (isWithinGeofence(currentLocation) ? 'In Office' : 'Outside Office') : 
    'Location Unknown';

  // Add this useEffect to handle the case when user navigates back to this screen
  // and we need to restore the correct state
  useEffect(() => {
    // If we have check-in time but no check-out time, user is checked in
    if (attendanceStats.firstCheckIn !== '--:--' && attendanceStats.lastCheckOut === '--:--') {
      setCheckedIn(true);
    } else {
      setCheckedIn(false);
    }
  }, [attendanceStats.firstCheckIn, attendanceStats.lastCheckOut]);

  // Add this useEffect to recalculate total hours when stats change
  useEffect(() => {
    if (attendanceStats.firstCheckIn !== '--:--' && attendanceStats.lastCheckOut !== '--:--') {
      const totalHours = calculateTotalHours(attendanceStats.firstCheckIn, attendanceStats.lastCheckOut);
      setAttendanceStats(prev => ({ ...prev, totalHours }));
    }
  }, [attendanceStats.firstCheckIn, attendanceStats.lastCheckOut]);

  // Add this useEffect to update total hours live while checked in
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (checkedIn && attendanceStats.firstCheckIn !== '--:--') {
      timer = setInterval(() => {
        const liveTotalHours = calculateLiveTotalHours(attendanceStats.firstCheckIn);
        setAttendanceStats(prev => ({ ...prev, totalHours: liveTotalHours }));
      }, 1000); // Update every second
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [checkedIn, attendanceStats.firstCheckIn]);

  // Render location status with refresh option
  const renderLocationStatus = () => (
    <View style={styles.locationStatusContainer}>
      <Icon1 
        name={currentLocation ? (isWithinGeofence(currentLocation) ? 'location-on' : 'location-off') : 'location-searching'} 
        size={20} 
        color={currentLocation && isWithinGeofence(currentLocation) ? '#16A34A' : '#DC2626'} 
      />
      <Text style={[styles.locationStatusText, { color: currentLocation && isWithinGeofence(currentLocation) ? '#16A34A' : '#DC2626' }]}>
        {locationStatus}
      </Text>
      {locationError && (
        <TouchableOpacity onPress={refreshLocation} style={styles.refreshButton}>
          <Icon1 name="refresh" size={16} color="#3B82F6" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey Siddhesh !</Text>
          <Text style={styles.subtitle}>Good Morning Mark your Attendance</Text>
        </View>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Icon name="user-circle" size={40} color="#b49e9e" />
        </TouchableOpacity>
      </View>

      {/* Location Status with Refresh Option */}
      {renderLocationStatus()}

      {/* Location Error Message */}
      {locationError && (
        <View style={styles.errorMessageContainer}>
          <Icon1 name="error" size={16} color="#DC2626" />
          <Text style={styles.errorMessage}>{locationError}</Text>
        </View>
      )}

      {/* Retry Count Indicator */}
      {locationRetryCount > 0 && (
        <View style={styles.retryIndicator}>
          <Text style={styles.retryText}>Retry attempt {locationRetryCount}/3</Text>
        </View>
      )}

      {/* Time Section */}
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
      </View>

      {/* Button */}
      <View style={styles.screen}>
        <View style={styles.outerRing}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              onPressIn={pressIn}
              onPressOut={pressOut}
              onPress={handlePress}
              disabled={loading || locationLoading} // Disable during loading
              style={[styles.middleRing, (loading || locationLoading) && styles.disabledButton]}
            >
              {(loading || locationLoading) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={activeColor} />
                  <Text style={[styles.loadingText, { color: activeColor }]}>
                    {locationLoading ? 'Getting Location...' : 'Processing...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Icon1 name="touch-app" size={40} color={activeColor} />
                  <Text style={[styles.text, { color: activeColor }]}>{label}</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Icon1 name="access-time-filled" size={24} color="#16A34A" />
          <Text style={styles.statValue}>{attendanceStats.firstCheckIn}</Text>
          <Text style={styles.statLabel}>Check In(First)</Text>
        </View>

        <View style={styles.statItem}>
          <Icon1 name="access-time-filled" size={24} color="#DC2626" />
          <Text style={styles.statValue}>{attendanceStats.lastCheckOut}</Text>
          <Text style={styles.statLabel}>Check Out(Last)</Text>
        </View>

        <View style={styles.statItem}>
          <Icon1 name="more-time" size={24} color="#b49e9e" />
          <Text style={styles.statValue}>{attendanceStats.totalHours}</Text>
          <Text style={styles.statLabel}>Total Hrs</Text>
        </View>
      </View>

      {/* Toast Notification */}
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type}
        onClose={hideToast}
      />
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

  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  locationStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 5,
  },

  locationStatusText: {
    fontSize: 14,
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
    height: height * 0.45,
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

  disabledButton: {
    opacity: 0.6,
  },

  text: {
    fontSize: 16,
    fontWeight: '800',
    top: 10,
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
  },

  statLabel: {
    color: 'grey',
    marginTop: 4,
  },

  // Toast Styles
  toastContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    left: 20,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  toastCloseButton: {
    padding: 4,
  },
  
  // New styles for enhanced location handling
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  
  errorMessage: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
  
  retryIndicator: {
    alignItems: 'center',
    marginBottom: 10,
  },
  
  retryText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  
  refreshButton: {
    padding: 8,
  },
  
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});