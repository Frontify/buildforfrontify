# App Surfaces Reference

[TODO: This file is the detailed reference for surface-specific implementation.
The agent reads it after the surface(s) are known, during the development phase.
Keep each surface section self-contained — the agent may need to refer to just
one surface without reading all three.]

---

## Asset action

[TODO: Document everything a developer needs to implement an asset action surface:

- What triggers an asset action (user selects asset → opens action menu)
- The context object the app receives (asset metadata, type, URL, etc.)
- The action manifest — how to declare the action, its icon, and label
- Supported asset types (image, video, document, etc.) and how to filter
- How to render the action UI (panel, modal, inline)
- Return values or mutations the action can produce
- An annotated code example of a minimal asset action]

---

## Guideline block

[TODO: Document everything needed to implement an app as a guideline block:

- How this surface differs from a custom block (capabilities, API access)
- The block manifest and settings schema for apps
- How the block receives guideline context (page, section, brand)
- Lifecycle hooks specific to this surface
- Interaction model — what editors can do with the block in the UI
- An annotated code example of a minimal guideline block app]

---

## Workspace / Library panel

[TODO: Document everything needed to implement a workspace or library panel:

- Where the panel appears in the Frontify UI
- The context object the panel receives (current library, selected assets, user)
- Navigation and routing within a panel (if multi-view panels are supported)
- How the panel communicates back to the Frontify workspace
- Any persistent state or storage the panel can use
- An annotated code example of a minimal workspace panel]

---

## Multi-surface apps

[TODO: Document how a single app can support multiple surfaces:

- How surfaces are declared in the app manifest
- How the app entry point determines which surface context it is running in
- Shared state and code between surfaces
- Testing a multi-surface app locally]
