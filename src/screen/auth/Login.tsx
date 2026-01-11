import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon1 from 'react-native-vector-icons/Ionicons';

const Login = () => {
  const navigation = useNavigation();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          <View style={styles.form}>
            <Text style={styles.heading}>Login</Text>

            {/* Username */}
            <View style={styles.field}>
             
              <TextInput
                placeholder="Username"
                placeholderTextColor="#aaa"
                style={styles.input}
              />
               <Icon name="user" size={20} color="#d2d0d0ff" />
            </View>

            {/* Password */}
            <View style={styles.field}>
             
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                style={styles.input}
              />
               <Icon1 name="eye" size={20} color="#d2d0d0ff" />
               <Icon1 name="eye-off" size={20} color="#d2d0d0ff" />
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Tab' as never)}
              >
                <Text style={styles.btnText}>Login</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password ?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  form: {
    width: '85%',
    backgroundColor: '#d2d0d0ff',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },

  heading: {
    textAlign: 'center',
    marginVertical: 24,
    color: '#222',
    fontSize: 30,
    fontWeight: '600',
  },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderRadius: 25,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 5,
    paddingRight:30
  },

  input: {
    flex: 1,
    marginLeft: 10,
    color: '#111',
  },

  btnRow: {
    justifyContent: 'center',
    marginTop: 30,
  },

  loginBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 6,
    marginHorizontal: 6,
    elevation: 5,
  },

  signupBtn: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 6,
    marginHorizontal: 6,
  },

  loginText: {
    color: '#fff',
    fontWeight: '600',
  },

  signupText: {
    color: '#111',
    fontWeight: '600',
  },

  forgotBtn: {
    marginTop: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },

  forgotText: {
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },

  btnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#252525',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginHorizontal: 6,
  },
});
