import { renderReactApp } from '@frontify/app-bridge-app';
import { defineApp } from '@frontify/platform-app';
import App from './App';
import { settings } from './settings';

// CANONICAL ENTRY for a Frontify Platform App.
//
// `renderReactApp` instantiates AppBridge, subscribes to "Context.connected",
// dispatches `openConnection`, and only mounts React on #root AFTER the bridge
// handshake completes. This is REQUIRED — calling `createRoot(...).render(<App />)`
// directly mounts React before the bridge is connected, which causes
// `appContext()` to return undefined and the App to crash on first read with
// `TypeError: Cannot read properties of undefined (reading 'surface')`.
renderReactApp(
    defineApp({
        app: App,
        settings,
    }),
);
