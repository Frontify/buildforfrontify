# Template: Secure Third-Party Request

## Description

Demonstrates how to make secure API requests to external services using secrets and network endpoints defined in `manifest.json`. Secrets (like API keys) are stored securely and injected into requests via the `%%SECRET_NAME%%` placeholder syntax. The app never directly accesses the secret value.

## Key Concepts

- `manifest.json` `secrets` array defines secret names (e.g., `THIRD_PARTY_API_KEY`)
- `manifest.json` `endpoints` array defines allowed network endpoints with method, URL, parameters, and headers
- `%%SECRET_NAME%%` placeholder in endpoint URLs and headers gets replaced with actual secret values at runtime
- `appBridge.api({ name: 'getSecureRequest', payload: { endpoint, requestParams } })` calls the endpoint
- `.secret.json` file (gitignored) stores local development secret values

## Additional Dependencies

None beyond the Hello World base.

## Files That Differ From Hello World

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
  },
  "secrets": [
    "THIRD_PARTY_API_KEY"
  ],
  "endpoints": [
    {
      "id": "body-endpoint-get",
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/posts/%%THIRD_PARTY_API_KEY%%",
      "parameters": [
        {
          "name": "page",
          "type": "string",
          "required": false
        },
        {
          "name": "segment",
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "id": "body-endpoint-post",
      "method": "POST",
      "url": "https://jsonplaceholder.typicode.com/posts",
      "parameters": [
        {
          "name": "title",
          "type": "string",
          "required": true
        },
        {
          "name": "body",
          "type": "string",
          "required": true
        }
      ],
      "headers": {
        "x-api-key": "%%THIRD_PARTY_API_KEY%%"
      }
    }
  ]
}
```

### File: .secret-example.json

```json
{
  "THIRD_PARTY_API_KEY": 1,
  "__DONT_COMMIT_THIS_FILE_WITH_TOKENS__": true
}
```

Note: Copy this to `.secret.json` and fill in real values for local development. Never commit `.secret.json`.

### File: src/App.tsx

```tsx
/* (c) Copyright Frontify Ltd., all rights reserved. */

import './App.css';
import { appContext } from '@frontify/app-bridge-app';
import { Flex, Heading } from '@frontify/fondue';

import { ChildWithRequestComponent } from './Component/ChildWithRequestComponent.tsx';

export const App = () => {
    const context = appContext();

    return (
        <div className="tw-font-body tw-text-text tw-h-screen tw-bg-base tw-flex tw-flex-col tw-justify-center tw-items-center tw-gap-y-6">
            <Heading size="xx-large" weight="strong">
                App connected!
            </Heading>
            <Flex direction="column">
                <p>Congratulations! You have successfully connected your app to our platform.</p>
                <p className="tw-text-text-weak tw-text-body-small">[Surface] Your entrypoint is: {context.surface}</p>
            </Flex>

            <Flex direction="column">
                <Heading size="x-large" weight="strong">
                    Secure Request feature
                </Heading>
                <p>Try calling the Secure Request Service and check the output in the console.</p>
                <ChildWithRequestComponent />
            </Flex>
        </div>
    );
};
```

### File: src/Component/ChildWithRequestComponent.tsx

```tsx
/* (c) Copyright Frontify Ltd., all rights reserved. */

import { AppBridgePlatformApp } from '@frontify/app-bridge-app';
import { Button } from '@frontify/fondue/components';

export const ChildWithRequestComponent = () => {
    const appBridge = new AppBridgePlatformApp();

    /**
     * Call the Secure request to retrieve an API token value
     * using the `getSecureRequest` method from appBridge.api.
     *
     * The endpoint ID in the payload (e.g., 'body-endpoint-get')
     * matches the endpoint name defined in manifest.json.
     */
    const onPress = async () => {
        const output = await appBridge.api({
            name: 'getSecureRequest',
            payload: { endpoint: 'body-endpoint-get', requestParams: { title: 'title', page: 1, segment: 'posts' } },
        });

        console.log('output', output);
    };

    return <Button onPress={onPress}>Call the Secure Request</Button>;
};
```

## Integration Notes

- Secrets are managed per-app in the Frontify Developer Portal
- For local development, create a `.secret.json` file (gitignored) based on `.secret-example.json`
- Endpoint IDs are referenced in code via `appBridge.api({ name: 'getSecureRequest', payload: { endpoint: '<id>' } })`
- Parameters defined in the endpoint config can be passed via `requestParams`
- This pattern can be combined with any other template (just add `secrets` and `endpoints` to the manifest)
