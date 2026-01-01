import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';

const Profile = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarSmall}
          onPress={navigation.goBack}
        />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.avatarLarge} />
        <Text style={styles.name}>Siddhesh Zujam</Text>
      </View>

      <View style={styles.bottomContainer}>
        <Text style={styles.sectionTitle}>General Information</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value="xxxxx@gmail.com" />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Designation</Text>
          <TextInput style={styles.input} value="Intern" />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value="xxxxx-xxxxx" />
        </View>
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: '8%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },

  logout: {
    fontSize: 16,
    fontWeight: '500',
    color: 'red',
  },

  avatarSmall: {
    backgroundColor: '#b49e9eff',
    height: 40,
    width: 40,
    borderRadius: 20,
  },

  profileSection: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },

  avatarLarge: {
    height: 150,
    width: 150,
    backgroundColor: '#b49e9eff',
    borderRadius: 100,
  },

  name: {
    fontSize: 20,
    fontWeight: '600',
  },

  /* BOTTOM FORM */
  bottomContainer: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    marginBottom: 20,
    color: 'blue',
    fontWeight: '500',
  },

  inputWrapper: {
    marginBottom: 22,
    position: 'relative',
  },

  label: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    fontSize: 12,
    color: '#6B7280',
    zIndex: 1,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
});
