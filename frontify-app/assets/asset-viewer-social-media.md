# Template: Asset Viewer Social Media (Bluesky)

## Description

Demonstrates integrating with an external social media service (Bluesky) to share images from the Frontify Asset Viewer surface. Shows multi-screen routing (login, post creation, confirmation), JWT-based authentication persisted via user state, and image upload to a third-party API.

## Key Concepts

- `assetViewer` surface (under the `guideline` project type) for viewing/acting on individual assets
- `appBridge.api({ name: 'getAssetResourceInformation', payload: { assetId } })` to get asset details
- User state for persisting authentication tokens across sessions
- `@atproto/api` (AT Protocol) for Bluesky API integration
- Multi-component routing pattern without a router library

## Additional Dependencies

Add these to `package.json` beyond the Hello World base:

```json
"dependencies": {
    "zustand": "4.5.5",
    "@atproto/api": "^0.13.18"
}
```

## Files That Differ From Hello World

### File: package.json

Same as Hello World but with additional dependencies `zustand` and `@atproto/api` (see above).

### File: manifest.json

```json
{
  "appId": "",
  "appType": "platform-app",
  "name": "asset-viewer-social-media",
  "metadata": {
    "version": 1
  },
  "permissions": {
    "scopes": ["basic:read", "basic:write"]
  },
  "surfaces": {
    "guideline": {
      "assetViewer": {
        "title": "Publish to Bluesky",
        "type": ["image"],
        "filenameExtension": ["jpeg", "jpg", "png", "svg"]
      }
    }
  }
}
```

### File: src/App.tsx

```tsx
import { useEffect, useState } from 'react';
import { Router } from './Router';
import { getUserCredentials } from './useCase/Authentication';

export const App = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [init, setInit] = useState(false);

    useEffect(() => {
        const checkLogin = async () => {
            const credentials = await getUserCredentials();
            if (credentials) {
                setLoggedIn(true);
            }
            setInit(true);
        };

        checkLogin();
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
            <div className="bg-[#161e27] rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <Router init={init} loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
            </div>
        </div>
    );
};
```

### File: src/Router.tsx

```tsx
import { useState } from 'react';
import { Login } from './BlueskyComponents/Login';
import { Logout } from './BlueskyComponents/Logout';
import { InputMask } from './BlueskyComponents/InputMask';
import { PostConfirmation } from './BlueskyComponents/PostConfirmation';
import { authorizeUser, logoutUser } from './useCase/Authentication';
import { createPostWithImage } from './useCase/CreatePostWithImage';
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

type RouterProps = {
    init: boolean;
    loggedIn: boolean;
    setLoggedIn: (loggedIn: boolean) => void;
};

export const Router = ({ init, loggedIn, setLoggedIn }: RouterProps) => {
    const [posted, setPosted] = useState(false);
    const appBridge = new AppBridgePlatformApp();
    const context = appBridge.context().get();

    if (!init) {
        return <div className="text-white text-center">Loading...</div>;
    }

    const onLoginSuccess = async (identifier: string, password: string) => {
        const success = await authorizeUser({ identifier, password });
        if (success) {
            setLoggedIn(true);
        }
        return success;
    };

    const onLogout = () => {
        logoutUser();
        setLoggedIn(false);
    };

    const onSubmitPost = async (text: string) => {
        await createPostWithImage(text);
        setPosted(true);
    };

    if (!loggedIn) {
        return <Login onLoginSuccess={onLoginSuccess} />;
    }

    if (posted) {
        return <PostConfirmation onClose={() => setPosted(false)} />;
    }

    let imageSrc = '';
    if (context.surface === 'assetViewer') {
        // The image source will be fetched asynchronously in the InputMask
        imageSrc = '';
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <Logout onLogout={onLogout} />
            </div>
            <InputMask imageSrc={imageSrc} onSubmit={onSubmitPost} />
        </div>
    );
};
```

### File: src/BlueskyComponents/Login.tsx

```tsx
import { useState } from 'react';

type BlueskyLoginProps = {
    onLoginSuccess: (identifier: string, password: string) => Promise<boolean>;
};
export const Login = ({ onLoginSuccess }: BlueskyLoginProps) => {
    const [credentials, setCredentials] = useState({
        identifier: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: { target: { name: string; value: string } }) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await onLoginSuccess(credentials.identifier, credentials.password);
        if (!success) {
            setError('Username or Password is wrong!');
            setCredentials({ identifier: '', password: '' });
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-gray-900 rounded-xl p-6">
            <div className="text-center mb-6">
                <h1 className="text-white text-xl font-bold mt-4">Sign in to Bluesky</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        name="identifier"
                        placeholder="Handle (e.g. user.bsky.social)"
                        value={credentials.identifier}
                        onChange={handleChange}
                        className="w-full bg-black text-white px-4 py-3 rounded-md border border-gray-800 placeholder-gray-600 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={credentials.password}
                        onChange={handleChange}
                        className="w-full bg-black text-white px-4 py-3 rounded-md border border-gray-800 placeholder-gray-600 focus:border-blue-500 outline-none"
                    />
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <button
                    type="submit"
                    disabled={isLoading || !credentials.identifier || !credentials.password}
                    className={`w-full bg-blue-500 text-white font-bold py-3 rounded-full
              ${
                  isLoading || !credentials.identifier || !credentials.password
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-600'
              }
              transition-colors`}
                >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>

            <div className="mt-6 flex justify-center space-x-4">
                <a
                    href="https://bsky.app/sign-up"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                >
                    Create account
                </a>
            </div>
        </div>
    );
};
```

### File: src/BlueskyComponents/Logout.tsx

```tsx
import { useState } from 'react';

export const Logout = ({ onLogout }: { onLogout: () => void }) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLogoutClick = () => {
        setShowConfirm(true);
    };

    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);
        try {
            onLogout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
            setShowConfirm(false);
        }
    };

    return (
        <div>
            <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="text-left px-4 py-3 text-blue-500 rounded-bl-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <span>Log out</span>
            </button>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-black border border-gray-800 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Log out of the Bluesky App?</h3>
                        <p className="text-gray-400 mb-6">You can always log back in at any time.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-4 py-2 text-white bg-transparent hover:bg-gray-800 rounded-full font-medium border border-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmLogout}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium disabled:opacity-50"
                            >
                                {isLoggingOut ? 'Logging out...' : 'Log out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
```

### File: src/BlueskyComponents/PostConfirmation.tsx

```tsx
export const PostConfirmation = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center">
                <h2 className="text-white text-xl font-bold mb-2">Post sent!</h2>
                <p className="text-gray-400 mb-6">Your post was sent successfully.</p>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### File: src/BlueskyComponents/InputMask.tsx

```tsx
import { useState } from 'react';

type BlueSkyInputMaskProps = {
    imageSrc: string;
    onSubmit: (input: string) => void;
};

export const InputMask = ({ imageSrc, onSubmit }: BlueSkyInputMaskProps) => {
    const [post, setPost] = useState('');
    const [charCount, setCharCount] = useState(300);

    const handlePostChange = (input: string) => {
        setPost(input);
        setCharCount(300 - input.length);
    };

    const onSubmitInput = () => {
        onSubmit(post);
    };

    return (
        <div className="w-full max-w-2xl bg-[#161e27] text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-3">
                <div className="flex-1">
                    <textarea
                        value={post}
                        onChange={(e) => handlePostChange(e.target.value)}
                        placeholder="What's up?"
                        className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-gray-500 text-lg"
                        rows={3}
                    />
                    {imageSrc && (
                        <div className="relative mt-2 rounded-2xl overflow-hidden">
                            <img src={imageSrc} className="w-1/3 rounded-2xl" />
                        </div>
                    )}
                    <div className="border-t border-gray-700 mt-3 pt-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1"></div>
                            <div className="flex items-center space-x-3">
                                {charCount > 0 && <span className="text-sm text-gray-400">{charCount}</span>}
                                <button
                                    className={`px-4 py-1.5 rounded-full font-bold ${
                                        post.length === 0
                                            ? 'bg-blue-500/50 text-gray-300 cursor-not-allowed'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                    disabled={post.length === 0}
                                    onClick={onSubmitInput}
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
```

### File: src/useCase/Authentication.ts

```typescript
import AtpAgent from '@atproto/api';
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

export const authorizeUser = async ({ identifier, password }: { identifier: string; password: string }) => {
    const appBridge = new AppBridgePlatformApp();
    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    try {
        const { data } = await agent.login({
            identifier: identifier,
            password: password,
        });
        appBridge
            .state('userState')
            .set({ accessJwt: data.accessJwt, refreshJwt: data.refreshJwt, handle: data.handle, did: data.did });
        return true;
    } catch {
        return false;
    }
};

export const getUserCredentials = async () => {
    const appBridge = new AppBridgePlatformApp();
    const userState = appBridge.state('userState').get();

    if (userState && userState.accessJwt) {
        const { success, agent, data } = await refreshAccessToken(userState);
        if (success) {
            appBridge.state('userState').set({
                accessJwt: userState.accessJwt,
                refreshJwt: userState.refreshJwt,
                handle: data.handle,
                did: data.did,
            });

            return { agent };
        }

        return null;
    }

    return null;
};

const refreshAccessToken = async ({
    accessJwt,
    refreshJwt,
    handle,
    did,
}: {
    refreshJwt: string;
    handle: string;
    did: string;
    accessJwt: string;
}) => {
    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });
    const { success, data } = await agent.resumeSession({ accessJwt, refreshJwt, handle, did, active: true });

    return { success, agent, data };
};

export const logoutUser = () => {
    const appBridge = new AppBridgePlatformApp();
    appBridge.state('userState').set({ accessJwt: '', refreshJwt: '', handle: '', did: '' });
};
```

### File: src/useCase/CreatePostWithImage.ts

```typescript
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';
import { getUserCredentials } from './Authentication.ts';

const getBlobFromUrl = async (url: string) => {
    const response = await fetch(url + '?mod=v1/resize=400');
    return await response.blob();
};

const getCurrentImageAsBlob = async () => {
    const appBridge = new AppBridgePlatformApp();
    const context = appBridge.context().get();

    let urlResponse = '';
    let assetTitel = '';

    if (context.surface === 'assetViewer') {
        const { previewUrl, title } = await appBridge.api({
            name: 'getAssetResourceInformation',
            payload: { assetId: context.assetId },
        });
        if (previewUrl && title) {
            urlResponse = previewUrl;
            assetTitel = title;
        }
    }

    return { blob: await getBlobFromUrl(urlResponse), title: assetTitel };
};

export const createPostWithImage = async (text: string) => {
    const { blob, title } = await getCurrentImageAsBlob();
    const credentials = await getUserCredentials();

    if (credentials) {
        const { data } = await credentials.agent.uploadBlob(blob);

        await credentials.agent.post({
            text: text,
            embed: {
                $type: 'app.bsky.embed.images',
                images: [
                    {
                        alt: title,
                        image: data.blob,
                        aspectRatio: {
                            width: 1000,
                            height: 500,
                        },
                    },
                ],
            },
        });
    }
};
```

## Integration Notes

- The `assetViewer` surface (under the `guideline` project type) shows the app when viewing individual assets in guidelines
- Authentication tokens are persisted via `appBridge.state('userState')` (same pattern as the app-with-state template)
- The Router pattern here is a simple state machine - for more complex routing, consider a proper router library
- `getAssetResourceInformation` provides `previewUrl` and `title` for the current asset
- This template uses plain Tailwind classes (no `tw-` prefix) unlike other templates that use Fondue tokens
