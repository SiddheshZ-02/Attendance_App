import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useResponsive } from '../../../utils/responsive';

interface Props {
  user: any;
  styles: any;
}

const ProfileForm: React.FC<Props> = ({ user, styles }) => {
  const { wp } = useResponsive();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* AVATAR + NAME + POSITION */}
      <View style={styles.profileSection}>
        <Icon name="user-circle" size={wp(150)} color="#0D2B5E" />
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
  );
};

export default ProfileForm;
