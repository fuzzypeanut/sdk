// ─── Platform Types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  groups: string[];
}

export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  surfaceColor: string;
  textColor: string;
}

export interface Notification {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  /** Duration in ms. 0 = persistent until dismissed. Default: 4000 */
  duration?: number;
  /**
   * Action buttons shown on the notification.
   * When clicked, the shell emits `event` on the event bus (with `payload`)
   * and dismisses the notification.
   */
  actions?: Array<{ label: string; event: string; payload?: unknown }>;
}

export type Unsubscribe = () => void;

// ─── Module Contract Types ────────────────────────────────────────────────────

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
  routes: string[];
  nav?: {
    label: string;
    icon: string;
    order: number;
  };
  /**
   * OIDC scope strings this module requires.
   * Reserved for future enforcement — not currently validated by the registry.
   * Declare them for documentation purposes.
   */
  scopes: string[];
  provides: string[];
  consumes: string[];
}

/**
 * The interface every module's remoteEntry.js must export as default.
 * `mount` and `unmount` are required. Lifecycle hooks are optional.
 */
export interface FPModule {
  /** Mount the module into the target element. Returns an opaque instance handle. */
  mount(target: HTMLElement, props?: Record<string, unknown>): unknown;
  /** Unmount and clean up the module instance. */
  unmount(instance: unknown): void;
  /** Called when the user navigates to this module. Use to refresh data, restart polling, etc. */
  onActive?(instance: unknown): void;
  /** Called when the user navigates away from this module. Use to pause polling, flush state, etc. */
  onInactive?(instance: unknown): void;
  /** Called when the shell passes new props (theme change, auth refresh, route params). */
  onPropsChanged?(instance: unknown, props: Record<string, unknown>): void;
}

// ─── Storage Types ────────────────────────────────────────────────────────────

export interface ObjectStoreCapabilities {
  multipart: boolean;
  signedUrls: boolean;
}

export interface ObjectMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
}

export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListResult {
  objects: ObjectMetadata[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export interface SignedUrlOptions {
  method: 'GET' | 'PUT';
  /** Expiry in seconds. Default: 3600 */
  expiresIn?: number;
  contentType?: string;
}

export interface SDKPrefs {
  /**
   * Get a preference value. Returns defaultValue if not set or if
   * localStorage is unavailable. Never throws.
   */
  get<T>(key: string, defaultValue: T): T;
  /**
   * Set a preference value. Value must be JSON-serializable.
   * No-op if localStorage is unavailable.
   * Convention: namespace keys as `{module-id}:{key}` (e.g. `fuzzypeanut-files:view-mode`).
   */
  set(key: string, value: unknown): void;
  /** Remove a preference. No-op if localStorage is unavailable. */
  remove(key: string): void;
}

export interface SDKObjectStore {
  capabilities(): ObjectStoreCapabilities;
  put(key: string, data: Blob | ArrayBuffer, options?: PutOptions): Promise<void>;
  get(key: string): Promise<Blob>;
  head(key: string): Promise<ObjectMetadata>;
  delete(key: string): Promise<void>;
  list(options?: ListOptions): Promise<ListResult>;
  signedUrl(key: string, options: SignedUrlOptions): Promise<string>;
}

export interface SDKDelivery {
  /** Get the public CDN URL for a stored object. */
  url(key: string): string;
  /** Purge a single object from the CDN cache. */
  purge(key: string): Promise<void>;
  /** Purge all objects under a key prefix from the CDN cache. */
  purgePrefix(prefix: string): Promise<void>;
}

// ─── Event Payload Types ──────────────────────────────────────────────────────

/** Minimal file reference used in event payloads. */
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
}

/** Minimal contact reference used in event payloads. */
export interface ContactRef {
  id: string;
  displayName: string;
  email?: string;
}

/**
 * Typed payload map for all standard (core) events.
 *
 * The `events.on` and `events.emit` overloads resolve to these types when
 * a key from this map is used. For custom events use the untyped overload
 * with a namespaced string (e.g. `my-org-my-module:action`).
 */
export interface CoreEventMap {
  // Files module
  'files:pick': { returnEvent: string; multiple?: boolean };
  'files:picked': { files: FileInfo[] };
  'files:open': { path: string };

  // Mail module
  'mail:compose': { to?: string[]; subject?: string; body?: string };
  'mail:compose-with-files': { to?: string[]; subject?: string; fileIds?: string[] };

  // Calendar module
  'calendar:add-event': { ical: string };
  'calendar:event-added': { eventId: string };

  // Contacts module
  'contacts:pick': { returnEvent: string; multiple?: boolean };
  'contacts:picked': { contacts: ContactRef[] };
  'contacts:get': { email: string; returnEvent: string };
  'contacts:found': { contact: ContactRef | null };

  // Office module
  'office:open': { wopiUrl: string; fileName: string };
}

// ─── SDK Interface ────────────────────────────────────────────────────────────

export interface FuzzyPeanutSDK {
  /**
   * Auth — OIDC token and current user.
   * The shell owns the token lifecycle; modules never refresh tokens directly.
   */
  auth: {
    getToken(): Promise<string>;
    /** Returns null if auth is not yet initialized or the user is logged out. */
    getUser(): User | null;
    onTokenRefresh(cb: (token: string) => void): Unsubscribe;
    onAuthChange(cb: (user: User | null) => void): Unsubscribe;
  };

  /**
   * Event bus — decoupled cross-module communication.
   *
   * Typed overloads for all standard events (CoreEventMap).
   * Untyped escape hatch for custom/third-party events (namespaced strings).
   *
   * Request/response pattern:
   *   emit('files:pick', { returnEvent: 'mail:files-selected', multiple: true })
   *   on('mail:files-selected', ({ files }) => { ... })
   */
  events: {
    emit<K extends keyof CoreEventMap>(event: K, payload: CoreEventMap[K]): void;
    emit(event: string, payload?: unknown): void;
    on<K extends keyof CoreEventMap>(event: K, handler: (payload: CoreEventMap[K]) => void): Unsubscribe;
    on(event: string, handler: (payload: unknown) => void): Unsubscribe;
  };

  /**
   * Registry — discover installed modules and react to changes.
   * Use to conditionally show integration UI (e.g. "Share via email" only
   * when module-mail is installed).
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

  /**
   * Namespaced localStorage-backed UI preferences.
   * Small, non-secret, JSON-serializable values only.
   * Safe fallback (no-op / returns defaultValue) when localStorage is unavailable.
   * Key convention: `{module-id}:{key}` (e.g. `fuzzypeanut-files:view-mode`).
   */
  prefs: SDKPrefs;

  /**
   * Polymorphic object storage (S3-compatible or GCS).
   * `undefined` if no object store is configured for this deployment.
   * Always check before use: `if (sdk.objectStore) { ... }`
   */
  objectStore?: SDKObjectStore;

  /**
   * CDN delivery URL construction and cache purge.
   * `undefined` if no CDN is configured for this deployment.
   * Always check before use: `if (sdk.delivery) { ... }`
   */
  delivery?: SDKDelivery;
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

const GLOBAL_KEY = '__fuzzyPeanutSDK';

let _sdk: FuzzyPeanutSDK | undefined;

/**
 * Called once by the shell to inject the SDK instance.
 * The shell also exposes it on window so dynamically loaded modules
 * (which have their own copy of this package) resolve the same singleton.
 * Modules never call this directly.
 */
export function initSDK(sdk: FuzzyPeanutSDK): void {
  _sdk = sdk;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[GLOBAL_KEY] = sdk;
  }
}

/**
 * Get the SDK instance. Falls back to the window global so modules loaded
 * as separate ES bundles (not bundled with the shell) still get the same instance.
 * Throws if called outside the FuzzyPeanut shell.
 */
export function getSDK(): FuzzyPeanutSDK {
  if (_sdk) return _sdk;
  if (typeof window !== 'undefined') {
    const global = (window as unknown as Record<string, unknown>)[GLOBAL_KEY];
    if (global) {
      _sdk = global as FuzzyPeanutSDK;
      return _sdk;
    }
  }
  throw new Error(
    '[FuzzyPeanut] SDK not initialized. ' +
    'Ensure this module is running inside the FuzzyPeanut shell.'
  );
}

// ─── Convenience Accessors ───────────────────────────────────────────────────

export const useAuth          = () => getSDK().auth;
export const useEvents        = () => getSDK().events;
export const useRegistry      = () => getSDK().registry;
export const useNotifications = () => getSDK().notifications;
export const useNavigate      = () => getSDK().navigate;
export const useTheme         = () => getSDK().theme;
export const usePrefs         = () => getSDK().prefs;
export const useObjectStore   = () => getSDK().objectStore;
export const useDelivery      = () => getSDK().delivery;

// ─── Standard Event Names ────────────────────────────────────────────────────
// Import these constants instead of raw strings — autocomplete + typo prevention.

export const Events = {
  // Files module
  FILES_PICK:               'files:pick',
  FILES_PICKED:             'files:picked',
  FILES_OPEN:               'files:open',

  // Mail module
  MAIL_COMPOSE:             'mail:compose',
  MAIL_COMPOSE_WITH_FILES:  'mail:compose-with-files',

  // Calendar module
  CALENDAR_ADD_EVENT:       'calendar:add-event',
  CALENDAR_EVENT_ADDED:     'calendar:event-added',

  // Contacts module (module-contacts)
  CONTACTS_PICK:            'contacts:pick',
  CONTACTS_PICKED:          'contacts:picked',
  CONTACTS_GET:             'contacts:get',
  CONTACTS_FOUND:           'contacts:found',

  // Office module
  OFFICE_OPEN:              'office:open',
} as const;
