import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Attendence from './../screen/home/Attendence';
import Profile from '../screen/profile/Profile';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, navigation }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.tabItem, isFocused && styles.activeTab]}
            >
              <Text style={[styles.tabText, isFocused && styles.activeText]}>
                {route.name}
              </Text>
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
      <Tab.Screen name="Attendence" component={Attendence} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 30,
    width: '60%',
    alignItems: 'center',
    marginHorizontal: '20%',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#a88a8aff',
    borderRadius: 40,
    padding: 6,
    width: '90%',
    height: 60,
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },

  tabItem: {
    flex: 1,
    height: 48,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabText: {
    color: '#FFFFFF', 
    fontWeight: '500',
    fontSize: 14,
  },

  activeText: {
    color: '#0A3D91',
    fontWeight: '700',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
});
