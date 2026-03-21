import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  onBack: () => void;
  onLogoutPress: () => void;
  isLoggingOut: boolean;
  styles: any;
}

const ProfileHeader: React.FC<Props> = ({ onBack, onLogoutPress, isLoggingOut, styles }) => {
  const { wp } = useResponsive();

  return (
    <View style={styles.header}>
      <StatusBar backgroundColor="#0A1F4A" barStyle="light-content" />
      <TouchableOpacity
        style={styles.avatarSmall}
        onPress={onBack}
      >
        <Icon name="angle-left" size={wp(40)} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Profile</Text>
      <TouchableOpacity
        onPress={onLogoutPress}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color="red" />
        ) : (
          <Text style={styles.logout}>Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ProfileHeader;
