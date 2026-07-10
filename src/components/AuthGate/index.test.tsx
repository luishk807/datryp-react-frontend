import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

let mockUser: unknown = null;
let mockIsLoading = false;
const mockLogin = vi.fn().mockResolvedValue(undefined);
const mockSignup = vi.fn().mockResolvedValue(undefined);
vi.mock('context/UserContext', () => ({
    useUser: () => ({
        user: mockUser,
        isLoading: mockIsLoading,
        login: mockLogin,
        signup: mockSignup,
    }),
}));

const mockGoogleMutate = vi.fn();
vi.mock('api/hooks/useAuth', () => ({
    useGoogleSignin: () => ({ mutate: mockGoogleMutate }),
}));

vi.mock('api/hooks/useHeroImages', () => ({
    useHeroImages: () => ({ data: undefined }),
}));

vi.mock('lib/posthog', () => ({ capture: vi.fn() }));

// Google's official button lazy-loads a remote script — stub it to a plain
// button that fires the credential callback so the Google path is drivable.
vi.mock('components/GoogleSignInButton', () => ({
    default: ({ onCredential }: { onCredential: (c: string) => void }) => (
        <button type="button" onClick={() => onCredential('tok')}>
            google-signin
        </button>
    ),
}));

vi.mock('components/Footer', () => ({
    default: () => <footer data-testid="footer" />,
}));

vi.mock('components/common/PageLoader', () => ({
    default: () => <div data-testid="page-loader" />,
}));

import AuthGate from './index';

const child = <div>gated content</div>;
const renderGate = (children: ReactNode = child) =>
    renderWithProviders(<AuthGate>{children}</AuthGate>);

beforeEach(() => {
    mockUser = null;
    mockIsLoading = false;
});

describe('AuthGate', () => {
    it('shows the page loader while auth is resolving', () => {
        mockIsLoading = true;
        renderGate();
        expect(screen.getByTestId('page-loader')).toBeInTheDocument();
        expect(screen.queryByText('gated content')).not.toBeInTheDocument();
    });

    it('renders children straight through when authenticated', () => {
        mockUser = { id: 'u1' };
        renderGate();
        expect(screen.getByText('gated content')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Welcome back' })
        ).not.toBeInTheDocument();
    });

    it('renders the login form for an unauthenticated visitor', () => {
        renderGate();
        expect(
            screen.getByRole('heading', { name: 'Welcome back' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'google-signin' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).toBeInTheDocument();
    });

    it('toggles from login to signup', async () => {
        renderGate();
        await userEvent.click(
            screen.getByRole('button', { name: 'Create an account' })
        );
        expect(
            screen.getByRole('heading', { name: 'Create your account' })
        ).toBeInTheDocument();
    });

    it('shows a validation error when submitting with empty credentials', async () => {
        renderGate();
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Email and password are required.'
        );
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('forwards a Google credential to the sign-in mutation', async () => {
        renderGate();
        await userEvent.click(
            screen.getByRole('button', { name: 'google-signin' })
        );
        expect(mockGoogleMutate).toHaveBeenCalledWith(
            'tok',
            expect.any(Object)
        );
    });
});
