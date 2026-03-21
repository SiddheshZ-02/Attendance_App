import React, { useCallback, useEffect } from 'react';
import { View, Modal, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { logout, setSessionExpired } from '../features/auth/authSlice';
import { navigationRef } from '../navigation/navigationRef';
import { useToast } from 'react-native-toast-notifications';

const { width } = Dimensions.get('window');

const SessionExpiredModal = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { sessionExpired, sessionExpiredMessage } = useAppSelector(
    s => s.auth,
  );

  useEffect(() => {
    if (sessionExpired) {
      toast.show('Session Expire', {
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
      visible={sessionExpired}
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
            {sessionExpiredMessage || 'For your security, you have been logged out due to session inactivity or expiry.'}
          </Text>
          
          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleOk}>
            <Text style={styles.buttonText}>Log In </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE2E2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    width: 20,
    height: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
    marginBottom: -2,
  },
  lockBody: {
    width: 24,
    height: 18,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SessionExpiredModal;
