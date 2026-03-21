import React from 'react';
import { View, Text, Animated, Pressable, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  scale: Animated.Value;
  pressIn: () => void;
  pressOut: () => void;
  handlePress: () => void;
  isLoading: boolean;
  cooldownLeft: number;
  activeColor: string;
  displayLabel: string;
  loadingMessage: string;
  styles: any;
}

const AttendanceButton: React.FC<Props> = ({
  scale,
  pressIn,
  pressOut,
  handlePress,
  isLoading,
  cooldownLeft,
  activeColor,
  displayLabel,
  loadingMessage,
  styles,
}) => {
  const { wp } = useResponsive();

  return (
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
  );
};

export default AttendanceButton;
