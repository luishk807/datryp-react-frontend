import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../../test/renderWithProviders';

let mockUsers: {
    data: unknown;
    isLoading: boolean;
    error: unknown;
    isFetching: boolean;
} = { data: undefined, isLoading: false, error: undefined, isFetching: false };
const mockRefetch = vi.fn();
const mockUsersCalls: string[] = [];

const mockSetRole = vi.fn();
const mockSetPro = vi.fn();
const mockSetFree = vi.fn();
const mockSoftDelete = vi.fn();

vi.mock('api/hooks/useAdmin', () => ({
    useAdminUsers: (q: string) => {
        mockUsersCalls.push(q);
        return { ...mockUsers, refetch: mockRefetch };
    },
    useAdminGrowth: () => ({ data: { months: [{ month: '2026-01', count: 5 }] } }),
    useAdminSubscriptionStats: () => ({
        data: { byPlan: [{ key: 'free', count: 90 }, { key: 'pro', count: 10 }] },
    }),
    useAdminAgeDistribution: () => ({
        data: { buckets: [{ key: '25-34', label: '25–34', count: 30 }], total: 30 },
    }),
    useAdminUsersByGender: () => ({
        data: { total: 10, buckets: [{ genderName: 'Female', count: 6 }] },
    }),
    useSetUserRole: () => ({ mutate: mockSetRole }),
    useSetUserPro: () => ({ mutate: mockSetPro }),
    useSetUserFree: () => ({ mutate: mockSetFree }),
    useSoftDeleteUser: () => ({ mutate: mockSoftDelete }),
}));

let mockActor: { id: string } | null = { id: 'admin1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockActor }),
}));

vi.mock('../LineChart', () => ({ default: () => <div data-testid="line-chart" /> }));
vi.mock('../PieChart', () => ({ default: () => <div data-testid="pie-chart" /> }));
vi.mock('./CreateUserModal', () => ({
    default: ({
        open,
        onCreated,
    }: {
        open: boolean;
        onCreated?: (email: string) => void;
    }) =>
        open ? (
            <div data-testid="create-modal">
                <button type="button" onClick={() => onCreated?.('z@example.com')}>
                    fire-created
                </button>
            </div>
        ) : null,
}));

import UsersCard from './index';

const userRow = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'al@example.com',
    name: 'Al',
    role: 'user',
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
    tripCount: 3,
    currentPeriodEnd: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
});

beforeEach(() => {
    mockUsers = {
        data: { items: [userRow()], total: 1 },
        isLoading: false,
        error: undefined,
        isFetching: false,
    };
    mockActor = { id: 'admin1' };
    mockUsersCalls.length = 0;
});

describe('UsersCard', () => {
    it('renders the user table with plan, status, trips, and charts', () => {
        renderWithProviders(<UsersCard />);
        expect(screen.getByText('al@example.com')).toBeInTheDocument();
        expect(screen.getByText('free')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThanOrEqual(3);
    });

    it('shows loading, error, and empty states', () => {
        mockUsers = {
            data: undefined,
            isLoading: true,
            error: undefined,
            isFetching: false,
        };
        const { rerender } = renderWithProviders(<UsersCard />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();

        mockUsers = {
            data: undefined,
            isLoading: false,
            error: new Error('load fail'),
            isFetching: false,
        };
        rerender(<UsersCard />);
        expect(screen.getByText('load fail')).toBeInTheDocument();

        mockUsers = {
            data: { items: [], total: 0 },
            isLoading: false,
            error: undefined,
            isFetching: false,
        };
        rerender(<UsersCard />);
        expect(screen.getByText('No matches.')).toBeInTheDocument();
    });

    it('forwards the search query to the hook', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.type(
            screen.getByLabelText('Search by email or name'),
            'al'
        );
        expect(mockUsersCalls[mockUsersCalls.length - 1]).toBe('al');
    });

    it('refetches when the refresh button is clicked', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        expect(mockRefetch).toHaveBeenCalled();
    });

    it('sets a user to Pro through the row menu + confirm', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Actions for al@example.com' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Set Pro (30d)' })
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('Set al@example.com to Pro for 30 days?');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Continue' })
        );
        expect(mockSetPro).toHaveBeenCalledWith('u1', expect.any(Object));
    });

    it('promotes a non-admin user to admin', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Actions for al@example.com' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Promote to admin' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue' })
        );
        expect(mockSetRole).toHaveBeenCalledWith(
            { id: 'u1', role: 'admin' },
            expect.any(Object)
        );
    });

    it('soft-deletes a user via the danger action', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Actions for al@example.com' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Soft-delete' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue' })
        );
        expect(mockSoftDelete).toHaveBeenCalledWith('u1', expect.any(Object));
    });

    it('cancels a confirm without mutating', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Actions for al@example.com' })
        );
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Set Pro (30d)' })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockSetPro).not.toHaveBeenCalled();
    });

    it('guards self-demote and self-delete for the signed-in admin', async () => {
        mockActor = { id: 'u1' };
        mockUsers = {
            data: { items: [userRow({ role: 'admin' })], total: 1 },
            isLoading: false,
            error: undefined,
            isFetching: false,
        };
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Actions for al@example.com' })
        );
        expect(
            screen.getByRole('menuitem', { name: 'Demote to user' })
        ).toHaveAttribute('aria-disabled', 'true');
        expect(
            screen.getByRole('menuitem', { name: 'Soft-delete' })
        ).toHaveAttribute('aria-disabled', 'true');
    });

    it('opens the create-user modal and toasts on creation', async () => {
        renderWithProviders(<UsersCard />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Create user' })
        );
        expect(screen.getByTestId('create-modal')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'fire-created' })
        );
        expect(screen.getByText('Created z@example.com')).toBeInTheDocument();
    });
});
