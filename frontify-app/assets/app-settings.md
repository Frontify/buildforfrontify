# Template: App Settings

## Description

Shows how to define configurable app settings using `defineSettings()`. Settings appear in the app details in the Frontify marketplace after deploying, publishing, and installing. Supports input fields, dropdowns, checklists, section headings, and switch toggles.

## Key Concepts

- `defineSettings()` from `@frontify/platform-app` defines setting groups
- `appSettings<T>()` hook from `@frontify/app-bridge-app` reads current settings values
- Settings are grouped by named keys (e.g., `example1`, `example2`)
- Supported types: `input`, `dropdown`, `checklist`, `sectionHeading`, `switch`

## Additional Dependencies

None beyond the Hello World base.

## Files That Differ From Hello World

### File: manifest.json

```json
{
  "appId": "",
  "appType": "platform-app",
  "name": "app-settings",
  "metadata": {
    "version": 1
  },
  "permissions": {
    "scopes": ["basic:read", "basic:write"]
  },
  "surfaces": {
    "mediaLibrary": {
      "assetAction": {
        "title": "App Settings",
        "type": ["image"],
        "filenameExtension": ["png", "jpeg", "jpg"]
      },
      "assetCreation": {
        "title": "App Settings"
      }
    }
  }
}
```

### File: src/settings.ts

```typescript
import { defineSettings } from '@frontify/platform-app';

export const settings = defineSettings({
    example1: [
        {
            type: 'input',
            id: 'single-line',
            label: 'Input field',
        },
        {
            id: 'main-dropdown',
            type: 'dropdown',
            size: 'large',
            disabled: true,
            choices: [
                {
                    value: 'option1',
                    label: 'Option 1',
                },
                {
                    value: 'option2',
                    label: 'Option 2',
                },
                {
                    value: 'option3',
                    label: 'Option 3',
                },
            ],
        },
    ],
    example2: [
        {
            id: 'checklist-1',
            type: 'sectionHeading',
            label: 'Choose between those 2 options',
            blocks: [
                {
                    id: 'checklist-1',
                    type: 'checklist',
                    choices: [
                        {
                            id: 'checklist-1-option-1',
                            label: 'I am the first option',
                        },
                        {
                            id: 'checklist-1-option-2',
                            label: 'I am the second option',
                        },
                    ],
                },
            ],
        },
    ],
    example4: [
        {
            id: 'switch-1',
            type: 'sectionHeading',
            label: 'Turn on the switch',
            blocks: [
                {
                    id: 'switch-1-option-1',
                    type: 'switch',
                    switchLabel: 'Turn on switch',
                    size: 'medium',
                },
            ],
        },
    ],
});
```

### File: src/App.tsx

```tsx
/* (c) Copyright Frontify Ltd., all rights reserved. */

import './App.css';
import { appContext, appSettings } from '@frontify/app-bridge-app';
import { Flex, FOCUS_VISIBLE_STYLE, Heading, IconArrowOutExternal20, merge } from '@frontify/fondue';
import { Button } from '@frontify/fondue/components';

export const App = () => {
    const context = appContext();

    const logSettings = () => {
        const [settings] = appSettings<{ 'single-line': string }>();

        console.log('Full settings object', settings);
        console.log('Single-line, field', settings['single-line']);
    };

    return (
        <div className="tw-font-body tw-h-screen tw-bg-base tw-flex tw-flex-col tw-justify-center tw-items-center tw-gap-y-6">
            <Heading size="xx-large" weight="strong">
                Hello World!
            </Heading>
            <Flex direction="column">
                <p className="tw-text-text">
                    Congratulations! You have successfully connected your app to our platform.
                </p>
                <p className="tw-text-text-weak tw-text-body-small">Surface: {context.surface}</p>
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

            <Flex>
                <Button onPress={() => logSettings()}>Get Settings</Button>
            </Flex>
        </div>
    );
};
```

## Integration Notes

- Settings can be combined with any other template pattern
- The `defineSettings()` structure supports nested `blocks` within `sectionHeading` types
- Settings are accessed via the `appSettings()` hook which returns `[settings, setSettings]`
- Setting IDs must be unique across all groups
- Documentation: https://developer.frontify.com/document/2258#/getting-started/app-development-1/app-settings
