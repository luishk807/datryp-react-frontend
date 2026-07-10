import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// AuthGate owns the split-screen sign-in UI (useUser / Google / hero images).
// It has its own tests — stub it to a passthrough that surfaces the title,
// subtitle, and the children (the post-login <Navigate>) so Login's own logic
// (returnTo sanitization + redirect) is observable in isolation.
vi.mock('components/AuthGate', () => ({
    default: ({
        title,
        subtitle,
        children,
    }: {
        title?: string;
        subtitle?: string;
        children: ReactNode;
    }) => (
        <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {children}
        </div>
    ),
}));

// Keep react-router-dom real (useSearchParams reads the MemoryRouter URL) but
// replace <Navigate> with an observable marker so we can assert its target.
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
        <div
            data-testid="navigate"
            data-to={to}
            data-replace={String(!!replace)}
        />
    ),
}));

import Login from './index';

describe('Login', () => {
    it('renders the sign-in splash with the localized continue title/subtitle', () => {
        renderWithProviders(<Login />, { route: '/login' });
        expect(
            screen.getByRole('heading', { name: 'Sign in to continue' })
        ).toBeInTheDocument();
        expect(
            screen.getByText("You'll be taken back to where you were.")
        ).toBeInTheDocument();
    });

    it('defaults the post-login redirect to / when no returnTo is present', () => {
        renderWithProviders(<Login />, { route: '/login' });
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    it('honors a same-origin relative returnTo path', () => {
        renderWithProviders(<Login />, {
            route: '/login?returnTo=%2Fplace%3Fq%3Dbali',
        });
        expect(screen.getByTestId('navigate')).toHaveAttribute(
            'data-to',
            '/place?q=bali'
        );
    });

    it('rejects an external returnTo and falls back to /', () => {
        renderWithProviders(<Login />, {
            route: '/login?returnTo=https%3A%2F%2Fevil.example.com',
        });
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    it('redirects with replace so login is not left in history', () => {
        renderWithProviders(<Login />, { route: '/login' });
        expect(screen.getByTestId('navigate')).toHaveAttribute(
            'data-replace',
            'true'
        );
    });
});
