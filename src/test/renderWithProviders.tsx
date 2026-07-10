import type { ReactElement, ReactNode } from 'react';
import {
    render,
    renderHook,
    type RenderHookOptions,
    type RenderOptions,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { MemoryRouter } from 'react-router-dom';
// Side-effect import: initialise i18next (EN+ES bundled) so `useTranslation()`
// resolves real strings inside tests, exactly like the app.
import 'i18n';

/**
 * Fresh QueryClient per render — retries OFF and always-stale so queries
 * refetch on mount and resolve deterministically. Each test gets its own
 * client and Vitest isolates per file, so there's no cross-test cache leak to
 * guard against; `gcTime: Infinity` therefore just keeps inactive entries from
 * being garbage-collected mid-test, which otherwise races a `getQueryData`
 * read taken right after a mutation's `setQueryData` (an intermittent flake).
 * `retryDelay: 0` keeps the few hooks that opt back INTO a retry (e.g.
 * `useAirports` sets `retry: 1`) from stalling error-path tests on React
 * Query's default exponential backoff.
 */
export const makeTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                retryDelay: 0,
                gcTime: Infinity,
                staleTime: 0,
            },
            mutations: { retry: false, retryDelay: 0 },
        },
    });

const Providers = ({
    client,
    route,
    children,
}: {
    client: QueryClient;
    route: string;
    children: ReactNode;
}) => (
    <QueryClientProvider client={client}>
        <LocalizationProvider dateAdapter={AdapterMoment}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </LocalizationProvider>
    </QueryClientProvider>
);

export interface RenderWithProvidersOptions
    extends Omit<RenderOptions, 'wrapper'> {
    /** Initial router entry for components that read the URL / render <Link>. */
    route?: string;
    /** Reuse an existing client (e.g. to seed/inspect the cache across renders). */
    client?: QueryClient;
}

/**
 * Render a component inside the app's provider stack (React Query +
 * MUI LocalizationProvider + Router + i18n). Use for any component test that
 * touches hooks, date pickers, routing, or translations. Returns the RTL
 * result plus the `client` so tests can inspect/seed the query cache.
 */
export const renderWithProviders = (
    ui: ReactElement,
    {
        route = '/',
        client = makeTestQueryClient(),
        ...options
    }: RenderWithProvidersOptions = {}
) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Providers client={client} route={route}>
            {children}
        </Providers>
    );
    return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};

export interface RenderHookWithProvidersOptions<Props>
    extends Omit<RenderHookOptions<Props>, 'wrapper'> {
    /** Initial router entry (rarely needed for hook tests). */
    route?: string;
    /** Reuse an existing client so a test can inspect the query cache the hook
     *  writes to (mutation `onSuccess` invalidations, `setQueryData`, etc.). */
    client?: QueryClient;
}

/**
 * Render a hook inside the same provider stack as {@link renderWithProviders}.
 * Use for `api/hooks/*` tests: drive the real client fn through MSW and assert
 * on the returned query/mutation state. Returns the RTL `renderHook` result
 * plus the `client` so tests can inspect the cache.
 */
export const renderHookWithProviders = <Result, Props>(
    hook: (initialProps: Props) => Result,
    {
        route = '/',
        client = makeTestQueryClient(),
        ...options
    }: RenderHookWithProvidersOptions<Props> = {}
) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Providers client={client} route={route}>
            {children}
        </Providers>
    );
    const result = renderHook(hook, { wrapper: Wrapper, ...options });
    return { client, ...result };
};

// Re-export RTL so tests can import screen/waitFor/etc. from one place.
export * from '@testing-library/react';
