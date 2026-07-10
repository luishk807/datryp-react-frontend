import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';

const mockCheckServerHealth = vi.fn();
let mockStatus = 'reachable';
let mockIsOffline = false;

vi.mock('api/serverStatus', () => ({
    checkServerHealth: (...args: unknown[]) => mockCheckServerHealth(...args),
    getServerStatus: () => mockStatus,
    subscribeServerStatus: () => () => {},
}));

vi.mock('hooks/useIsOffline', () => ({
    useIsOffline: () => mockIsOffline,
}));

import ServerGate from './index';

const child = <div>route body</div>;

beforeEach(() => {
    mockStatus = 'reachable';
    mockIsOffline = false;
    mockCheckServerHealth.mockResolvedValue(true);
});

describe('ServerGate', () => {
    it('renders children and runs a boot health probe while reachable', () => {
        renderWithProviders(<ServerGate>{child}</ServerGate>);
        expect(screen.getByText('route body')).toBeInTheDocument();
        expect(mockCheckServerHealth).toHaveBeenCalled();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows the downtime wall when the backend is unreachable', () => {
        mockStatus = 'unreachable';
        renderWithProviders(<ServerGate>{child}</ServerGate>);
        expect(
            screen.getByRole('heading', { name: /right back/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/getting a quick update/i)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /try again/i })
        ).toBeInTheDocument();
        expect(screen.queryByText('route body')).not.toBeInTheDocument();
    });

    it('defers to OfflineGate (renders children) when the browser is offline', () => {
        mockStatus = 'unreachable';
        mockIsOffline = true;
        renderWithProviders(<ServerGate>{child}</ServerGate>);
        expect(screen.getByText('route body')).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: /right back/i })
        ).not.toBeInTheDocument();
    });

    it('re-probes health when "Try again" is clicked', async () => {
        mockStatus = 'unreachable';
        renderWithProviders(<ServerGate>{child}</ServerGate>);
        const before = mockCheckServerHealth.mock.calls.length;
        await userEvent.click(
            screen.getByRole('button', { name: /try again/i })
        );
        await waitFor(() =>
            expect(mockCheckServerHealth.mock.calls.length).toBeGreaterThan(
                before
            )
        );
    });
});
