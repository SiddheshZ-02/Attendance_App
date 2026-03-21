import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
  styles: any;
}

const LogoutModal: React.FC<Props> = ({ visible, onClose, onConfirm, isLoggingOut, styles }) => {
  const { wp } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop tap to close */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !isLoggingOut && onClose()}
        />

        <View style={styles.modalContent}>
          {/* Drag bar */}
          <View style={styles.modalTopBar} />

          {/* Close X button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
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
              onPress={onConfirm}
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
              onPress={onClose}
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
  );
};

export default LogoutModal;
