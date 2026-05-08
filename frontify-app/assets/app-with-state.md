# Template: App with User State

## Description

Demonstrates how to use `appUserState` to set, get, and subscribe to per-user state changes in a Frontify platform app. Use this when building apps that need to persist user-specific data (preferences, selections, temporary state).

## Key Concepts

- `appUserState<T>()` hook from `@frontify/app-bridge-app` returns `[state, setState]`
- `AppBridgePlatformApp` instance for subscribing to state changes
- `appBridge.state('userState').subscribe(callback)` for reactive updates
- `appBridge.state('userState').get()` for reading current state

## Additional Dependencies

None beyond the Hello World base.

## Files That Differ From Hello World

### File: package.json

Only the `name` and dependency versions differ slightly. Use the Hello World base `package.json` and just change the `name` field.

### File: manifest.json

```json
{
  "appId": "",
  "appVersion": "1.0.0",
  "type": "platform-app",
  "scopes": ["basic:read", "basic:write"],
  "surfaces": {
    "assetAction": {
      "fileTypes": ["png", "jpeg", "jpg"]
    },
    "assetCreation": {}
  }
}
```

### File: src/App.tsx

```tsx
/* (c) Copyright Frontify Ltd., all rights reserved. */

import './App.css';
import { AppBridgePlatformApp, appContext, appUserState } from '@frontify/app-bridge-app';
import { Flex, FOCUS_VISIBLE_STYLE, Heading, IconArrowOutExternal20, merge } from '@frontify/fondue';
import { Button, TextInput } from '@frontify/fondue/components';
import { useState } from 'react';

export const App = () => {
    const appBridge = new AppBridgePlatformApp();
    const context = appContext();
    const [input, setInput] = useState('');
    const [userState, setUserState] = useState<Record<string, string>>();
    const [subscribedState, setSubscribedState] = useState<Record<string, string>>();

    const [userStateApp, setUserStateApp] = appUserState<{ 'test-app': string }>();

    const setState = () => {
        // Access the state of an individual user
        setUserStateApp({ 'test-app': input });
    };

    const getState = () => {
        // Access the current userState
        setUserState(userStateApp);
    };

    const subscribeState = () => {
        // Subscribe to a userState Change
        // The callback is triggered when a new userState is set
        appBridge.state('userState').subscribe((nextState: Record<string, string>, previousState: Record<string, string>) => {
            console.log('previous State', previousState);
            console.log('next State', nextState);
            setSubscribedState(nextState);
        });
    };

    const onInput = (value: string) => {
        setInput(value);
    };

    return (
        <div className="tw-font-body tw-h-screen tw-bg-base tw-flex tw-flex-col tw-justify-center tw-items-center tw-gap-y-6">
            <Heading size="xx-large" weight="strong">
                Hello World for user state!
            </Heading>
            <Flex direction="column">
                <p className="tw-text-text">
                    Congratulations! You have successfully connected your app to our platform.
                </p>
                <p className="tw-text-text-weak tw-text-body-small">Surface: {context.surface}</p>
            </Flex>

            <Flex alignContent={'start'} justify={'start'}>
                <p className="tw-text-text">Lets use our State:</p>
                <TextInput id={'id'} onChange={(e) => onInput(e.target.value)} value={input} />
                <Button onPress={() => setState()}>Set State</Button>
            </Flex>
            <Flex>
                <p className="tw-text-text">Get current state:</p>
                <Button onPress={() => getState()}>Get userState</Button>
                <p className="tw-text-text">{userState && userState['test-app']}</p>
            </Flex>

            <Flex>
                <p className="tw-text-text">Subscribe to userState changes:</p>
                <Button onPress={() => subscribeState()}>Subscribe to userState</Button>
                <p className="tw-text-text">{subscribedState && subscribedState['test-app']}</p>
            </Flex>
            <a
                data-test-id="documentation-link"
                href="https://developer.frontify.com/"
                target="blank"
                rel="noreferrer"
                className={merge([
                    FOCUS_VISIBLE_STYLE,
                    'tw-bg-button-background tw-border-button-border hover:tw-bg-button-background-hover active:tw-bg-button-background-pressed  tw-group tw-border tw-box-box tw-relative tw-flex tw-gap-2 tw-items-center tw-justify-center tw-cursor-pointer tw-font-body tw-font-medium tw-rounded tw-px-4 tw-h-9 tw-text-body-medium',
                ])}
            >
                <IconArrowOutExternal20 />
                <span>Documentation</span>
            </a>
        </div>
    );
};
```

## Integration Notes

- The `appUserState` hook can be combined with any other template pattern
- State is scoped per-user per-app - different users see different state
- Use `subscribe` for real-time updates when state changes from other parts of the app
