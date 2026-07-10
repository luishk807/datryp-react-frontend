import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import { getAuthToken, setAuthToken } from 'api/authStorage';

const { mockResetPassword, mockNavigate } = vi.hoisted(() => ({
    mockResetPassword: vi.fn(),
    mockNavigate: vi.fn(),
}));

vi.mock('api/authApi', () => ({
    resetPassword: (token: string, password: string) =>
        mockResetPassword(token, password),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => (
        <div data-testid="navigate" data-to={to} />
    ),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ResetPassword from './index';

beforeEach(() => {
    mockResetPassword.mockReset();
    mockNavigate.mockReset();
    setAuthToken(null);
});

describe('ResetPassword', () => {
    it('bounces to /forgot-password when the URL carries no token', () => {
        renderWithProviders(<ResetPassword />, { route: '/reset-password' });
        expect(screen.getByTestId('navigate')).toHaveAttribute(
            'data-to',
            '/forgot-password'
        );
        expect(
            screen.queryByLabelText('New password')
        ).not.toBeInTheDocument();
    });

    it('renders the two password fields when a token is present', () => {
        renderWithProviders(<ResetPassword />, {
            route: '/reset-password?token=abc',
        });
        expect(
            screen.getByRole('heading', { name: 'Choose a new password' })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('New password')).toBeInTheDocument();
        expect(
            screen.getByLabelText('Confirm new password')
        ).toBeInTheDocument();
    });

    it('rejects a too-short password without calling the API', async () => {
        renderWithProviders(<ResetPassword />, {
            route: '/reset-password?token=abc',
        });
        await userEvent.type(screen.getByLabelText('New password'), 'short');
        await userEvent.type(
            screen.getByLabelText('Confirm new password'),
            'short'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Update password' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Password must be at least 8 characters.'
        );
        expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('rejects mismatched passwords', async () => {
        renderWithProviders(<ResetPassword />, {
            route: '/reset-password?token=abc',
        });
        await userEvent.type(
            screen.getByLabelText('New password'),
            'supersecret'
        );
        await userEvent.type(
            screen.getByLabelText('Confirm new password'),
            'different1'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Update password' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            "Passwords don't match."
        );
        expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('resets the password, stores the token, and redirects to /account', async () => {
        mockResetPassword.mockResolvedValue({ access_token: 'tok-123' });
        renderWithProviders(<ResetPassword />, {
            route: '/reset-password?token=abc',
        });
        await userEvent.type(
            screen.getByLabelText('New password'),
            'supersecret'
        );
        await userEvent.type(
            screen.getByLabelText('Confirm new password'),
            'supersecret'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Update password' })
        );

        expect(
            await screen.findByRole('heading', { name: 'Password updated' })
        ).toBeInTheDocument();
        expect(mockResetPassword).toHaveBeenCalledWith('abc', 'supersecret');
        expect(getAuthToken()).toBe('tok-123');
        await waitFor(
            () =>
                expect(mockNavigate).toHaveBeenCalledWith('/account', {
                    replace: true,
                }),
            { timeout: 2500 }
        );
    });

    it('surfaces an error and keeps the form when the reset fails', async () => {
        mockResetPassword.mockRejectedValue(new Error('Link expired'));
        renderWithProviders(<ResetPassword />, {
            route: '/reset-password?token=abc',
        });
        await userEvent.type(
            screen.getByLabelText('New password'),
            'supersecret'
        );
        await userEvent.type(
            screen.getByLabelText('Confirm new password'),
            'supersecret'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Update password' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Link expired'
        );
        expect(screen.getByLabelText('New password')).toBeInTheDocument();
    });
});
