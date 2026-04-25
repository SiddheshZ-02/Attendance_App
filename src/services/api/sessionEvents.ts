import EventEmitter from 'events';

/**
 * Industry Standard: Broadcast channel for session events.
 * This allows multiple parts of the app (background tasks, UI layers)
 * to react immediately when a session is invalidated.
 */
class SessionEmitter extends EventEmitter {}

export const sessionEvents = new SessionEmitter();

export const SESSION_EVENTS = {
  EXPIRED: 'SESSION_EXPIRED',
  LOGOUT: 'USER_LOGOUT',
};
