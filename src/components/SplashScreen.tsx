import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import EMSLogo from '../assets/svg/EMS.svg';

type SplashScreenProps = {
  message?: string;
};

const SplashScreen: React.FC<SplashScreenProps> = ({ message = 'Checking session...' }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <EMSLogo width={220} height={220} />
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
};

export default SplashScreen;

const DOT_SIZE = 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#00C6F8',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#00C6F8',
    opacity: 0.5,
  },
  dot1: {},
  dot2: {},
  dot3: {},
});

