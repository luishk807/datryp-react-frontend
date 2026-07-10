import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders';

interface MaintenanceData {
    active: boolean;
    mode: string;
    message: string | null;
    until: string | null;
}

let mockData: MaintenanceData | undefined;
vi.mock('api/hooks/useMaintenance', () => ({
    useMaintenanceStatus: () => ({ data: mockData }),
    maintenanceKeys: { status: ['maintenance', 'status'] as const },
}));

let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ isAdmin: mockIsAdmin }),
}));

import MaintenanceGate from './index';

const child = <div>app content</div>;

beforeEach(() => {
    mockData = undefined;
    mockIsAdmin = false;
});

describe('MaintenanceGate', () => {
    it('passes children through when there is no status', () => {
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(screen.getByText('app content')).toBeInTheDocument();
    });

    it('passes children through when maintenance is inactive', () => {
        mockData = { active: false, mode: 'full', message: null, until: null };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(screen.getByText('app content')).toBeInTheDocument();
    });

    it('renders the full-screen wall for a non-exempt visitor in full mode', () => {
        mockData = { active: true, mode: 'full', message: null, until: null };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(
            screen.getByRole('heading', { name: /right back/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/making some improvements/i)
        ).toBeInTheDocument();
        expect(screen.queryByText('app content')).not.toBeInTheDocument();
    });

    it('shows a custom message and ETA on the full wall', () => {
        mockData = {
            active: true,
            mode: 'full',
            message: 'Upgrading the database now',
            until: '2026-08-01T12:00:00Z',
        };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(
            screen.getByText('Upgrading the database now')
        ).toBeInTheDocument();
        expect(screen.getByText(/Expected back by/i)).toBeInTheDocument();
    });

    it('re-probes status when "Check again" is tapped', async () => {
        mockData = { active: true, mode: 'full', message: null, until: null };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        const retry = screen.getByRole('button', { name: /check again/i });
        await userEvent.click(retry);
        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: /right back/i })
            ).toBeInTheDocument()
        );
    });

    it('exempts an admin from the full wall but shows a persistent banner + children', () => {
        mockData = { active: true, mode: 'full', message: null, until: null };
        mockIsAdmin = true;
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(screen.getByText('Maintenance live')).toBeInTheDocument();
        expect(screen.getByText('app content')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: /right back/i })
        ).not.toBeInTheDocument();
    });

    it('exempts an allowlisted route (and its subpaths) from the full wall', () => {
        mockData = { active: true, mode: 'full', message: null, until: null };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>, {
            route: '/dashboard/analytics',
        });
        expect(screen.getByText('Maintenance live')).toBeInTheDocument();
        expect(screen.getByText('app content')).toBeInTheDocument();
    });

    it('shows a dismissible banner (not the wall) in banner mode', () => {
        mockData = { active: true, mode: 'banner', message: null, until: null };
        renderWithProviders(<MaintenanceGate>{child}</MaintenanceGate>);
        expect(screen.getByText('app content')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /dismiss maintenance notice/i })
        ).toBeInTheDocument();
        expect(screen.queryByText('Maintenance live')).not.toBeInTheDocument();
    });
});
