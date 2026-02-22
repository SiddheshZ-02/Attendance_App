import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

<<<<<<< HEAD
import Attendance from '../screen/attendance/Attendance';
=======
import Attendence from '../screen/attendance/Attendance';
>>>>>>> f6a47b5dac2c78f36b61f82170660ea4c01127ee
import Profile from '../screen/profile/Profile';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

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
<<<<<<< HEAD
  const slideAnim = useRef(new Animated.Value(0)).current;
  const numTabs = state.routes.length;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [state.index]);

  const tabWidth = (width * 0.75 - 40) / numTabs; // Adjust based on container width
  
  const translateX = slideAnim.interpolate({
    inputRange: [0, numTabs - 1],
    outputRange: [10, tabWidth * (numTabs - 1) + 10],
  });

=======
>>>>>>> f6a47b5dac2c78f36b61f82170660ea4c01127ee
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
<<<<<<< HEAD
        {/* Sliding Background */}
        <Animated.View
          style={[
            styles.slidingBackground,
            {
              width: tabWidth - 10,
              transform: [{ translateX }],
            },
          ]}
        />

        {/* Tab Items */}
=======
>>>>>>> f6a47b5dac2c78f36b61f82170660ea4c01127ee
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
                  size={26}
                  color={isFocused ? '#1F2937' : '#6B7280'}
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

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#4B5563',
    borderRadius: 35,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
    width: '75%',
    position: 'relative',
  },

  slidingBackground: {
    position: 'absolute',
    height: 50,
    backgroundColor: '#E5E7EB',
    borderRadius: 25,
    top: 10,
    // left: 5,
  },

  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 10,
    gap: 8,
  },

  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
});