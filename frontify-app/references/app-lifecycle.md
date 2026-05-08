# App Lifecycle Reference

[TODO: This file covers the full lifecycle of a Frontify App — from
registration through runtime operation to teardown. The agent reads it
when the user has questions about how the app is initialised, how it
receives context, or how surfaces share or isolate state.]

---

## App registration

[TODO: Explain how an app is registered with a Frontify organisation:

- The app manifest format and required fields
- Registration via the Frontify developer portal or CLI
- How the app ID and credentials are issued
- Linking a local dev build to a registered app]

---

## Initialisation

[TODO: Describe how the app initialises when a surface loads it:

- The SDK initialisation call and required parameters
- How the app receives its surface context on load
- Authentication handshake — how the app gets a token for API calls
- Timing guarantees (what is available synchronously vs asynchronously)]

---

## Context object

[TODO: Document the context object passed to the app at runtime:

- Fields common to all surfaces (user, organisation, locale, theme)
- Surface-specific fields (asset, guideline page, library, etc.)
- How to access and type-check the context in code]

---

## State management

[TODO: Describe how apps manage state:

- Ephemeral state (local to the current surface session)
- Persistent state (if the platform provides any storage API)
- State sharing between surfaces within the same app
- What happens to state when the user navigates away and returns]

---

## Events and messaging

[TODO: Document the event system between the app and the Frontify host:

- Events the app can emit
- Events the app can listen for
- Any postMessage or SDK wrapper used for host communication
- Error events and how to handle them gracefully]

---

## Teardown

[TODO: Describe what happens when the app is closed or the surface is
unmounted:

- Any cleanup the app must perform
- Whether unsaved state is preserved or lost
- How to handle in-flight async operations at teardown]
