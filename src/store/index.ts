import { configureStore, combineReducers, AnyAction } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import attendanceReducer from '../features/attendance/attendanceSlice';

const appReducer = combineReducers({
  auth: authReducer,
  attendance: attendanceReducer,
});

export const GLOBAL_LOGOUT_ACTION = 'GLOBAL_LOGOUT';

const rootReducer = (state: any, action: AnyAction) => {
  if (action.type === GLOBAL_LOGOUT_ACTION) {
    // Reset state to undefined so reducers initialize with initialState
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  devTools: __DEV__,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
