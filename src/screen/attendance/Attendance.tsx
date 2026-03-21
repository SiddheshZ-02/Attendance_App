import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StatusBar, ScrollView, RefreshControl } from 'react-native';
import { useAttendance } from './hooks/useAttendance';
import AttendanceHeader from './components/AttendanceHeader';
import AttendanceClock from './components/AttendanceClock';
import AttendanceButton from './components/AttendanceButton';
import AttendanceStats from './components/AttendanceStats';
import LocationModal from './components/LocationModal';
import { createThemedStyles } from '../../utils/responsive';

const workModeOptions = [
  { label: 'Work from Home', value: 'WFH', icon: 'home-sharp' },
  { label: 'In Office', value: 'Office', icon: 'business' },
];

const Attendance = () => {
  const {
    scale,
    attendanceStats,
    showDropdown,
    setShowDropdown,
    showLocationModal,
    setShowLocationModal,
    isLoading,
    loadingMessage,
    isFetchingToday,
    refreshing,
    onRefresh,
    cooldownLeft,
    checkedIn,
    selectedMode,
    auth,
    handlePress,
    handleEnableLocation,
    handleSetWorkMode,
    pressIn,
    pressOut,
  } = useAttendance();

  const styles = useStyles();

  const activeColor = useMemo(() => (checkedIn ? '#DC2626' : '#16A34A'), [checkedIn]);
  const label = useMemo(() => (checkedIn ? 'Check Out' : 'Check In'), [checkedIn]);
  const displayLabel = useMemo(
    () => (cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : label),
    [cooldownLeft, label],
  );
  const selectedModeData = useMemo(
    () => workModeOptions.find(m => m.value === selectedMode),
    [selectedMode],
  );

  const greetingMessage = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) return 'Good Morning, mark your Attendance';
    if (currentHour >= 12 && currentHour < 17) return 'Good Afternoon, mark your Attendance';
    return 'Good Evening, mark your Attendance';
  }, []);

  return (
    <ScrollView
      style={styles.container}
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
      <StatusBar backgroundColor="#0A1F4A" barStyle="light-content" />
      <AttendanceHeader
        userName={auth.user?.name || 'User'}
        greeting={greetingMessage}
        selectedMode={selectedMode}
        selectedModeData={selectedModeData}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        isLoading={isLoading || isFetchingToday}
        checkedIn={checkedIn}
        workModeOptions={workModeOptions}
        handleSetWorkMode={handleSetWorkMode}
        styles={styles}
      />

      {isFetchingToday ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingAttendanceText}>Loading attendance...</Text>
        </View>
      ) : (
        <>
          {selectedModeData && (
            <Text style={[styles.dropdownItemText, styles.dropdownItemTextSelectedName]}>
              {selectedModeData.label}
            </Text>
          )}

          <AttendanceClock styles={styles} />

          <AttendanceButton
            scale={scale}
            pressIn={pressIn}
            pressOut={pressOut}
            handlePress={handlePress}
            isLoading={isLoading}
            cooldownLeft={cooldownLeft}
            activeColor={activeColor}
            displayLabel={displayLabel}
            loadingMessage={loadingMessage}
            styles={styles}
          />

          <AttendanceStats stats={attendanceStats} styles={styles} />
        </>
      )}

      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onEnable={handleEnableLocation}
        styles={styles}
      />
    </ScrollView>
  );
};

export default Attendance;

const useStyles = createThemedStyles((colors, { hp, wp, fp, radius, spacing }) => {
  return {
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      padding: spacing.md,
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: "#0A1F4A",
      height: hp(74),
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: radius.md,
    },
    title: { fontSize: fp(18), fontWeight: '600', color: "#fff" },
    subtitle: { color: 'grey', marginTop: hp(2) },
    dropdownContainer: { position: 'relative', zIndex: 1000 },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      gap: wp(6),
    },
    dropdownMenu: {
      position: 'absolute',
      top: hp(45),
      right: 0,
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp(2) },
      shadowOpacity: 0.15,
      shadowRadius: wp(8),
      elevation: 5,
      minWidth: wp(160),
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: wp(8),
    },
    dropdownItemSelected: { backgroundColor: '#E8F5E9' },
    dropdownItemText: { fontSize: fp(14), color: '#333', textAlign: 'center' },
    dropdownItemTextSelectedName: { color: colors.success, fontWeight: '500', paddingTop: hp(28) },
    timeContainer: {
      height: '20%',
      justifyContent: 'center',
      alignItems: 'center',
      gap: hp(10),
    },
    time: { fontSize: fp(50), fontWeight: '600', color: "#0A1F4A" },
    date: { fontSize: fp(18), color: '#6B7280' },
    screen: {
      justifyContent: 'center',
      alignItems: 'center',
      height: '42%',
    },
    outerRing: {
      width: wp(180),
      height: wp(180),
      borderRadius: wp(90),
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp(8) },
      shadowOpacity: 0.08,
      shadowRadius: wp(15),
      elevation: 6,
    },
    middleRing: {
      width: wp(150),
      height: wp(150),
      borderRadius: wp(75),
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp(6) },
      shadowOpacity: 0.12,
      shadowRadius: wp(10),
      elevation: 8,
    },
    middleRingDisabled: { opacity: 0.8 },
    text: { fontSize: fp(16), fontWeight: '800', marginTop: hp(10) },
    loadingText: { fontSize: fp(12), fontWeight: '600', marginTop: hp(8) },
    loadingCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingAttendanceText: {
      marginTop: hp(12),
      color: 'grey',
    },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingBottom: spacing.md,
    },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: fp(16), fontWeight: '600', marginTop: hp(4) },
    statLabel: { color: 'grey', marginTop: hp(4) },
    modernModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modernModalContent: {
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
    modernIconContainer: { alignItems: 'center', marginTop: hp(24), marginBottom: hp(8) },
    iconPulseOuter: {
      width: wp(120),
      height: wp(120),
      borderRadius: wp(60),
      backgroundColor: 'rgba(250,204,21,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconPulseInner: {
      width: wp(100),
      height: wp(100),
      borderRadius: wp(50),
      backgroundColor: 'rgba(250,204,21,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircle: {
      width: wp(80),
      height: wp(80),
      borderRadius: wp(40),
      backgroundColor: '#FACC15',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#FACC15',
      shadowOffset: { width: 0, height: hp(4) },
      shadowOpacity: 0.4,
      shadowRadius: wp(10),
      elevation: 10,
    },
    modernTextContainer: {
      alignItems: 'center',
      marginTop: hp(20),
      marginBottom: hp(24),
    },
    modernModalTitle: {
      fontSize: fp(24),
      fontWeight: '700',
      color: colors.text,
      marginBottom: hp(8),
      textAlign: 'center',
    },
    modernModalSubtitle: {
      fontSize: fp(15),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: hp(22),
      paddingHorizontal: wp(16),
    },
    modernButtonsContainer: { gap: hp(12), marginBottom: hp(16) },
    modernPrimaryButton: {
      backgroundColor: colors.success,
      borderRadius: radius.md,
      paddingVertical: hp(16),
      alignItems: 'center',
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: hp(4) },
      shadowOpacity: 0.25,
      shadowRadius: wp(8),
      elevation: 6,
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: wp(8) },
    modernPrimaryButtonText: {
      color: '#FFFFFF',
      fontSize: fp(17),
      fontWeight: '600',
    },
    modernSecondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: radius.md,
      paddingVertical: hp(14),
      alignItems: 'center',
    },
    modernSecondaryButtonText: {
      color: colors.textSecondary,
      fontSize: fp(16),
      fontWeight: '500',
    },
    privacyNote: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: wp(6),
      paddingTop: hp(8),
    },
    privacyText: {
      fontSize: fp(12),
      color: colors.textDisabled,
      fontStyle: 'italic',
    },
  };
});
