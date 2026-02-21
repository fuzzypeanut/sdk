// ─── Core Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  groups: string[];
}

export interface ModuleInfo {
  id: string;
  displayName: string;
  version: string;
  remoteEntry: string;
  routes: string[];
  nav?: {
    label: string;
    icon: string;
    order: number;
  };
  provides: string[];
  consumes: string[];
}

export interface ModuleManifest {
  id: string;
  displayName: string;
  version: string;
  remoteEntry: string;
  exposes: Record<string, string>;
  routes: string[];
  nav?: {
    label: string;
    icon: string;
    order: number;
  };
  scopes: string[];
  compose?: string;
  provides: string[];
  consumes: string[];
}

export interface Notification {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  /** Duration in ms. 0 = persistent until dismissed. Default: 4000 */
  duration?: number;
  actions?: Array<{ label: string; event: string }>;
}

export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  surfaceColor: string;
  textColor: string;
}

export type Unsubscribe = () => void;

// ─── SDK Interface ────────────────────────────────────────────────────────────

export interface FuzzyPeanutSDK {
  /** Auth — OIDC token and current user. Shell owns the lifecycle. */
  auth: {
    getToken(): Promise<string>;
    getUser(): User;
    onTokenRefresh(cb: (token: string) => void): Unsubscribe;
  };

  /**
   * Event bus — decoupled cross-module communication.
   *
   * Standard events are documented at https://github.com/fuzzypeanut/sdk.
   * Third-party modules may define their own namespaced events.
   *
   * Pattern for request/response:
   *   Emitter:  events.emit('files:pick', { returnEvent: 'mail:files-selected', multiple: true })
   *   Handler:  events.emit('mail:files-selected', { files: [...] })
   */
  events: {
    emit(event: string, payload?: unknown): void;
    on(event: string, handler: (payload: unknown) => void): Unsubscribe;
  };

  /**
   * Registry — discover installed modules and react to changes.
   * Use this to conditionally show integration UI (e.g. "Share via email"
   * only when module-mail is installed).
   */
  registry: {
    getModules(): ModuleInfo[];
    hasModule(id: string): boolean;
    onModuleInstalled(id: string, cb: (mod: ModuleInfo) => void): Unsubscribe;
    onModuleRemoved(id: string, cb: () => void): Unsubscribe;
  };

  /** Push a notification into the shell's global notification panel. */
  notifications: {
    push(notification: Notification): void;
  };

  /** Navigate to a path within the shell. */
  navigate: {
    to(path: string): void;
  };

  /** Current theme and change subscription. */
  theme: {
    getCurrent(): Theme;
    onChange(cb: (theme: Theme) => void): Unsubscribe;
  };
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

let _sdk: FuzzyPeanutSDK | undefined;

/**
 * Called once by the shell to inject the SDK instance.
 * Modules never call this directly.
 */
export function initSDK(sdk: FuzzyPeanutSDK): void {
  _sdk = sdk;
}

/**
 * Get the SDK instance. Throws if called outside the FuzzyPeanut shell
 * (i.e. before initSDK has been called).
 */
export function getSDK(): FuzzyPeanutSDK {
  if (!_sdk) {
    throw new Error(
      '[FuzzyPeanut] SDK not initialized. ' +
      'Ensure this module is running inside the FuzzyPeanut shell.'
    );
  }
  return _sdk;
}

// ─── Convenience Accessors ───────────────────────────────────────────────────

export const useAuth = () => getSDK().auth;
export const useEvents = () => getSDK().events;
export const useRegistry = () => getSDK().registry;
export const useNotifications = () => getSDK().notifications;
export const useNavigate = () => getSDK().navigate;
export const useTheme = () => getSDK().theme;

// ─── Standard Event Names ────────────────────────────────────────────────────
// Import these constants instead of using raw strings to avoid typos.

export const Events = {
  // Files module provides
  FILES_PICK: 'files:pick',
  FILES_PICKED: 'files:picked',
  FILES_OPEN: 'files:open',

  // Mail module provides
  MAIL_COMPOSE: 'mail:compose',
  MAIL_COMPOSE_WITH_FILES: 'mail:compose-with-files',

  // Calendar module provides
  CALENDAR_ADD_EVENT: 'calendar:add-event',
  CALENDAR_EVENT_ADDED: 'calendar:event-added',

  // Contacts (calendar module) provides
  CONTACTS_PICK: 'contacts:pick',
  CONTACTS_PICKED: 'contacts:picked',
} as const;
