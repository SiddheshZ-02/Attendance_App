import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, Animated } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEnable: () => void;
  styles: any;
}

const LocationModal: React.FC<Props> = ({ visible, onClose, onEnable, styles }) => {
  const { wp } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modernModalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
        />
        <Animated.View style={styles.modernModalContent}>
          <View style={styles.modalTopBar} />
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={wp(24)} color="#666" />
          </TouchableOpacity>
          <View style={styles.modernIconContainer}>
            <View style={styles.iconPulseOuter}>
              <View style={styles.iconPulseInner}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={wp(40)} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.modernTextContainer}>
            <Text style={styles.modernModalTitle}>
              Location Access Needed
            </Text>
            <Text style={styles.modernModalSubtitle}>
              To mark your attendance accurately, we need access to your
              device location
            </Text>
          </View>
          <View style={styles.modernButtonsContainer}>
            <TouchableOpacity
              style={styles.modernPrimaryButton}
              onPress={onEnable}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="navigate" size={wp(20)} color="#FFFFFF" />
                <Text style={styles.modernPrimaryButtonText}>
                  Open Settings
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modernSecondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modernSecondaryButtonText}>
                I'll Do It Later
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={wp(14)} color="#16A34A" />
            <Text style={styles.privacyText}>
              Your location is only used for attendance tracking
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default LocationModal;
