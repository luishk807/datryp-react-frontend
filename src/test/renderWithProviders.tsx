import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { MemoryRouter } from 'react-router-dom';
// Side-effect import: initialise i18next (EN+ES bundled) so `useTranslation()`
// resolves real strings inside tests, exactly like the app.
import 'i18n';

// Fresh QueryClient per render — retries OFF and no cache carryover so a
// component's queries fail fast and deterministically (no cross-test leakage).
const makeClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
        },
    });

export interface RenderWithProvidersOptions
    extends Omit<RenderOptions, 'wrapper'> {
    /** Initial router entry for components that read the URL / render <Link>. */
    route?: string;
}

/**
 * Render a component inside the app's provider stack (React Query +
 * MUI LocalizationProvider + Router + i18n). Use for any component test that
 * touches hooks, date pickers, routing, or translations. Returns the RTL
 * result plus the `client` so tests can inspect/seed the query cache.
 */
export const renderWithProviders = (
    ui: ReactElement,
    { route = '/', ...options }: RenderWithProvidersOptions = {}
) => {
    const client = makeClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <MemoryRouter initialEntries={[route]}>
                    {children}
                </MemoryRouter>
            </LocalizationProvider>
        </QueryClientProvider>
    );
    return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};

// Re-export RTL so tests can import screen/waitFor/etc. from one place.
export * from '@testing-library/react';
