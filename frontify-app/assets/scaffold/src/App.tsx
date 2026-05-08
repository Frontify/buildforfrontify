import { useMemo } from 'react';
import { AppBridgePlatformApp, appContext } from '@frontify/app-bridge-app';

/**
 * Default scaffold App.
 * - Initialises AppBridge once (memoised).
 * - Uses discriminated-union narrowing on `context.surface` before
 *   accessing surface-specific fields. tsc rejects bare access on the
 *   union, so do NOT remove the narrowing.
 */
export default function App() {
    const appBridge = useMemo(() => new AppBridgePlatformApp(), []);
    const context = appContext();

    // Tiny diagnostic so the dev can see AppBridge wired up.
    void appBridge;

    if (context.surface === 'assetCreation') {
        return (
            <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
                <h2>&lt;APP_TITLE&gt;</h2>
                <p>Surface: <code>assetCreation</code></p>
                <p>Parent: <code>{context.parentId}</code></p>
                <p>
                    Replace this body with the app's first feature.
                    Use <code>appBridge.api(&#123;...&#125;)</code> to call
                    <code>createAsset</code>, <code>executeGraphql</code>, etc.
                </p>
            </div>
        );
    }

    if (context.surface === 'assetAction') {
        return (
            <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
                <h2>&lt;APP_TITLE&gt;</h2>
                <p>Surface: <code>assetAction</code></p>
                <p>Asset: <code>{context.assetId}</code></p>
            </div>
        );
    }

    if (context.surface === 'assetBulkActions') {
        return (
            <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
                <h2>&lt;APP_TITLE&gt;</h2>
                <p>Surface: <code>assetBulkActions</code></p>
                <p>Selected assets: <code>{context.selection.assets.ids.length}</code></p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <h2>&lt;APP_TITLE&gt;</h2>
            <p>Detected surface: <code>{String(context.surface)}</code></p>
            <p>This scaffold has no template for this surface yet.</p>
        </div>
    );
}
