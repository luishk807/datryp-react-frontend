import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { NOTIFICATION_KIND } from 'constants';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Controlled hook state — flipped per test.
let mockRows: unknown[] = [];
let mockIsLoading = false;
const mockMarkRead = vi.fn();
const mockMarkAll = vi.fn();
vi.mock('api/hooks/useNotifications', () => ({
    useNotifications: () => ({ data: mockRows, isLoading: mockIsLoading }),
    useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
    useMarkAllNotificationsRead: () => ({
        mutate: mockMarkAll,
        isPending: false,
    }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import Notifications from './index';

const row = (over: Record<string, unknown> = {}) => ({
    id: 'n1',
    kind: NOTIFICATION_KIND.TRIP_CREATED,
    payload: { trip_name: 'Tokyo', actor_name: 'Ana' },
    readAt: null,
    tripId: 't1',
    createdAt: '2026-07-01T00:00:00Z',
    ...over,
});

beforeEach(() => {
    mockRows = [];
    mockIsLoading = false;
});

describe('Notifications', () => {
    it('shows the empty state when there are none', () => {
        renderWithProviders(<Notifications />);
        expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    });

    it('shows a loading state', () => {
        mockIsLoading = true;
        renderWithProviders(<Notifications />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders a row and, on click, marks it read + navigates to the trip', async () => {
        mockRows = [row()];
        renderWithProviders(<Notifications />);
        await userEvent.click(
            screen.getByRole('button', { name: /Ana added you to/i })
        );
        expect(mockMarkRead).toHaveBeenCalledWith('n1');
        expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=t1');
    });

    it('does not navigate for a deleted-trip row but still marks it read', async () => {
        mockRows = [
            row({ kind: NOTIFICATION_KIND.TRIP_DELETED, id: 'n2' }),
        ];
        renderWithProviders(<Notifications />);
        await userEvent.click(
            screen.getByRole('button', { name: /deleted/i })
        );
        expect(mockMarkRead).toHaveBeenCalledWith('n2');
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('offers "Mark all read" when there are unread rows and fires the mutation', async () => {
        mockRows = [row(), row({ id: 'n3', readAt: null })];
        renderWithProviders(<Notifications />);
        await userEvent.click(
            screen.getByRole('button', { name: /mark all read/i })
        );
        expect(mockMarkAll).toHaveBeenCalled();
    });
});
