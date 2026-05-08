# Debugging

Symptom-indexed guide for the most common failure modes when building Frontify custom themes. When the user says "it's not working" and you need to diagnose, start here and match on the observed behavior.

## Diagnostic strategy

Before jumping to a specific symptom, ask the user (or check yourself):

1. **Is this a dev-time issue or a deployed-theme issue?** They often have very different causes — dev-mode setup problems vs. deployment/manifest problems.
2. **Has anything worked before, or is this the first run?** First-run issues are almost always setup; regressions are almost always code.
3. **What's the exact error?** Browser console errors, CLI output, TypeScript errors, Frontify UI errors all live in different places. Ask them to share the specific message.

Then match the symptom below.

## Symptom: Local dev server starts but the guideline doesn't connect

**Likely causes:**

- Port mismatch. The guideline's "Local Theme Development" app has a port field — it must match the port the CLI prints (default 5600, but check the actual output in case the CLI picked another).
- The "Local Theme Development" app isn't installed in the Marketplace on this instance.
- Dev mode isn't enabled on the account at all — the "Local Theme Development" app won't appear in the Marketplace without it.
- Old service worker cached from a previous session. Hard-refresh the guideline tab (Cmd+Shift+R / Ctrl+Shift+R), or open the tab in an incognito window to bypass.
- Firewall blocking localhost connections from the browser to the dev server.

## Symptom: Theme connects but renders a white/blank page

**Likely causes:**

- Runtime error in the theme code. Open the browser console — React crashes are logged there with a stack trace pointing to your code.
- Top-level component is returning `null`. A common pattern is:

  ```tsx
  const templateContext = useTemplateContext(appBridge);
  return templateContext ? <Layout>...</Layout> : null;
  ```
  
  If `templateContext` stays null (e.g. because you're on a page type the theme doesn't handle, or because the context subscription never triggers), the return stays null. Log the value to confirm.
- Missing `default` variant for one of the three templates. If you're on a cover page and your `defineTheme` only populated `documentPage`, the cover page renders nothing.
- CSS issue — e.g. `position: fixed` elements with the wrong z-index covering everything, or a zero-height container collapsing the layout.

## Symptom: Document pages render the layout but `<Content />` area is empty

**Likely causes:**

- You forgot to render `<Content />` inside the `documentPage` template. This is the most common cause of this specific symptom.
- The guideline genuinely has no published content yet. Edit mode will hint at this (placeholders appear).
- You rendered `<Content />` outside the rendered template (e.g. inside a conditional that evaluates false).

## Symptom: Footer disappears unexpectedly

**Likely causes:**

- `Footer` is `null` — the editor has removed it in Theme Settings. This is legitimate; render conditionally:
  ```tsx
  {Footer && <Footer />}
  ```
- You rendered `<Footer />` without importing it from props. `Footer` is not an import; it comes from `ThemeProps`.

## Symptom: A setting value is `undefined` when the component reads it

**Likely causes:**

- No `defaultValue` on the setting block. The value is `undefined` until the editor explicitly sets it, which they may never do.
- `id` mismatch between the block definition and the key in `templateSettings`. Search the codebase for the id — if it appears in exactly one place, you have a typo somewhere.
- Setting is an asset input but you're reading from `templateSettings` instead of `templateAssets`. Asset inputs always land in `templateAssets`.
- The generic on `useSettings` is missing or wrong, so TypeScript isn't catching the typo: `useSettings<MyTemplateSettings>(appBridge)`.
- Setting is defined for a different template. `cover` template settings don't leak into `documentPage` settings unless you explicitly share the structure.

## Symptom: Setting values are stale and don't update when edited

**Likely causes:**

- Reading with `appBridge.context('settings').get()` instead of `useSettings` or `useSyncExternalStore`. `.get()` is one-shot and does not re-render.
- Memoized derived values with a stale dependency array. Include `templateSettings` (or the specific values you use) in the deps.

## Symptom: Component doesn't re-render when language / navigation / editing state changes

**Likely causes:**

- Using `.get()` without a subscription. Use the provided hook (`useCurrentLanguage`, `useIsEditing`, etc.) or wire up `useSyncExternalStore` manually.
- Subscribed but the subscription is fired only on initial mount because of a stale closure. Double-check any `useEffect` that re-subscribes: make sure the `unsubscribe` is returned and the deps are right.

## Symptom: `documentNavigation` is empty or `undefined`

**Likely causes:**

- Not hydrated yet. `documentNavigation` is the one context key that's lazy. You must dispatch `hydrateContextDocumentNavigation(documentId)` before reading it — or use `useDocumentNavigation(appBridge, document)` which handles hydration for you.
- You're reading from the wrong document's entry. `documentNavigation` is `Record<number, ...>` keyed by document id. Confirm you're looking up the currently active document.

## Symptom: `navigateToSectionHeading` scrolls to the wrong position (overlaps with sticky header)

**Likely cause:**

- You haven't updated `state.scrollTopOffset`. The platform reads this value to offset the scroll position so the heading doesn't end up underneath your sticky UI. Set it to the total height of any sticky elements:
  ```tsx
  appBridge.state('scrollTopOffset').set(headerHeight);
  ```

## Symptom: TypeScript errors on `ThemeProps`, `defineTheme`, or setting block types

**Likely causes:**

- Version mismatch between `@frontify/app-bridge-theme` and `@frontify/guideline-themes`. The `AppBridgeTheme` interface is generic-threaded through setting block types, so mismatched versions cause unhelpful errors. Check `package.json` for both, bump to compatible versions.
- Missing peer dependency — older boilerplates expected React 18; moving to React 19 may require SDK bumps.
- Type-only imports missing the `type` keyword — less about correctness, more about build-step gotchas in projects with strict isolatedModules.

## Symptom: The AI Brand Assistant button does nothing

**Likely cause:**

- Feature isn't enabled for this guideline. Check `useEnabledFeatures(appBridge).includes('AI_BRAND_ASSISTANT')` before rendering the trigger, and hide the button when the feature is absent rather than dispatching into the void. *(Rule F1.)*

## Symptom: `frontify-cli deploy` fails with an authentication or app-id error

**Likely causes:**

- `manifest.json` still has the placeholder `<ADD_YOUR_MARKETPLACE_APP_ID_HERE>`. Replace it with your real Marketplace App ID.
- Auth token is missing required scopes. The deploy flow needs `basic:read`, `blocks:read`, and `blocks:write`.
- You're deploying against the wrong instance (`--instance` flag mismatch with the instance where the app id lives).

## Symptom: Deploy succeeds but changes don't show up in the guideline

**Likely causes:**

- You're still connected to the **Local Theme Development** app, which points at `localhost`. Switch the Theme chooser in the guideline to your actual deployed theme.
- Browser cache — hard-refresh the guideline tab.
- Versioned assets still being served from the CDN. Give it a minute and retry.

## Symptom: Hot reload stops working mid-session

**Likely causes:**

- File watcher limits (especially on Linux). Increase `fs.inotify.max_user_watches`.
- Error state in the Vite/ESBuild transform. Stop and restart `npm run serve`.
- Error in a file the watcher can't hot-swap — often a syntax error that breaks the module graph. Fix the underlying error and the watcher usually recovers.

## Symptom: Navigation item highlights are wrong (wrong item shown as active)

**Likely cause:**

- `isActive` logic bugs. The boilerplate has dedicated helpers (`isCoverPageActive`, `isDocumentActive`, `isDocumentGroupActive`, etc.) precisely because this logic is fiddly. Match active-state by comparing the template context's current id against the navigation item's id. When in doubt, copy the boilerplate helpers and adapt.
- Stale `templateContext` — make sure you're reading from the hook, not from `.get()` at mount time.

## Symptom: Settings sidebar shows my section but the controls are blank / unresponsive

**Likely causes:**

- A `show(bundle)` callback that always returns `false`, hiding all the controls.
- A `sectionHeading` with an empty `blocks` array.
- Deeply nested `multiInput` or `sectionHeading` structure that accidentally hides children.
- `id` collisions — two blocks in the same structure sharing an id. The last one wins, the first disappears.

## Symptom: Editor reports "this setting isn't persisting"

**Likely cause:**

- `onChange(bundle)` in your block is mutating the bundle incorrectly and clobbering the saved value. Cross-check with a known-good pattern like `appendUnit(bundle, 'logoWidth')` from the SDK.

## When none of the above match

If the symptom doesn't fit any pattern above:

1. **Simplify aggressively.** Remove half the theme's JSX and see if the problem persists. Keep halving until you isolate the culprit.
2. **Check the browser console *and* the CLI terminal.** Errors in the bundler, the dev server, and the browser all surface in different places.
3. **Diff against the boilerplate.** If something worked in the boilerplate but doesn't in this theme, there's a structural difference worth finding — versions, imports, entry path, manifest.
4. **Ask in the Frontify Friends Slack community.** Several limitations that look like bugs are actually "not supported" items; the team is responsive and it's often faster to ask than to keep searching.