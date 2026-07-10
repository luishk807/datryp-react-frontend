// Global test setup — loaded once before every test file (see vitest.config.ts).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import moment from 'moment';
import { server } from './msw/server';

// Several date helpers are deliberately fed invalid input in tests (to prove
// the `isValidDate` guards). Moment logs a noisy fallback-parse warning for
// each — suppress it so real failures aren't buried in expected noise.
moment.suppressDeprecationWarnings = true;

// ---- MSW lifecycle (contract / hook tests) ----
// `onUnhandledRequest: 'error'` makes any request a test didn't explicitly
// mock fail loudly — pure unit tests make no requests, so this only bites
// tests that hit the network without a handler (which is what we want).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

// Order matters: unmount React trees FIRST (RTL doesn't auto-cleanup outside
// its own runner integration), THEN reset handlers. A still-mounted query that
// dispatches a request into a handler-less server would trip
// `onUnhandledRequest:'error'` as an async unhandled rejection — which Vitest
// blames on whatever file happens to be running, an intermittent cross-file
// flake. Tearing down the trees before the reset closes that window.
afterEach(() => {
    cleanup();
    server.resetHandlers();
});

// ---- jsdom polyfills for browser APIs the app (and MUI) touch ----
// jsdom ships none of these; without the stubs, MUI's `useMediaQuery`,
// IntersectionObserver-based lazy UI, and scroll calls throw on render.

if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated but MUI still probes it
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    });
}

class MockObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
}

if (!window.IntersectionObserver) {
    window.IntersectionObserver =
        MockObserver as unknown as typeof IntersectionObserver;
}
if (!window.ResizeObserver) {
    window.ResizeObserver = MockObserver as unknown as typeof ResizeObserver;
}
// jsdom DOES define window.scrollTo, but as a stub that throws
// "Not implemented" — so `if (!window.scrollTo)` never fires and any real
// scrollTo call (e.g. list pagination) throws, surfacing as an uncaught error
// that can fail an unrelated file. Always override with a no-op.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
