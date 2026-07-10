import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders';

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

let mockUser: { name?: string; email?: string } | null = null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: false }),
}));

const mockMutateAsync = vi.fn();
const mockReset = vi.fn();
let mockIsPending = false;
let mockError: Error | null = null;
vi.mock('api/hooks/useContact', () => ({
    useSendContactForm: () => ({
        mutateAsync: mockMutateAsync,
        reset: mockReset,
        isPending: mockIsPending,
        error: mockError,
    }),
}));

import Contact from './index';

beforeEach(() => {
    mockUser = null;
    mockIsPending = false;
    mockError = null;
    mockMutateAsync.mockReset();
    mockReset.mockReset();
});

describe('Contact', () => {
    it('renders the hero, labelled form fields and submit button', () => {
        renderWithProviders(<Contact />);
        expect(
            screen.getByRole('heading', { name: /here to help/i })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Your name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Subject')).toBeInTheDocument();
        expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Send message/i })
        ).toBeInTheDocument();
    });

    it('renders the direct-email link and support reasons', () => {
        renderWithProviders(<Contact />);
        expect(
            screen.getAllByRole('link', { name: 'info@datryp.com' }).length
        ).toBeGreaterThan(0);
        expect(
            screen.getByRole('heading', { name: /Help with your account/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Feature ideas/i })
        ).toBeInTheDocument();
    });

    it('renders the common-questions accordion', () => {
        renderWithProviders(<Contact />);
        expect(
            screen.getByRole('heading', { name: 'Common questions' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('How long until I get a reply?')
        ).toBeInTheDocument();
    });

    it('blocks submit and shows a validation error when fields are empty', async () => {
        renderWithProviders(<Contact />);
        await userEvent.click(
            screen.getByRole('button', { name: /Send message/i })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Please enter your name.'
        );
        expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('rejects an invalid email address', async () => {
        renderWithProviders(<Contact />);
        await userEvent.type(screen.getByLabelText('Your name'), 'Jane');
        await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
        await userEvent.type(screen.getByLabelText('Subject'), 'Hi');
        await userEvent.type(screen.getByLabelText(/Message/),'Hello there');
        await userEvent.click(
            screen.getByRole('button', { name: /Send message/i })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            "That email doesn't look right."
        );
        expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('submits a valid form and shows the success state', async () => {
        mockMutateAsync.mockResolvedValue({ ok: true });
        renderWithProviders(<Contact />);
        await userEvent.type(screen.getByLabelText('Your name'), '  Jane  ');
        await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
        await userEvent.type(screen.getByLabelText('Subject'), 'A question');
        await userEvent.type(screen.getByLabelText(/Message/),'How does this work?');
        await userEvent.click(
            screen.getByRole('button', { name: /Send message/i })
        );
        await waitFor(() =>
            expect(mockMutateAsync).toHaveBeenCalledWith({
                name: 'Jane',
                email: 'jane@example.com',
                subject: 'A question',
                message: 'How does this work?',
            })
        );
        expect(
            await screen.findByRole('heading', {
                name: /Message sent — thank you!/i,
            })
        ).toBeInTheDocument();
    });

    it('prefills name and email from the signed-in user', () => {
        mockUser = { name: 'Ana Traveler', email: 'ana@example.com' };
        renderWithProviders(<Contact />);
        expect(screen.getByLabelText('Your name')).toHaveValue('Ana Traveler');
        expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com');
    });

    it('surfaces a server error from the mutation', () => {
        mockError = new Error('Email service unavailable');
        renderWithProviders(<Contact />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Email service unavailable'
        );
    });
});
