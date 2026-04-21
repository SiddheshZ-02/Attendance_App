import React from 'react';
import { Modal, View, Text, Button, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface BiometricModalProps {
  isVisible: boolean;
  onClose: () => void;
  onActivateBiometrics: () => void;
  biometricLabel?: string | null;
  biometricEnabled: boolean;
  biometricBusy?: boolean;
  onBiometricToggle?: (next: boolean) => void;
}

const BiometricModal: React.FC<BiometricModalProps> = ({
  isVisible,
  onClose,
  onActivateBiometrics,
  biometricLabel,
  biometricEnabled,
  biometricBusy = false,
  onBiometricToggle,
}) => {
  const title = biometricLabel
    ? `Activate ${biometricLabel}`
    : 'Activate Biometrics';
  const message = biometricEnabled
    ? 'Biometrics are currently enabled. Do you want to disable them?'
    : 'Activate biometrics (Face ID / Fingerprint / PIN) for quick and secure login.';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={24} color="#0A1F4A" />
          </TouchableOpacity>
          <Ionicons 
            name="finger-print-sharp" 
            size={60} 
            color={biometricEnabled ? '#22C55E' : '#EF4444'} 
            style={styles.icon} 
          />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Enable Biometrics</Text>
            {biometricBusy ? (
              <ActivityIndicator color="#0A1F4A" />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={v => {
                  onBiometricToggle?.(v);
                  onActivateBiometrics(); // Call the original activation logic as well
                }}
                trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
                thumbColor={biometricEnabled ? '#0A1F4A' : '#F3F4F6'}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  icon: {
    marginBottom: 15,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A1F4A',
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
});

export default BiometricModal;
