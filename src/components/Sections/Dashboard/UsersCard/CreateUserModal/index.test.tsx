import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';

let mockIsPending = false;
const mockMutate = vi.fn();
vi.mock('api/hooks/useAdmin', () => ({
    useCreateAdminUser: () => ({ mutate: mockMutate, isPending: mockIsPending }),
}));

import CreateUserModal from './index';

beforeEach(() => {
    mockIsPending = false;
    mockMutate.mockReset();
});

const noop = () => {};

describe('CreateUserModal', () => {
    it('does not render its content when closed', () => {
        renderWithProviders(
            <CreateUserModal open={false} onClose={noop} />
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders the labeled fields when open', () => {
        renderWithProviders(<CreateUserModal open onClose={noop} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password (min 8 chars)')).toBeInTheDocument();
        expect(screen.getByLabelText('Birth year (optional)')).toBeInTheDocument();
    });

    it('requires an email and password', async () => {
        renderWithProviders(<CreateUserModal open onClose={noop} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Email and password are required.'
        );
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('rejects a password shorter than 8 characters', async () => {
        renderWithProviders(<CreateUserModal open onClose={noop} />);
        await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
        await userEvent.type(
            screen.getByLabelText('Password (min 8 chars)'),
            'short'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Password must be at least 8 characters.'
        );
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range birth year', async () => {
        renderWithProviders(<CreateUserModal open onClose={noop} />);
        await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
        await userEvent.type(
            screen.getByLabelText('Password (min 8 chars)'),
            'password123'
        );
        await userEvent.type(
            screen.getByLabelText('Birth year (optional)'),
            '1800'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Birth year must be a valid 4-digit year.'
        );
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it('creates the user, notifies the parent, and closes on success', async () => {
        mockMutate.mockImplementation((payload, opts) =>
            opts.onSuccess({ email: payload.email })
        );
        const onClose = vi.fn();
        const onCreated = vi.fn();
        renderWithProviders(
            <CreateUserModal open onClose={onClose} onCreated={onCreated} />
        );
        await userEvent.type(
            screen.getByLabelText('Email'),
            'new@example.com'
        );
        await userEvent.type(
            screen.getByLabelText('Password (min 8 chars)'),
            'password123'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'new@example.com',
                password: 'password123',
                role: 'user',
            }),
            expect.any(Object)
        );
        expect(onCreated).toHaveBeenCalledWith('new@example.com');
        expect(onClose).toHaveBeenCalled();
    });

    it('surfaces a server error without closing', async () => {
        mockMutate.mockImplementation((_payload, opts) =>
            opts.onError(new Error('email taken'))
        );
        const onClose = vi.fn();
        renderWithProviders(<CreateUserModal open onClose={onClose} />);
        await userEvent.type(screen.getByLabelText('Email'), 'dup@example.com');
        await userEvent.type(
            screen.getByLabelText('Password (min 8 chars)'),
            'password123'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent('email taken');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when Cancel is clicked', async () => {
        const onClose = vi.fn();
        renderWithProviders(<CreateUserModal open onClose={onClose} />);
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalled();
    });
});
