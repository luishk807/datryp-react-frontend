import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../../test/renderWithProviders';

let mockStatus: { data: unknown; isLoading: boolean } = {
    data: { active: false, mode: 'banner', message: null, until: null },
    isLoading: false,
};
const mockMutateAsync = vi.fn();
let mockIsPending = false;
vi.mock('api/hooks/useMaintenance', () => ({
    useMaintenanceSetting: () => mockStatus,
    useUpdateMaintenance: () => ({
        mutateAsync: mockMutateAsync,
        isPending: mockIsPending,
    }),
}));

import MaintenanceCard from './index';

beforeEach(() => {
    mockStatus = {
        data: { active: false, mode: 'banner', message: null, until: null },
        isLoading: false,
    };
    mockIsPending = false;
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({
        active: true,
        mode: 'banner',
        message: null,
        until: '2026-12-31T23:59:59Z',
    });
});

const toggle = () =>
    screen.getByRole('checkbox', { name: 'Toggle maintenance mode' });

describe('MaintenanceCard', () => {
    it('shows a loading pill before status resolves', () => {
        mockStatus = { data: undefined, isLoading: true };
        renderWithProviders(<MaintenanceCard />);
        expect(screen.getByText('…')).toBeInTheDocument();
    });

    it('reflects an active window with its mode in the pill', () => {
        mockStatus = {
            data: {
                active: true,
                mode: 'banner',
                message: null,
                until: '2026-12-31T23:59:59Z',
            },
            isLoading: false,
        };
        renderWithProviders(<MaintenanceCard />);
        expect(screen.getByText('ON · banner')).toBeInTheDocument();
    });

    it('hydrates the editor from the live setting', () => {
        mockStatus = {
            data: {
                active: false,
                mode: 'full',
                message: 'brb',
                until: null,
            },
            isLoading: false,
        };
        renderWithProviders(<MaintenanceCard />);
        expect(
            screen.getByRole('button', { name: /Full-page block/ })
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText('Message (optional)')).toHaveValue('brb');
    });

    it('turning ON (banner) confirms then fires the mutation', async () => {
        renderWithProviders(<MaintenanceCard />);
        await userEvent.click(toggle());
        expect(
            screen.getByRole('heading', { name: 'Turn on Maintenance mode?' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /Turn ON for 1 hour/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({
            enabled: true,
            mode: 'banner',
            message: null,
            durationHours: 1,
        });
        await waitFor(() =>
            expect(screen.getByText(/Maintenance ON/)).toBeInTheDocument()
        );
    });

    it('sends the selected full-page mode and typed message', async () => {
        renderWithProviders(<MaintenanceCard />);
        await userEvent.click(
            screen.getByRole('button', { name: /Full-page block/ })
        );
        await userEvent.type(
            screen.getByLabelText('Message (optional)'),
            'Down for repairs'
        );
        await userEvent.click(toggle());
        await userEvent.click(
            screen.getByRole('button', { name: /Turn ON for 1 hour/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({
            enabled: true,
            mode: 'full',
            message: 'Down for repairs',
            durationHours: 1,
        });
    });

    it('turning OFF fires the disable mutation', async () => {
        mockStatus = {
            data: {
                active: true,
                mode: 'banner',
                message: null,
                until: '2026-12-31T23:59:59Z',
            },
            isLoading: false,
        };
        mockMutateAsync.mockResolvedValue({
            active: false,
            mode: 'banner',
            message: null,
            until: null,
        });
        renderWithProviders(<MaintenanceCard />);
        await userEvent.click(toggle());
        await userEvent.click(
            screen.getByRole('button', { name: /Turn OFF/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({ enabled: false });
        await waitFor(() =>
            expect(screen.getByText('Maintenance OFF.')).toBeInTheDocument()
        );
    });
});
