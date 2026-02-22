import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../services/api/apiConfig';

const Profile = () => {
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('');

  // ═══════════════════════════════════════════════════════════
  // LOAD PROFILE — GET /api/auth/profile
  // ═══════════════════════════════════════════════════════════
  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('📥 Profile response:', data);

      if (data.success && data.data) {
        const user = data.data;
        setName(user.name || '');
        setEmail(user.email || '');
        setDepartment(user.department || '');
        setPhoneNumber(user.phoneNumber || '');
        setEmployeeId(user.employeeId || '');
        setRole(user.role || '');
      } else if (
        data.code === 'TOKEN_EXPIRED' ||
        data.code === 'INVALID_TOKEN'
      ) {
        await clearAndNavigateToLogin();
      }
    } catch (error) {
      console.error('❌ Load profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // LOGOUT — POST /api/auth/logout + clear AsyncStorage
  // ═══════════════════════════════════════════════════════════
  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      const token = await AsyncStorage.getItem('authToken');

      if (token) {
        try {
          await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            // deviceId parameter removed - device info no longer collected
            body: JSON.stringify({}),
          });
        } catch (apiError) {
          console.warn('⚠️ Logout API failed, clearing local anyway');
        }
      }
      await clearAndNavigateToLogin();
    } catch (error) {
      await clearAndNavigateToLogin();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const clearAndNavigateToLogin = async () => {
    await AsyncStorage.multiRemove([
      'authToken',
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'employeeId',
      'department',
      // 'deviceFingerprint' - removed per user request
    ]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  // ═══════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <View
        style={[
          styles.screen,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color="#a88a8aff" />
        <Text style={{ marginTop: 12, color: 'grey' }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarSmall}
          onPress={() => navigation.goBack()}
        >
          <Icon name="angle-left" size={40} color="#a88a8aff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => setShowLogoutModal(true)}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="red" />
          ) : (
            <Text style={styles.logout}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* AVATAR + NAME + ROLE */}
        <View style={styles.profileSection}>
          <Icon name="user-circle" size={150} color="#a88a8aff" />
          <Text style={styles.name}>{name || 'Employee'}</Text>
          {role ? (
            <Text style={styles.roleTag}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          ) : null}
        </View>

        {/* FORM FIELDS */}
        <View style={styles.bottomContainer}>
          <Text style={styles.sectionTitle}>General Information</Text>

       

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={email}
              editable={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={department || 'Not assigned'}
              editable={false}
            />
          </View>
             {role ? (
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Role</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={role}
                editable={false}
              />
            </View>
          ) : null}

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={phoneNumber || 'Not provided'}
              editable={false}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════
          LOGOUT BOTTOM MODAL
          Same structure as Attendance location modal
      ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop tap to close */}
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !isLoggingOut && setShowLogoutModal(false)}
          />

          <View style={styles.modalContent}>
            {/* Drag bar */}
            <View style={styles.modalTopBar} />

            {/* Close X button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Icon — red circles like location modal's yellow circles */}
            <View style={styles.modalIconContainer}>
              <View style={styles.iconPulseOuter}>
                <View style={styles.iconPulseInner}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="log-out-outline"
                      size={40}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Title & subtitle */}
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalTitle}>Logout</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to logout? You will need to sign in again
                to access your account.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.logoutConfirmText}>Logging out...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="log-out-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.logoutConfirmText}>Yes, Logout</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Stay Logged In</Text>
              </TouchableOpacity>
            </View>

            {/* Security note */}
            <View style={styles.noteRow}>
              <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              <Text style={styles.noteText}>
                Your session will be securely ended
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '500' },
  logout: { fontSize: 16, fontWeight: '500', color: 'red' },
  avatarSmall: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  profileSection: {
    paddingVertical: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  name: { fontSize: 20, fontWeight: '600' },
  roleTag: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomContainer: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 20,
    color: 'blue',
    fontWeight: '500',
  },
  inputWrapper: { marginBottom: 22, position: 'relative' },
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
  readOnly: { backgroundColor: '#F9FAFB', color: '#374151' },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTopBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalIconContainer: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  iconPulseOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(220,38,38,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPulseInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220,38,38,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTextContainer: { alignItems: 'center', marginTop: 20, marginBottom: 28 },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  modalButtonsContainer: { gap: 12, marginBottom: 16 },
  logoutConfirmButton: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutConfirmText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  noteText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
});
