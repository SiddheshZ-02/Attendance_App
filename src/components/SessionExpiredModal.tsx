import React, { useCallback, useEffect } from 'react';
import { View, Modal, Text, TouchableOpacity } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { logout, setSessionExpired } from '../features/auth/authSlice';
import { navigationRef } from '../navigation/navigationRef';
import { useToast } from 'react-native-toast-notifications';
import { createThemedStyles, useResponsive } from '../utils/responsive';

const SessionExpiredModal = () => {
  const dispatch = useAppDispatch();
  const styles = useStyles();
  const toast = useToast();
  const { sessionExpired, sessionExpiredMessage } = useAppSelector(
    s => s.auth,
  );

  useEffect(() => {
    if (sessionExpired) {
      toast.show('Session ended', {
        type: 'warning',
        placement: 'top',
        duration: 3000,
      });
    }
  }, [sessionExpired, toast]);

  const handleOk = useCallback(async () => {
    // Clear auth state and storage
    await dispatch(logout()).unwrap().catch(() => {});
    
    // Clear the modal state
    dispatch(setSessionExpired(null));
    
    // Reset navigation stack to the login screen
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Auth' as never }],
      });
    }
  }, [dispatch]);

  if (!sessionExpired) return null;

  return (
    <Modal
      visible={!!sessionExpired}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
               {/* Simple SVG-like representation using View for senior developer level clean UI */}
               <View style={styles.lockIcon} />
               <View style={styles.lockBody} />
            </View>
          </View>
          
          <Text style={styles.title}>Session Expired</Text>
          <Text style={styles.message}>
            {sessionExpiredMessage || 'Session ended. Your account was used on another platform'}
          </Text>
          
          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleOk}>
            <Text style={styles.buttonText}>Log In </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SessionExpiredModal;

const useStyles = createThemedStyles((colors, { wp, hp, fp, radius, SCREEN }) => {
  return {
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: wp(24),
    },
    modal: {
      width: SCREEN.width * 0.85,
      backgroundColor: '#FFFFFF',
      borderRadius: radius.xl,
      padding: wp(32),
      alignItems: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp(4) },
      shadowOpacity: 0.3,
      shadowRadius: wp(8),
    },
    iconContainer: {
      marginBottom: hp(20),
    },
    iconBackground: {
      width: wp(80),
      height: wp(80),
      backgroundColor: '#FEE2E2',
      borderRadius: wp(40),
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    lockIcon: {
      width: wp(20),
      height: wp(20),
      borderRadius: wp(10),
      borderWidth: wp(3),
      borderColor: '#EF4444',
      position: 'absolute',
      top: wp(20),
    },
    lockBody: {
      width: wp(24),
      height: wp(20),
      backgroundColor: '#EF4444',
      borderRadius: wp(4),
      marginTop: wp(15),
    },
    title: {
      fontSize: fp(24),
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: hp(12),
      textAlign: 'center',
    },
    message: {
      fontSize: fp(16),
      color: '#4B5563',
      textAlign: 'center',
      lineHeight: fp(24),
      marginBottom: hp(32),
    },
    button: {
      width: '100%',
      backgroundColor: '#111827',
      paddingVertical: hp(16),
      borderRadius: radius.lg,
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: fp(16),
      fontWeight: '600',
    },
  };
});
