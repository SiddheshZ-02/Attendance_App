import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { checkSession, logout } from '../../../features/auth/authSlice';

export const useProfile = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.user;

  useEffect(() => {
    if (!auth.token) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
      return;
    }

    if (!user) {
      setIsLoading(true);
      dispatch(checkSession())
        .unwrap()
        .then(result => {
          if (!result) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [auth.token, user, dispatch, navigation]);

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await dispatch(logout()).unwrap();
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await dispatch(checkSession()).unwrap();
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    user,
    isLoading,
    isLoggingOut,
    refreshing,
    onRefresh,
    showLogoutModal,
    setShowLogoutModal,
    confirmLogout,
    navigation,
  };
};
