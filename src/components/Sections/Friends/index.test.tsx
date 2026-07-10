import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';

// ── Controlled hook + context state — flipped per test. ──────────────────
let mockUser: unknown = { id: 'u1', name: 'Me' };
let mockFriends: unknown[] = [];
let mockFriendsLoading = false;
let mockRequests: unknown[] = [];
let mockRequestsLoading = false;
const mockRespond = vi.fn();
const mockCancel = vi.fn();
const mockResend = vi.fn();
const mockUnfriend = vi.fn();
let mockRespondPending = false;
let mockUnfriendPending = false;
let mockResendPending = false;
const mockOpenInvite = vi.fn();

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

vi.mock('api/hooks/useFriends', () => ({
    useFriends: () => ({ data: mockFriends, isLoading: mockFriendsLoading }),
    useMyFriendRequests: () => ({
        data: mockRequests,
        isLoading: mockRequestsLoading,
    }),
    useRespondToFriendRequest: () => ({
        mutate: mockRespond,
        isPending: mockRespondPending,
    }),
    useCancelFriendRequest: () => ({ mutate: mockCancel, isPending: false }),
    useResendFriendRequest: () => ({
        mutate: mockResend,
        isPending: mockResendPending,
    }),
    useUnfriend: () => ({ mutate: mockUnfriend, isPending: mockUnfriendPending }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('components/InviteFriendModal', () => ({
    default: forwardRef((_props, ref) => {
        useImperativeHandle(ref, () => ({
            openModel: mockOpenInvite,
            closeModal: vi.fn(),
        }));
        return <div data-testid="invite-modal" />;
    }),
}));

import Friends from './index';

const friend = (over: Record<string, unknown> = {}) => ({
    id: 'f1',
    email: 'ana@example.com',
    name: 'Ana',
    ...over,
});

const request = (over: Record<string, unknown> = {}) => ({
    id: 'r1',
    direction: 'incoming',
    status: 'pending',
    createdAt: new Date().toISOString(),
    otherUser: { id: 'o1', email: 'bob@example.com', name: 'Bob' },
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Me' };
    mockFriends = [];
    mockFriendsLoading = false;
    mockRequests = [];
    mockRequestsLoading = false;
    mockRespondPending = false;
    mockUnfriendPending = false;
    mockResendPending = false;
    mockRespond.mockReset();
    mockCancel.mockReset();
    mockResend.mockReset();
    mockUnfriend.mockReset();
    mockOpenInvite.mockReset();
});

describe('Friends', () => {
    it('shows the logged-out prompt when there is no user', () => {
        mockUser = null;
        renderWithProviders(<Friends />);
        expect(
            screen.getByText('Log in to manage your friends.')
        ).toBeInTheDocument();
    });

    it('shows a loading state for the friends list', () => {
        mockFriendsLoading = true;
        renderWithProviders(<Friends />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('shows the empty friends state', () => {
        renderWithProviders(<Friends />);
        expect(
            screen.getByText('No friends yet. Invite one to get started.')
        ).toBeInTheDocument();
    });

    it('renders accepted friends with a heading, name, email and badge', () => {
        mockFriends = [friend(), friend({ id: 'f2', name: 'Cara', email: 'c@x.io' })];
        renderWithProviders(<Friends />);
        expect(
            screen.getByRole('heading', { name: /your friends/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(screen.getByText('ana@example.com')).toBeInTheDocument();
        expect(screen.getByText('2 friends')).toBeInTheDocument();
        expect(screen.getAllByText('Friend').length).toBe(2);
    });

    it('opens the invite modal when the invite button is clicked', async () => {
        renderWithProviders(<Friends />);
        await userEvent.click(
            screen.getByRole('button', { name: /invite friend/i })
        );
        expect(mockOpenInvite).toHaveBeenCalledTimes(1);
    });

    it('confirms an unfriend through the dialog and fires the mutation', async () => {
        mockFriends = [friend()];
        // The mock closes the confirm dialog by invoking onSettled.
        mockUnfriend.mockImplementation((_id, opts) => opts?.onSettled?.());
        renderWithProviders(<Friends />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Remove Ana' })
        );
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByText('Remove Ana?')
        ).toBeInTheDocument();

        await userEvent.click(
            within(dialog).getByRole('button', { name: /remove friend/i })
        );
        expect(mockUnfriend).toHaveBeenCalledWith('f1', expect.any(Object));
    });

    it('cancels the unfriend dialog without removing', async () => {
        mockFriends = [friend()];
        renderWithProviders(<Friends />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove Ana' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: /keep as friend/i })
        );
        expect(mockUnfriend).not.toHaveBeenCalled();
    });

    it('accepts and rejects an incoming request', async () => {
        mockRequests = [request()];
        renderWithProviders(<Friends />);
        expect(
            screen.getByRole('heading', { name: /friend requests/i })
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
        expect(mockRespond).toHaveBeenCalledWith({
            requestId: 'r1',
            accept: true,
        });

        await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
        expect(mockRespond).toHaveBeenCalledWith({
            requestId: 'r1',
            accept: false,
        });
    });

    it('resends an outgoing request and surfaces the success toast', async () => {
        mockRequests = [
            request({ id: 'r2', direction: 'outgoing' }),
        ];
        mockResend.mockImplementation((_id, opts) => opts?.onSuccess?.());
        renderWithProviders(<Friends />);
        expect(
            screen.getByRole('heading', { name: /sent requests/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Resend' }));
        expect(mockResend).toHaveBeenCalledWith('r2', expect.any(Object));
        expect(screen.getByRole('status')).toHaveTextContent(/re-sent to bob/i);
    });

    it('surfaces the resend error message', async () => {
        mockRequests = [request({ id: 'r2', direction: 'outgoing' })];
        mockResend.mockImplementation((_id, opts) =>
            opts?.onError?.(new Error('Try again in a minute'))
        );
        renderWithProviders(<Friends />);
        await userEvent.click(screen.getByRole('button', { name: 'Resend' }));
        expect(screen.getByRole('status')).toHaveTextContent(
            /try again in a minute/i
        );
    });

    it('cancels an outgoing request', async () => {
        mockRequests = [request({ id: 'r2', direction: 'outgoing' })];
        renderWithProviders(<Friends />);
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockCancel).toHaveBeenCalledWith('r2');
    });

    it('paginates the friends list and turns the page', async () => {
        vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        mockFriends = Array.from({ length: 25 }, (_, i) =>
            friend({ id: `f${i}`, name: `Friend ${i}`, email: `f${i}@x.io` })
        );
        renderWithProviders(<Friends />);
        expect(
            screen.getByRole('navigation', { name: /friends pagination/i })
        ).toBeInTheDocument();
        // First page shows the shared LIST_PAGE_SIZE (20) rows.
        expect(screen.getByText('Friend 0')).toBeInTheDocument();
        expect(screen.queryByText('Friend 20')).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: /go to page 2/i })
        );
        expect(screen.getByText('Friend 20')).toBeInTheDocument();
        expect(window.scrollTo).toHaveBeenCalled();
    });

    it('formats relative "sent" times and falls back to email when unnamed', () => {
        const daysAgo = (n: number) =>
            new Date(Date.now() - (n * 24 + 1) * 60 * 60 * 1000).toISOString();
        mockRequests = [
            request({
                id: 'r-y',
                createdAt: daysAgo(1),
                otherUser: { id: 'o', email: 'noname@x.io', name: null },
            }),
            request({ id: 'r-3', createdAt: daysAgo(3) }),
            request({ id: 'r-10', createdAt: daysAgo(10) }),
        ];
        renderWithProviders(<Friends />);
        // Unnamed request falls back to the email as its display name (which
        // also appears in the meta row — hence two matches).
        expect(screen.getAllByText('noname@x.io').length).toBeGreaterThanOrEqual(
            2
        );
        expect(screen.getByText(/sent yesterday/i)).toBeInTheDocument();
        expect(screen.getByText(/sent 3 days ago/i)).toBeInTheDocument();
    });

    it('shows "Invitation sent" for an unnamed outgoing request', () => {
        mockRequests = [
            request({
                id: 'r2',
                direction: 'outgoing',
                otherUser: { id: 'o', email: 'pending@x.io', name: null },
            }),
        ];
        renderWithProviders(<Friends />);
        expect(screen.getByText('Invitation sent')).toBeInTheDocument();
    });

    it('shows the resending label while the resend is pending', () => {
        mockResendPending = true;
        mockRequests = [request({ id: 'r2', direction: 'outgoing' })];
        renderWithProviders(<Friends />);
        expect(
            screen.getByRole('button', { name: /resending/i })
        ).toBeInTheDocument();
    });

    it('shows the removing label while an unfriend is pending', async () => {
        mockFriends = [friend()];
        const { rerender } = renderWithProviders(<Friends />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove Ana' })
        );
        // The mutation flips to pending after the confirm dialog is open.
        mockUnfriendPending = true;
        rerender(<Friends />);
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByRole('button', { name: /removing/i })
        ).toBeDisabled();
    });

    it('shows a loading state while requests are still loading', () => {
        mockRequestsLoading = true;
        mockRequests = [];
        renderWithProviders(<Friends />);
        expect(screen.getByText('Loading requests…')).toBeInTheDocument();
    });
});
