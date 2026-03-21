import {
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
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { checkSession, logout } from '../../features/auth/authSlice';
import { createThemedStyles, useResponsive } from '../../utils/responsive';

const Profile = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const { wp } = useResponsive();
  const styles = useStyles();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = auth.user;

  useEffect(() => {
    if (!auth.token) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
      return;
    }

    if (!user) {
      setIsLoading(true);
      dispatch(checkSession())
        .unwrap()
        .then(result => {
          if (!result) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [auth.token, user, dispatch, navigation]);

  // ═══════════════════════════════════════════════════════════
  // LOGOUT — POST /api/auth/logout + clear AsyncStorage
  // ═══════════════════════════════════════════════════════════
  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await dispatch(logout()).unwrap();
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centeredContent]}>
        <ActivityIndicator size="large" color="#a88a8aff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
          <Icon name="angle-left" size={wp(40)} color="#a88a8aff" />
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
        {/* AVATAR + NAME + POSITION */}
        <View style={styles.profileSection}>
          <Icon name="user-circle" size={wp(150)} color="#a88a8aff" />
          <Text style={styles.name}>{user?.name || 'Employee'}</Text>
          {user?.position ? (
            <Text style={styles.roleTag}>{user.position}</Text>
          ) : null}
        </View>

        {/* FORM FIELDS */}
        <View style={styles.bottomContainer}>
          <Text style={styles.sectionTitle}>General Information</Text>

       

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={user?.email || ''}
              editable={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={user?.department || 'Not assigned'}
              editable={false}
            />
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Position</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={user?.position || 'Not assigned'}
              editable={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={user?.phone || 'Not provided'}
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
              <Ionicons name="close" size={wp(24)} color="#666" />
            </TouchableOpacity>

            {/* Icon — red circles like location modal's yellow circles */}
            <View style={styles.modalIconContainer}>
              <View style={styles.iconPulseOuter}>
                <View style={styles.iconPulseInner}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="log-out-outline"
                      size={wp(40)}
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
                      size={wp(20)}
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
              <Ionicons name="shield-checkmark" size={wp(14)} color="#16A34A" />
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

const useStyles = createThemedStyles((colors, radius, spacing) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  centeredContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: 'grey' },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '500' },
  logout: { fontSize: 16, fontWeight: '500', color: colors.error },
  avatarSmall: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  profileSection: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  name: { fontSize: 20, fontWeight: '600' },
  roleTag: {
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bottomContainer: { padding: spacing.md },
  sectionTitle: {
    fontSize: 18,
    marginBottom: spacing.md,
    color: colors.primary,
    fontWeight: '500',
  },
  inputWrapper: { marginBottom: spacing.lg, position: 'relative' },
  label: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    fontSize: 12,
    color: colors.textSecondary,
    zIndex: 1,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.textDisabled,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  readOnly: { backgroundColor: colors.surface, color: colors.textSecondary },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTopBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.xs,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTextContainer: { alignItems: 'center', marginTop: 20, marginBottom: 28 },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  modalButtonsContainer: { gap: 12, marginBottom: 16 },
  logoutConfirmButton: {
    backgroundColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutConfirmText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: '500' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  noteText: { fontSize: 12, color: colors.textDisabled, fontStyle: 'italic' },
}));
