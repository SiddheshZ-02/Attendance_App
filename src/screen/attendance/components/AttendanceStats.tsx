import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  stats: {
    firstCheckIn: string;
    lastCheckOut: string;
    totalHours: string;
  };
  styles: any;
}

const AttendanceStats: React.FC<Props> = ({ stats, styles }) => {
  const { wp } = useResponsive();

  return (
    <View style={styles.stats}>
      <View style={styles.statItem}>
        <MaterialIcons
          name="access-time-filled"
          size={wp(24)}
          color="#16A34A"
        />
        <Text style={styles.statValue}>{stats.firstCheckIn}</Text>
        <Text style={styles.statLabel}>Check In</Text>
      </View>
      <View style={styles.statItem}>
        <MaterialIcons
          name="access-time-filled"
          size={wp(24)}
          color="#DC2626"
        />
        <Text style={styles.statValue}>{stats.lastCheckOut}</Text>
        <Text style={styles.statLabel}>Check Out</Text>
      </View>
      <View style={styles.statItem}>
        <MaterialIcons name="more-time" size={wp(24)} color="#b49e9e" />
        <Text style={styles.statValue}>{stats.totalHours}</Text>
        <Text style={styles.statLabel}>Total Hrs</Text>
      </View>
    </View>
  );
};

export default AttendanceStats;
