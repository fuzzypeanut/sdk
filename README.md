# @fuzzypeanut/sdk

The FuzzyPeanut module SDK. This package defines the contract between the FuzzyPeanut shell and any module — first-party or third-party.

## What this package provides

- **TypeScript types** for users, modules, notifications, themes, and manifests
- **`FuzzyPeanutSDK` interface** — the full API the shell exposes to modules
- **Runtime helpers** — `getSDK()`, `initSDK()`, and `use*` convenience accessors
- **Standard event name constants** — use `Events.FILES_PICK` instead of raw strings

## How it works

The shell initializes the SDK singleton once via `initSDK(sdk)`. Modules access it via `getSDK()` or the `use*` helpers. Because `@fuzzypeanut/sdk` is declared as a shared singleton in Vite module federation config, all modules share the same instance injected by the shell.

```typescript
import { useAuth, useEvents, useRegistry, Events } from '@fuzzypeanut/sdk';

// Get the current user
const user = useAuth().getUser();

// React to other modules being installed
useRegistry().onModuleInstalled('fuzzypeanut-mail', (mod) => {
  // show "Share via email" button
});

// Cross-module communication via event bus
useEvents().emit(Events.FILES_PICK, {
  returnEvent: 'my-module:files-selected',
  multiple: false,
});
```

## Module Manifest

Every module repo ships a `manifest.json` at its root:

```json
{
  "id": "fuzzypeanut-mymodule",
  "displayName": "My Module",
  "version": "1.0.0",
  "remoteEntry": "/remoteEntry.js",
  "exposes": { "Module": "./src/index.svelte" },
  "routes": ["/mymodule"],
  "nav": { "label": "My Module", "icon": "star", "order": 10 },
  "scopes": [],
  "compose": "docker-compose.yml",
  "provides": [],
  "consumes": []
}
```

## Standard Events

| Event constant | String | Direction |
|---|---|---|
| `Events.FILES_PICK` | `files:pick` | → files module |
| `Events.FILES_PICKED` | `files:picked` | ← files module |
| `Events.MAIL_COMPOSE` | `mail:compose` | → mail module |
| `Events.CALENDAR_ADD_EVENT` | `calendar:add-event` | → calendar module |
| `Events.CONTACTS_PICK` | `contacts:pick` | → calendar module |
| `Events.CONTACTS_PICKED` | `contacts:picked` | ← calendar module |

## License

MIT
