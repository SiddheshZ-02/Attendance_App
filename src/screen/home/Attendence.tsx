import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useRef, useState, useEffect } from 'react';

const { height } = Dimensions.get('window');

const Attendence = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const [checkedIn, setCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${dayNum}, ${year} · ${day}`;
  };

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

  const handlePress = () => {
    setCheckedIn(prev => !prev);
  };

  const activeColor = checkedIn ? '#16A34A' : '#DC2626';
  const label = checkedIn ? 'Check In' : 'Check Out';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey Siddhesh !</Text>
          <Text style={styles.subtitle}>
            Good Morning Mark your Attendance
          </Text>
        </View>

        <TouchableOpacity style={styles.avatar} />
      </View>

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
              style={styles.middleRing}
            >
              <Text style={[styles.text, { color: activeColor }]}>
                {label}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>00</Text>
          <Text style={styles.statLabel}>Check In</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>00</Text>
          <Text style={styles.statLabel}>Check Out</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>00</Text>
          <Text style={styles.statLabel}>Total Hrs</Text>
        </View>
      </View>
    </View>
  );
};

export default Attendence;

// ... existing code ...

// ... existing code ...


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
    backgroundColor: '#b49e9e',
    height: 40,
    width: 40,
    borderRadius: 20,
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

  text: {
    fontSize: 16,
    fontWeight: '800',
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
});
