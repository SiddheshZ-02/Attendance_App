import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  userName: string;
  greeting: string;
  selectedMode: string | null;
  selectedModeData: any;
  showDropdown: boolean;
  setShowDropdown: () => void;
  isLoading: boolean;
  checkedIn: boolean;
  workModeOptions: any[];
  handleSetWorkMode: (mode: string) => void;
  styles: any;
}

const AttendanceHeader: React.FC<Props> = ({
  userName,
  greeting,
  selectedMode,
  selectedModeData,
  showDropdown,
  setShowDropdown,
  isLoading,
  checkedIn,
  workModeOptions,
  handleSetWorkMode,
  styles,
}) => {
  const { wp } = useResponsive();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Hey {userName}!</Text>
        <Text style={styles.subtitle}>{greeting}</Text>
      </View>
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={setShowDropdown}
          disabled={isLoading || checkedIn}
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
                onPress={() => handleSetWorkMode(option.value)}
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
  );
};

export default memo(AttendanceHeader);
