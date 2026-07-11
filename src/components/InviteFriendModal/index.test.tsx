import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
} from '../../test/renderWithProviders';
import type { ModalButtonHandle } from 'components/ModalButton';

let mockUser: Record<string, unknown> | null = { id: 'u1', name: 'Me', friends: [] };
const mockUpdateUser = vi.fn();
const mockInvite = vi.fn();

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, updateUser: mockUpdateUser }),
}));

vi.mock('api/friendsApi', () => ({
    inviteFriendByEmail: (...args: unknown[]) => mockInvite(...args),
}));

import InviteFriendModal from './index';

const open = (onInvited?: (f: unknown) => void) => {
    const ref = createRef<ModalButtonHandle>();
    renderWithProviders(<InviteFriendModal ref={ref} onInvited={onInvited} />);
    act(() => ref.current?.openModel());
    return ref;
};

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Me', friends: [] };
    mockUpdateUser.mockReset();
    mockInvite.mockReset().mockResolvedValue({ message: 'Invite sent!' });
});

describe('InviteFriendModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(<InviteFriendModal ref={ref} />);
        expect(
            screen.queryByRole('heading', { name: 'Invite a friend' })
        ).not.toBeInTheDocument();
    });

    it('opens with a labelled email field and send button', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Invite a friend' })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Send invite' })
        ).toBeInTheDocument();
    });

    it('rejects an invalid email without calling the API', async () => {
        open();
        await userEvent.type(screen.getByLabelText('Email'), 'nope');
        await userEvent.click(
            screen.getByRole('button', { name: 'Send invite' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Enter a valid email address.'
        );
        expect(mockInvite).not.toHaveBeenCalled();
    });

    it('sends the invite, updates the user, and confirms', async () => {
        const onInvited = vi.fn();
        open(onInvited);
        await userEvent.type(screen.getByLabelText('Email'), 'Friend@Example.com');
        await userEvent.click(
            screen.getByRole('button', { name: 'Send invite' })
        );
        expect(mockInvite).toHaveBeenCalledWith('friend@example.com');
        expect(mockUpdateUser).toHaveBeenCalledWith(
            expect.objectContaining({
                friends: expect.arrayContaining([
                    expect.objectContaining({ email: 'friend@example.com' }),
                ]),
            })
        );
        expect(onInvited).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'friend@example.com' })
        );
        expect(await screen.findByText('Invite sent!')).toBeInTheDocument();
    });

    it('surfaces a server error message', async () => {
        mockInvite.mockRejectedValue(new Error('Already invited'));
        open();
        await userEvent.type(screen.getByLabelText('Email'), 'friend@example.com');
        await userEvent.click(
            screen.getByRole('button', { name: 'Send invite' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Already invited'
        );
    });
});
