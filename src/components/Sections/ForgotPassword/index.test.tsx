import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';

const { mockRequestReset } = vi.hoisted(() => ({
    mockRequestReset: vi.fn(),
}));

vi.mock('api/authApi', () => ({
    requestPasswordReset: (email: string) => mockRequestReset(email),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ForgotPassword from './index';

beforeEach(() => {
    mockRequestReset.mockReset();
    mockRequestReset.mockResolvedValue(undefined);
});

describe('ForgotPassword', () => {
    it('renders the reset-request form with a labelled email field', () => {
        renderWithProviders(<ForgotPassword />);
        expect(
            screen.getByRole('heading', { name: 'Reset your password' })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Send reset link' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to homepage' })
        ).toBeInTheDocument();
    });

    it('rejects an invalid email without calling the API', async () => {
        renderWithProviders(<ForgotPassword />);
        await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
        await userEvent.click(
            screen.getByRole('button', { name: 'Send reset link' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Enter a valid email address.'
        );
        expect(mockRequestReset).not.toHaveBeenCalled();
    });

    it('sends the reset link for a valid email and shows the confirmation', async () => {
        renderWithProviders(<ForgotPassword />);
        await userEvent.type(
            screen.getByLabelText('Email'),
            'ada@example.com'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Send reset link' })
        );
        await waitFor(() =>
            expect(mockRequestReset).toHaveBeenCalledWith('ada@example.com')
        );
        expect(
            await screen.findByRole('heading', { name: 'Check your inbox' })
        ).toBeInTheDocument();
        expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    });

    it('surfaces a server error and keeps the form', async () => {
        mockRequestReset.mockRejectedValue(new Error('Mail service down'));
        renderWithProviders(<ForgotPassword />);
        await userEvent.type(
            screen.getByLabelText('Email'),
            'ada@example.com'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Send reset link' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Mail service down'
        );
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('returns to the form from the confirmation via "try again"', async () => {
        renderWithProviders(<ForgotPassword />);
        await userEvent.type(
            screen.getByLabelText('Email'),
            'ada@example.com'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Send reset link' })
        );
        await screen.findByRole('heading', { name: 'Check your inbox' });
        await userEvent.click(
            screen.getByRole('button', { name: 'try again' })
        );
        expect(
            screen.getByRole('heading', { name: 'Reset your password' })
        ).toBeInTheDocument();
    });
});
