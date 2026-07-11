import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../test/renderWithProviders';
import { NOTIFICATION_KIND } from 'constants';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

let mockCount = 0;
let mockRows: unknown[] = [];
const mockMarkRead = vi.fn();
const mockMarkAll = vi.fn();
vi.mock('api/hooks/useNotifications', () => ({
    useUnreadNotificationCount: () => ({ data: mockCount }),
    useNotifications: () => ({ data: mockRows }),
    useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
    useMarkAllNotificationsRead: () => ({
        mutate: mockMarkAll,
        isPending: false,
    }),
}));

import NotificationBell from './index';

const row = (over: Record<string, unknown> = {}) => ({
    id: 'n1',
    kind: NOTIFICATION_KIND.TRIP_CREATED,
    tripId: 't1',
    actorUserId: 'a1',
    payload: { trip_name: 'Tokyo', actor_name: 'Ana' },
    readAt: null,
    createdAt: '2026-07-01T00:00:00Z',
    ...over,
});

beforeEach(() => {
    mockCount = 0;
    mockRows = [];
    mockNavigate.mockReset();
    mockMarkRead.mockReset();
    mockMarkAll.mockReset();
});

describe('NotificationBell', () => {
    it('labels the bell "Notifications" with no unread', () => {
        renderWithProviders(<NotificationBell />);
        expect(
            screen.getByRole('button', { name: 'Notifications' })
        ).toBeInTheDocument();
    });

    it('announces the unread count in the bell accessible name', () => {
        mockCount = 3;
        renderWithProviders(<NotificationBell />);
        expect(
            screen.getByRole('button', { name: '3 unread notifications' })
        ).toBeInTheDocument();
    });

    it('opens a menu with the empty state when there are none', async () => {
        renderWithProviders(<NotificationBell />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Notifications' })
        );
        const menu = screen.getByRole('menu');
        expect(
            within(menu).getByText("You're all caught up.")
        ).toBeInTheDocument();
    });

    it('marks a trip row read and navigates to its detail page on click', async () => {
        mockRows = [row()];
        renderWithProviders(<NotificationBell />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Notifications' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: /Ana added you to/i })
        );
        expect(mockMarkRead).toHaveBeenCalledWith('n1');
        expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=t1');
    });

    it('routes a deleted-trip row to the inbox instead of the detail page', async () => {
        mockRows = [
            row({ id: 'n2', kind: NOTIFICATION_KIND.TRIP_DELETED }),
        ];
        renderWithProviders(<NotificationBell />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Notifications' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: /deleted/i })
        );
        expect(mockMarkRead).toHaveBeenCalledWith('n2');
        expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    });

    it('offers "Mark all read" when unread and fires the mutation', async () => {
        mockCount = 2;
        mockRows = [row(), row({ id: 'n3' })];
        renderWithProviders(<NotificationBell />);
        await userEvent.click(
            screen.getByRole('button', { name: '2 unread notifications' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark all read' })
        );
        expect(mockMarkAll).toHaveBeenCalledTimes(1);
    });

    it('navigates to the inbox from "See all"', async () => {
        renderWithProviders(<NotificationBell />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Notifications' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'See all' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    });
});
