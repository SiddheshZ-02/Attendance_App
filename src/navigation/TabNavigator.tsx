import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import Attendance from '../screen/attendance/Attendance';
import Profile from '../screen/profile/Profile';
import { createThemedStyles, useResponsive } from '../utils/responsive';

const Tab = createBottomTabNavigator();

const getIcon = (name: string) => {
  switch (name) {
    case 'Home':
      return 'home-sharp';
    case 'Profile':
      return 'person-sharp';
    default:
      return 'help';
  }
};

const CustomTabBar = ({ state, navigation }: any) => {
  const { wp, SCREEN } = useResponsive();
  const styles = useStyles();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const numTabs = state.routes.length;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [state.index, slideAnim]);

  const tabWidth = (SCREEN.width * 0.75 - wp(40)) / numTabs; // Adjust based on container width
  
  const translateX = slideAnim.interpolate({
    inputRange: [0, numTabs - 1],
    outputRange: [wp(10), tabWidth * (numTabs - 1) + wp(10)],
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Sliding Background */}
        <Animated.View
          style={[
            styles.slidingBackground,
            {
              width: tabWidth - wp(10),
              transform: [{ translateX }],
            },
          ]}
        />

        {/* Tab Items */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={getIcon(route.name)}
                  size={wp(26)}
                  color={isFocused ? '#071428' : '#6B7280'}
                />
              </View>
              {isFocused && (
                <Text style={styles.tabText}>{route.name}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const renderTabBar = (props: any) => <CustomTabBar {...props} />;

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={Attendance} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

const useStyles = createThemedStyles((colors, { wp, hp, fp, radius, spacing }) => {
  return {
    container: {
      position: 'absolute',
      bottom: hp(25),
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: wp(20),
    },

    tabBar: {
      flexDirection: 'row',
      backgroundColor: '#0A1F4A',
      borderRadius: radius.xl, // Approximate for 35
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp(8) },
      shadowOpacity: 0.3,
      shadowRadius: wp(15),
      elevation: 12,
      width: '75%',
      position: 'relative',
    },

    slidingBackground: {
      position: 'absolute',
      height: hp(50),
      backgroundColor: '#E5E7EB',
      borderRadius: radius.lg, // Approximate for 25
      top: hp(10),
    },

    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp(6),
      zIndex: 10,
      gap: wp(8),
    },

    iconContainer: {
      width: wp(40),
      height: wp(40),
      alignItems: 'center',
      justifyContent: 'center',
    },

    tabText: {
      fontSize: fp(13),
      fontWeight: '600',
      color: '#071428',
    },
  };
});
