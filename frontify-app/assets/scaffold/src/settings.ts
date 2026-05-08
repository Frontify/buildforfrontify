import { defineSettings } from '@frontify/platform-app';

/**
 * Admin-configurable settings for this app.
 *
 * Valid types in @frontify/platform-app v0.1.x:
 *   slider, switch, textarea, input, colorInput, checklist,
 *   dropdown, multiInput, notification, sectionHeading, segmentedControls.
 *
 * There is NO `select` type — use `dropdown`.
 */
export const settings = defineSettings({
    credentials: [
        {
            type: 'input',
            id: 'apiBaseUrl',
            label: 'API base URL',
            placeholder: 'https://api.example.com',
        },
        {
            type: 'switch',
            id: 'verbose',
            label: 'Verbose logs',
            defaultValue: false,
        },
    ],
});

export default settings;
