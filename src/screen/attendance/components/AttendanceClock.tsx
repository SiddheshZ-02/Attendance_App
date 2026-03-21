import React, { useState, useEffect, memo } from 'react';
import { View, Text } from 'react-native';

interface Props {
  styles: any;
}

const AttendanceClock: React.FC<Props> = ({ styles }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${
      days[date.getDay()]
    }`;
  };

  return (
    <View style={styles.timeContainer}>
      <Text style={styles.time}>{formatTime(now)}</Text>
      <Text style={styles.date}>{formatDate(now)}</Text>
    </View>
  );
};

export default memo(AttendanceClock);
