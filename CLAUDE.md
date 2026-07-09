# daTryp — React/TypeScript Frontend

Vite + React 19 + TypeScript + MUI 5 + Tailwind 3 + TanStack Query + axios.

## Project layout
- Per-component folder: `src/components/<Name>/index.tsx` + `index.scss`.
- Shared form primitives: `src/components/common/FormFields/` — `ButtonCustom`, `ButtonIcon`, `CheckBoxCustom`, `DialogBox`, `DropDown`, `InputField`, `Autocomplete`, `Field`, `Toggle`.
- Other shared components: `src/components/common/` (e.g. `DeleteBtn`, `PlaceCard`, `TripBox`, `Layout`, `IconLink`).
- Shared modal shell: `src/components/ModalButton/`.
- Path aliases are rooted at `src/`: import with `components/...`, `api/hooks/...`, `types`, `utils` — never relative `../../../`.

## Core rules

### 1. Reuse over rebuild (DRY)
Before writing a new button, modal, dropdown, or form field, check `src/components/common/` and `src/components/common/FormFields/` first. If a primitive almost fits, **extend it** with an optional prop rather than forking a one-off. Examples already in the codebase: `ButtonCustom` accepts `children`, `ButtonIcon` accepts `className` / `iconPosition` / `iconProps` / `ariaLabel` / `disabled`.

### 2. Component patterns
- **Buttons with text only** → `ButtonCustom` (variants: `standard`, `line`, `plain`, `text`, `standard-small`, `none`).
- **Buttons with icon + text** → `ButtonIcon` (set `iconPosition` to `start` or `end`; pass icon props via `iconProps`).
- **Icon-only buttons** → MUI `IconButton` is fine (already used across the app).
- **Modals** → `ModalButton` with a `ref` (`ModalButtonHandle`: `openModel()` / `closeModal()`). Don't drop a raw MUI `Modal` + re-inline the `.modalCustom` shell.
  - **Mobile sizing convention**: every `ModalButton`-based modal MUST render near-full-width on mobile (**≤1024px viewport** — matched to the app's mobile chrome, since `BottomNav` shows at ≤1024px; iPad portrait 768 / landscape 1024 are "mobile" here). The `.modalCustom` shell already enforces this — `width: calc(100vw - 24px)` (12px gutter each side). Don't add per-modal `max-width` overrides that fight this. If a modal needs an unusually wide layout on desktop (>1024px), set `containerClassName` to a name-scoped class and only widen the desktop branch — leave the mobile branch alone so the user always gets the same consistent edge-to-edge treatment.
- **Selects / inputs / checkboxes / autocompletes** → use the wrappers in `FormFields/`, not raw MUI.

### 3. Styling
- **No inline `style={{...}}`** for layout or theming. Inline is only acceptable for truly one-off dynamic values that can't live in CSS (e.g. a computed transform).
- Put styles in a per-component stylesheet (`index.scss` next to `index.tsx`) or extend the global stylesheet (`src/index.scss` / `src/App.scss`) when the rule is genuinely global.
- Stylesheets are SCSS — you can use nesting, `&` parent refs, variables, and `@use` when it helps readability. Keep it CSS-like by default; reach for scss features only when they meaningfully reduce duplication.
- Use Tailwind's `theme('colors.<name>')` inside SCSS for project palette colors (`primaryGreen`, `primaryOrange`, etc.) — that's the existing pattern.
- Class names follow the BEM-ish dash convention already in use (`.basic-trip-info .trip-status-badge .status-dot`).
- Use `classnames` (already a dep) for conditional classes — don't hand-concatenate strings.

### 4. Hooks & state
- `useState` for values that drive renders; `useRef` for imperative handles or values that shouldn't trigger renders (e.g. `ModalButton` ref).
- `useMemo` only when the computation is non-trivial or the result is a dependency of another hook. Don't memoize cheap expressions.
- Lookups from the backend go through `api/hooks/useLookups` and similar — don't fetch directly in components.
- Custom hooks live next to their consumer if one-off, or under `src/hooks/` (or `api/hooks/`) if shared.

### 5. TypeScript
- Type props with an exported `interface ComponentNameProps`. Use `type` for unions/aliases.
- Avoid `any`. If a third-party type forces it (e.g. a generic icon component), localize it to one prop and document why.
- Prefer `ReactNode` over `JSX.Element` for children-like props.
- For MUI event types, import them from `@mui/material` (e.g. `SelectChangeEvent`).

### 6. Constants for repeated string literals
- If the same string literal (status value, action key, user-facing label) appears in **two or more places**, extract a `const` object instead of repeating the literal. Don't keep a hand-written union *and* a parallel const — let the const drive the type.
- Use the `as const` + derived-type pattern when the values also need a union type:
  ```ts
  // src/constants/index.ts — the runtime const
  export const BUDGET_STATUS = {
      UNDER: 'under',
      WARNING: 'warning',
      OVER: 'over',
      EMPTY: 'empty',
  } as const;

  // src/types/common.types.ts — the derived type
  import type { BUDGET_STATUS } from 'constants';
  export type BudgetStatus = (typeof BUDGET_STATUS)[keyof typeof BUDGET_STATUS];
  ```
- For label-only constants (no associated type), a plain `as const` object is enough:
  ```ts
  const LABEL = { ADD: 'Add Destination', EDIT: 'Edit', SAVE: 'Save Destination' } as const;
  ```
- **Strict separation: runtime values vs. types.**
  - **Runtime constants** → `src/constants/index.ts` (alongside `ACTION`, `BUDGET_STATUS`, `BUTTON_VARIANT`, `TRIP_STATUS`, `TRIP_BASIC`). Import the **value** from `'constants'`.
  - **Derived types** that go with those constants → `src/types/common.types.ts` (alongside `ActionType`, `BudgetStatus`, `ButtonVariant`, `TripStatusName`). The types file imports the const from `'constants'` and re-exports the derived type. Import the **type** from `'types'`.
  - **Never declare `type` / `interface` inside `src/constants/`** and never declare a runtime `const` inside `src/types/`. The directories are mirrors of each other — one for values, one for types.
  - Local to one component? Define the const + (optional) derived type above the component — only promote to the split layout when a second file imports it.

### 7. Shared prop shapes via generic base interfaces
- When two or more component prop interfaces share most of their fields (e.g. add/edit modal buttons that all take `onChange` / `type` / `data` / `buttonType` / `isViewMode`), extract a **generic base interface** in `src/types/common.types.ts` and `extend` it. Don't duplicate field-by-field.
- Example: `AddEditButtonProps<TDraft, TData>` is shared by `AddDestinationBtnProps` and `AddPlaceBtnProps`; each only adds the fields unique to that component (`defaultDate` / `tripTypeId` / etc.).
- Threshold: extract when ≥5 fields overlap **or** when a third consumer is about to appear. Two consumers with two shared fields is not worth a generic.

### 8. Code quality
- Keep components focused; if a render branch grows beyond ~30 lines, extract a child component.
- Don't introduce a wrapper component, hook, or util that's used in only one place — inline it.
- Don't add comments that restate what the code does. Comment only the non-obvious *why*.

### 9. Prefer extraction over big files
- When a component file is approaching ~250 lines or contains multiple self-contained UI regions (a card, a form, a summary chip, a list row, a meter widget, etc.), pull each region into its own component folder. Big single-file components are hard to read, hard to reuse, and bury the section you actually want to edit.
- Follow the existing per-component folder convention: `src/components/<Name>/index.tsx + index.scss`. When several related extracts cluster around one feature, group them under a parent folder — e.g. `src/components/Review/ReviewCard/`, `Review/ReviewForm/`, `Review/ReviewSection/`, `Review/ReviewSummary/`. Same nesting pattern as `common/FormFields/`.
- Each extracted component owns its own `index.scss` — move only the rules that belong to it, and delete classes from the parent stylesheet that no longer apply. Don't let dead CSS linger.
- Update all import sites in the same change (internal cross-references between extracted components, plus external consumers like page sections). Run typecheck after the move to catch stale paths.
- This complements rule 8's "extract a child component when a render branch grows beyond ~30 lines" — same spirit, applied at the file/feature level too. Don't over-correct: a 5-line wrapper used in exactly one place with no reuse on the horizon should still be inlined per rule 8's "no single-use abstractions".

### 10. Accessibility (ADA / WCAG 2.1 AA) — non-negotiable
Every component you create or touch must be usable by keyboard and screen-reader users. This is a hard requirement, not a nice-to-have — treat an inaccessible control the same as a bug.

- **Interactive elements must be real interactive elements.** Anything clickable is a `<button>` (in-page action) or `<a>`/React Router `<Link>` (navigation) — never a `<div>`/`<span>`/`<li>` with only `onClick`. Native elements are focusable and keyboard-operable for free. If you *must* put a handler on a non-interactive element, it needs **all three**: `role="button"` (or the right role), `tabIndex={0}`, and an `onKeyDown` that fires on Enter/Space. Prefer converting to a `<button>` instead — reach for the shared `ButtonCustom` / `ButtonIcon` first (rule 1).
- **Every control needs an accessible name.** Icon-only buttons (MUI `IconButton`, icon-only `ButtonCustom`/`ButtonIcon`) require an `aria-label` / `ariaLabel`. All name strings go through i18n (`t(...)`) — never hard-code English (rule 6 spirit).
- **Images:** meaningful `<img>` needs a descriptive `alt`; purely decorative images get `alt=""` (empty, not missing) and decorative inline icons/emoji get `aria-hidden="true"`.
- **Forms:** use the `FormFields/` wrappers (they wire label ↔ input). Every field has a programmatic label; a placeholder is NOT a label. Group related fields with `<fieldset>`/`legend` or `role="group"` + `aria-label`.
- **Custom widgets follow the WAI-ARIA Authoring Practices pattern** for their type. Autocomplete/typeahead = combobox: input gets `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete="list"` + `aria-activedescendant`; the popup is `role="listbox"` with `role="option"` rows; Arrow keys move the highlight, Enter selects, Escape closes. See `SearchBar/index.tsx` for the reference implementation. Menus/dialogs = use the shared `Menu` (MUI, handles roles/focus) and `ModalButton` (accessible shell) — don't hand-roll. A trigger that opens a popup gets `aria-haspopup` + `aria-expanded` (`ButtonCustom` exposes `ariaHasPopup` / `ariaExpanded` / `ariaControls`).
- **Focus must always be visible.** Never `outline: none` / `outline: 0` in SCSS without providing a replacement indicator (`:focus-visible` box-shadow/border). Keyboard focus order must follow reading order — no positive `tabIndex`.
- **Color is never the only signal** (pair it with text/icon/shape), and text must meet 4.5:1 contrast (3:1 for large text / UI boundaries).
- **Respect `prefers-reduced-motion`** for non-essential animation.
- Quick self-check before finishing UI work: can you Tab to every control, see where focus is, operate it with Enter/Space/Arrows/Escape, and would a screen reader announce a sensible name + role? If not, it's not done.

## Specialized agents
- `react-expert` (in `.claude/agents/`) — invoke for non-trivial React/TS work that needs the full conventions above front-of-mind.
