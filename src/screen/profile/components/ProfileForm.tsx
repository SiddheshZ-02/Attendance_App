import React from 'react';
import { View, Text, TextInput, ScrollView, Switch, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
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

        <Text style={[styles.sectionTitle, { marginTop: wp(8) }]}>Security</Text>
        <View style={styles.biometricRow}>
          <View style={{ flex: 1, paddingRight: wp(12) }}>
            <Text style={styles.biometricTitle}>{lockTitle}</Text>
            <Text style={styles.biometricHint}>
              When on, opening the app requires your device biometric or PIN to read saved login
              tokens.
            </Text>
          </View>
          {biometricBusy ? (
            <ActivityIndicator color="#0A1F4A" />
          ) : (
            <Switch
              value={biometricEnabled}
              onValueChange={v => onBiometricToggle?.(v)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={biometricEnabled ? '#0A1F4A' : '#F3F4F6'}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileForm;
