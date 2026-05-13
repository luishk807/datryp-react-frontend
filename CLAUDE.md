# daTryp — React/TypeScript Frontend

Vite + React 19 + TypeScript + MUI 5 + Tailwind 3 + TanStack Query + axios.

## Project layout
- Per-component folder: `src/components/<Name>/index.tsx` + `index.scss`.
- Shared form primitives: `src/components/common/FormFields/` — `ButtonCustom`, `ButtonIcon`, `CheckBoxCustom`, `DialogBox`, `DropDown`, `InputField`, `Autocomplete`.
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

### 6. Code quality
- Keep components focused; if a render branch grows beyond ~30 lines, extract a child component.
- Don't introduce a wrapper component, hook, or util that's used in only one place — inline it.
- Don't add comments that restate what the code does. Comment only the non-obvious *why*.

## Specialized agents
- `react-expert` (in `.claude/agents/`) — invoke for non-trivial React/TS work that needs the full conventions above front-of-mind.
