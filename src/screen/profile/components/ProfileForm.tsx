import React from 'react';
import { View, Text, TextInput, ScrollView, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BiometricModal from '../../../components/BiometricModal';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  user: any;
  styles: any;
  biometricEnabled?: boolean;
  biometricLabel?: string | null;
  biometricBusy?: boolean;
  onBiometricToggle?: (next: boolean) => void;
}

const ProfileForm: React.FC<Props> = ({
  user,
  styles,
  biometricEnabled = false,
  biometricLabel,
  biometricBusy = false,
  onBiometricToggle,
}) => {
  const { wp } = useResponsive();
  const [isBiometricModalVisible, setBiometricModalVisible] = React.useState(false);

  const lockTitle = biometricLabel
    ? `App lock (${biometricLabel})`
    : 'App lock (Face ID / fingerprint / PIN)';

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.profileSection}>
        <Icon name="user-circle" size={wp(150)} color="#0D2B5E" />
        <Text style={styles.name}>{user?.name || 'Employee'}</Text>
        {user?.position ? (
          <Text style={styles.roleTag}>{user.position}</Text>
        ) : null}
      </View>

      <View style={styles.bottomContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionTitle}>General Information</Text>
          <TouchableOpacity onPress={() => setBiometricModalVisible(true)}>
            <Ionicons 
              name="finger-print-sharp" 
              size={wp(30)} 
              color={biometricEnabled ? '#22C55E' : '#EF4444'} 
            />
          </TouchableOpacity>
        </View>

        <BiometricModal
          isVisible={isBiometricModalVisible}
          onClose={() => setBiometricModalVisible(false)}
          onActivateBiometrics={() => {
            // This will be handled by the switch inside the modal
          }}
          biometricLabel={biometricLabel}
          biometricEnabled={biometricEnabled}
          biometricBusy={biometricBusy}
          onBiometricToggle={onBiometricToggle}
        />

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
  );
};

export default ProfileForm;
