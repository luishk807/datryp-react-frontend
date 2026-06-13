/**
 * i18next type tweaks. We deliberately do NOT pin `resources` to `en.json`
 * here: several call sites build the key dynamically (e.g. footer links map
 * `t(link.labelKey)`), which strict per-key typing would reject. Setting only
 * `returnNull: false` keeps `t()` returning a plain `string` (not `string |
 * null`) so results drop straight into JSX without a guard.
 */
import 'i18next';

declare module 'i18next' {
    interface CustomTypeOptions {
        returnNull: false;
    }
}
