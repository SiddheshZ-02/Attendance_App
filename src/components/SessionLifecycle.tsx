import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { validateSession } from '../features/auth/authSlice';

const MIN_INTERVAL_MS = 5 * 60 * 1000;

/**
 * When the app returns to foreground, optionally re-validate the session (throttled).
 */
const SessionLifecycle = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(s => s.auth.token);
  const lastRun = useRef(0);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active' || !token) return;
      const now = Date.now();
      if (now - lastRun.current < MIN_INTERVAL_MS) return;
      lastRun.current = now;
      dispatch(validateSession());
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [dispatch, token]);

  return null;
};

export default SessionLifecycle;
