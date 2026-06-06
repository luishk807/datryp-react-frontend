import { lazy, type ComponentType } from 'react';

/**
 * `React.lazy` that recovers from stale-deploy chunk failures.
 *
 * When a new build is deployed, its chunks get fresh content-hashed names
 * (`index-DtnGStvq.js`). A tab that loaded the app BEFORE the deploy still
 * holds the old chunk map, so the first lazy route it navigates to 404s with
 * "Failed to fetch dynamically imported module". React Router then surfaces
 * that to the error boundary, and every subsequent navigation hits the same
 * dead chunk map — the user is stuck on the error page until a manual reload
 * pulls the fresh `index.html`.
 *
 * The fix: on a chunk-load failure, reload the page to pull the new
 * `index.html` + chunk map. A timestamp guard suppresses a second reload
 * within a short window, so a chunk that's genuinely gone (for some reason
 * other than a deploy) shows the error page once instead of looping.
 */
const RELOAD_TS = 'datryp:chunk-reload-ts';
/** Don't auto-reload twice inside this window — breaks reload loops. */
const RELOAD_WINDOW_MS = 10_000;

/** Browsers phrase the dynamic-import failure differently; match them all. */
const isChunkLoadError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const msg = err.message ?? '';
    return (
        /failed to fetch dynamically imported module/i.test(msg) ||
        /error loading dynamically imported module/i.test(msg) ||
        /importing a module script failed/i.test(msg) ||
        /'text\/html' is not a valid javascript mime type/i.test(msg) ||
        /unable to preload css/i.test(msg)
    );
};

/** Reload once per `RELOAD_WINDOW_MS`. Returns true if a reload was kicked
 *  off (caller should then keep the Suspense fallback up). */
const reloadOnce = (): boolean => {
    const last = Number(window.sessionStorage.getItem(RELOAD_TS) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_TS, String(Date.now()));
    window.location.reload();
    return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lazyWithRetry = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
) =>
    lazy(async () => {
        try {
            return await factory();
        } catch (err) {
            if (isChunkLoadError(err) && reloadOnce()) {
                // Keep the Suspense fallback up while the reload happens —
                // resolving (or rejecting) here would flash the error page.
                return new Promise<{ default: T }>(() => {});
            }
            throw err;
        }
    });

/**
 * Global safety net for dynamic imports that DON'T go through `lazyWithRetry`
 * (direct `import()` calls — PDF/Excel export, the flight-parser, etc.). Vite
 * dispatches `vite:preloadError` on `window` when a module preload 404s after
 * a deploy; reload (sharing the same guard) so those paths self-heal too.
 * Call this once at app boot.
 */
export const installChunkReloadHandler = (): void => {
    window.addEventListener('vite:preloadError', () => {
        reloadOnce();
    });
};

/**
 * Auto-reload onto a new deploy. The PWA is `registerType: 'autoUpdate'`, so a
 * new build's service worker installs + claims the open tab (skipWaiting +
 * clientsClaim) — but the page keeps running the OLD in-memory bundle until it
 * reloads, which is why a deploy required a manual "Clear site data". Reload
 * once when a freshly-activated SW takes control so users land on the new
 * version automatically.
 *
 * Guards:
 *  - only when there was ALREADY a controller (skip the first-ever install,
 *    which has nothing to reload to), and
 *  - once per page (the `refreshing` latch + the shared reload-timestamp).
 * Call this once at app boot.
 */
export const installSWUpdateReload = (): void => {
    const swc = navigator.serviceWorker;
    if (!swc) return;
    // No controller yet = first visit / SW installing for the first time.
    // Nothing stale to escape, so don't reload when it first claims us.
    if (!swc.controller) return;
    let refreshing = false;
    swc.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
};
