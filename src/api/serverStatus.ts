/**
 * Tiny observable store tracking whether the DaTryp backend is reachable.
 *
 * Why this exists: when the Python backend is down, every request fails with
 * a network-level error (the fetch rejects before any HTTP response). Without
 * a single place to notice that, each query surfaces its own little error and
 * — worse — a component that throws on the missing data can blank the whole
 * app. This store gives us one signal the `ServerGate` can render a friendly
 * "Site Currently Unavailable" page from, and that auto-clears the moment any
 * request succeeds again.
 *
 * Detection contract:
 *  - A NETWORK error (fetch rejects, no HTTP response) → backend unreachable.
 *  - ANY HTTP response, even a 500, means the server IS up → reachable. A
 *    single broken endpoint must not black out the whole site.
 *
 * Designed for React's `useSyncExternalStore` (see `ServerGate`).
 */

export type ServerStatus = 'reachable' | 'unreachable';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

// Start optimistic: assume the backend is up until something proves otherwise.
// The first real request (or the ServerGate boot health-check) corrects this
// within a few hundred ms if the server is actually down.
let status: ServerStatus = 'reachable';

// Require a few consecutive failures before blacking out the whole app. A
// single transient blip — one slow endpoint, a brief task restart during a
// rolling deploy — must not flash the full-page "Site Currently Unavailable"
// wall. Any success resets the count, so the gate only trips when the backend
// is genuinely unreachable across multiple requests.
const FAILURE_THRESHOLD = 2;
let consecutiveFailures = 0;

const listeners = new Set<() => void>();

const emit = (): void => {
    for (const listener of listeners) listener();
};

const setStatus = (next: ServerStatus): void => {
    if (status === next) return;
    status = next;
    emit();
};

export const markServerReachable = (): void => {
    consecutiveFailures = 0;
    setStatus('reachable');
};

export const markServerUnreachable = (): void => {
    consecutiveFailures += 1;
    if (consecutiveFailures >= FAILURE_THRESHOLD) setStatus('unreachable');
};

export const getServerStatus = (): ServerStatus => status;

export const subscribeServerStatus = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/**
 * True for "the request never reached a responding server" errors — a fetch
 * rejection (TypeError: Failed to fetch), an abort, or a graphql-request error
 * that carries no `.response`. HTTP error responses (4xx/5xx) are NOT network
 * errors: the server answered, so it's reachable.
 */
export const isNetworkError = (err: unknown): boolean => {
    if (err instanceof Error && err.name === 'TypeError') return true;
    if (
        typeof err === 'object' &&
        err !== null &&
        // graphql-request's ClientError attaches `.response` when the server
        // answered. No `.response` on an Error => it failed before a reply.
        'response' in err &&
        (err as { response?: unknown }).response
    ) {
        return false;
    }
    if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        return (
            msg.includes('failed to fetch') ||
            msg.includes('networkerror') ||
            msg.includes('fetch failed') ||
            msg.includes('load failed')
        );
    }
    return false;
};

/**
 * One-shot reachability probe against the cheap `/health` route. Updates the
 * store and resolves to the result. Used by `ServerGate` on boot, on the
 * user's "Try again" click, and by the auto-poll while the gate is shown.
 * Times out after 12s — long enough that a cold backend boot (container
 * restart, serverless DB waking) isn't mistaken for a hard outage, but short
 * enough that a hung socket doesn't leave the probe pending forever.
 */
export const checkServerHealth = async (): Promise<boolean> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const resp = await fetch(`${API_BASE}/health`, {
            signal: controller.signal,
        });
        // Any HTTP answer means the server is up, even a non-200.
        markServerReachable();
        return resp.ok;
    } catch {
        markServerUnreachable();
        return false;
    } finally {
        clearTimeout(timer);
    }
};
