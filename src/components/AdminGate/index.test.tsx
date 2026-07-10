import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

let mockUser: unknown = null;
let mockIsAdmin = false;
let mockIsLoading = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({
        user: mockUser,
        isAdmin: mockIsAdmin,
        isLoading: mockIsLoading,
    }),
}));

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

import AdminGate from './index';

const child = <div>secret dashboard</div>;

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
    mockIsLoading = false;
});

describe('AdminGate', () => {
    it('shows a loading state while the user is resolving', () => {
        mockIsLoading = true;
        renderWithProviders(<AdminGate>{child}</AdminGate>);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('redirects an unauthenticated visitor to /single (replace)', () => {
        renderWithProviders(<AdminGate>{child}</AdminGate>);
        const nav = screen.getByTestId('navigate');
        expect(nav).toHaveAttribute('data-to', '/single');
        expect(nav).toHaveAttribute('data-replace', 'true');
        expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument();
    });

    it('redirects an authenticated non-admin to /', () => {
        mockUser = { id: 'u1' };
        mockIsAdmin = false;
        renderWithProviders(<AdminGate>{child}</AdminGate>);
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    it('renders children for an authenticated admin', () => {
        mockUser = { id: 'u1' };
        mockIsAdmin = true;
        renderWithProviders(<AdminGate>{child}</AdminGate>);
        expect(screen.getByText('secret dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
});
