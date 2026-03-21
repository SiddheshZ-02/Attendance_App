import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  time: string;
  date: string;
  styles: any;
}

const AttendanceClock: React.FC<Props> = ({ time, date, styles }) => {
  return (
    <View style={styles.timeContainer}>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
};

export default AttendanceClock;
