import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useProfile } from './hooks/useProfile';
import ProfileHeader from './components/ProfileHeader';
import ProfileForm from './components/ProfileForm';
import LogoutModal from './components/LogoutModal';
import { createThemedStyles, useResponsive } from '../../utils/responsive';

const Profile = () => {
  const {
    user,
    isLoading,
    isLoggingOut,
    refreshing,
    onRefresh,
    showLogoutModal,
    setShowLogoutModal,
    confirmLogout,
    confirmLogoutAllDevices,
    navigation,
    biometricEnabled,
    biometricLabel,
    biometricBusy,
    onToggleBiometric,
  } = useProfile();

  const styles = useStyles();

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centeredContent]}>
        <ActivityIndicator size="large" color="#a88a8aff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0A1F4A']}
          tintColor="#0A1F4A"
        />
      }
    >
      <ProfileHeader
        onBack={() => navigation.goBack()}
        onLogoutPress={() => setShowLogoutModal(true)}
        isLoggingOut={isLoggingOut}
        styles={styles}
      />

      <ProfileForm
        user={user}
        styles={styles}
        biometricEnabled={biometricEnabled}
        biometricLabel={biometricLabel}
        biometricBusy={biometricBusy}
        onBiometricToggle={onToggleBiometric}
      />

      <TouchableOpacity
        style={styles.logoutAllLink}
        onPress={confirmLogoutAllDevices}
        disabled={isLoggingOut}
      >
        <Text style={styles.logoutAllLinkText}>Sign out all devices</Text>
      </TouchableOpacity>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        isLoggingOut={isLoggingOut}
        styles={styles}
      />
    </ScrollView>
  );
};

export default Profile;

const useStyles = createThemedStyles((colors, { hp, wp, fp, radius, spacing }) => {
  return {
    screen: { flex: 1, backgroundColor: colors.background },
    centeredContent: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: hp(12), color: 'grey' },
    header: {
      height: hp(74),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      backgroundColor: "#0A1F4A",
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: radius.md,
    },
    headerTitle: { fontSize: fp(18), fontWeight: '500' , color: "#fff"},
    logout: { fontSize: fp(16), fontWeight: '500', color: "red" },
    avatarSmall: {
      justifyContent: 'center',
      alignItems: 'center',
      height: wp(40),
      width: wp(40),
      borderRadius: wp(20),
    },
    profileSection: {
      paddingVertical: spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      gap: hp(12),
    },
    name: { fontSize: fp(20), fontWeight: '600' , color: "#0E3A6E"},
    roleTag: {
      fontSize: fp(14),
      color: "#0E3A6E",
      backgroundColor: "#D3E4FF",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.full,
      overflow: 'hidden',
      fontWeight: '600',
    },
    bottomContainer: { padding: spacing.md  },
    biometricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
      paddingVertical: spacing.sm,
    },
    biometricTitle: {
      fontSize: fp(16),
      fontWeight: '600',
      color: '#0E3A6E',
      marginBottom: hp(4),
    },
    biometricHint: {
      fontSize: fp(12),
      color: '#6B7280',
      lineHeight: fp(18),
    },
    sectionTitle: {
      fontSize: fp(18),
      marginBottom: spacing.md,
      color: "#0E3A6E",
      fontWeight: '600',
    },
    inputWrapper: { marginBottom: spacing.lg, position: 'relative' },
    label: {
      position: 'absolute',
      top: -hp(10),
      left: wp(14),
      backgroundColor: "#fff",
      paddingHorizontal: wp(6),
      fontSize: fp(12),
      color: "#0E3A6E",
      zIndex: 1,
    },
    input: {
      height: hp(54),
      borderWidth: 1,
      borderColor: "#0E3A6E",
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      fontSize: fp(15),
      color: "#2A7A99",
    },
    readOnly: { backgroundColor: "#fff", color: "#0E3A6E", fontWeight: '500' },
    logoutAllLink: {
      alignSelf: 'center',
      marginTop: hp(8),
      marginBottom: hp(16),
      paddingVertical: hp(8),
      paddingHorizontal: spacing.md,
    },
    logoutAllLinkText: {
      fontSize: fp(15),
      color: '#B91C1C',
      fontWeight: '600',
      textDecorationLine: 'underline',
    },

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
      paddingTop: hp(8),
      paddingBottom: hp(34),
      paddingHorizontal: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -hp(4) },
      shadowOpacity: 0.15,
      shadowRadius: wp(12),
      elevation: 10,
    },
    modalTopBar: {
      width: wp(40),
      height: hp(4),
      backgroundColor: colors.border,
      borderRadius: radius.xs,
      alignSelf: 'center',
      marginBottom: hp(8),
    },
    modalCloseButton: {
      position: 'absolute',
      top: hp(16),
      right: wp(16),
      width: wp(36),
      height: wp(36),
      borderRadius: wp(18),
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    modalIconContainer: { alignItems: 'center', marginTop: hp(24), marginBottom: hp(8) },
    iconPulseOuter: {
      width: wp(120),
      height: wp(120),
      borderRadius: wp(60),
      backgroundColor: 'rgba(220,38,38,0.10)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconPulseInner: {
      width: wp(100),
      height: wp(100),
      borderRadius: wp(50),
      backgroundColor: 'rgba(220,38,38,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircle: {
      width: wp(80),
      height: wp(80),
      borderRadius: wp(40),
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: hp(4) },
      shadowOpacity: 0.4,
      shadowRadius: wp(10),
      elevation: 10,
    },
    modalTextContainer: { alignItems: 'center', marginTop: hp(20), marginBottom: hp(28) },
    modalTitle: {
      fontSize: fp(24),
      fontWeight: '700',
      color: colors.text,
      marginBottom: hp(8),
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: fp(15),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: hp(22),
      paddingHorizontal: wp(16),
    },
    modalButtonsContainer: { gap: hp(12), marginBottom: hp(16) },
    logoutConfirmButton: {
      backgroundColor: colors.error,
      borderRadius: radius.md,
      paddingVertical: hp(16),
      alignItems: 'center',
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: hp(4) },
      shadowOpacity: 0.25,
      shadowRadius: wp(8),
      elevation: 6,
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: wp(8) },
    logoutConfirmText: { color: '#FFFFFF', fontSize: fp(17), fontWeight: '600' },
    cancelButton: {
      backgroundColor: 'transparent',
      borderRadius: radius.md,
      paddingVertical: hp(14),
      alignItems: 'center',
    },
    cancelButtonText: { color: colors.textSecondary, fontSize: fp(16), fontWeight: '500' },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: wp(6),
      paddingTop: hp(8),
    },
    noteText: { fontSize: fp(12), color: colors.textDisabled, fontStyle: 'italic' },
  };
});
