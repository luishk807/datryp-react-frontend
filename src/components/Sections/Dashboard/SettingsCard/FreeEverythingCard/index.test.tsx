import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../../test/renderWithProviders';

let mockStatus: { data: unknown; isLoading: boolean } = {
    data: { active: false, until: null },
    isLoading: false,
};
const mockMutateAsync = vi.fn();
let mockIsPending = false;
vi.mock('api/hooks/useAdmin', () => ({
    useFreeEverything: () => mockStatus,
    useUpdateFreeEverything: () => ({
        mutateAsync: mockMutateAsync,
        isPending: mockIsPending,
    }),
}));

import FreeEverythingCard from './index';

beforeEach(() => {
    mockStatus = { data: { active: false, until: null }, isLoading: false };
    mockIsPending = false;
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({
        active: true,
        until: '2026-12-31T23:59:59Z',
    });
});

const toggle = () =>
    screen.getByRole('checkbox', { name: 'Toggle free-everything mode' });

describe('FreeEverythingCard', () => {
    it('shows a loading pill before status resolves', () => {
        mockStatus = { data: undefined, isLoading: true };
        renderWithProviders(<FreeEverythingCard />);
        expect(screen.getByText('…')).toBeInTheDocument();
    });

    it('reflects the OFF state with an unchecked switch', () => {
        renderWithProviders(<FreeEverythingCard />);
        expect(screen.getByText('OFF')).toBeInTheDocument();
        expect(toggle()).not.toBeChecked();
    });

    it('reflects the ACTIVE state with the expiry meta', () => {
        mockStatus = {
            data: { active: true, until: '2026-12-31T23:59:59Z' },
            isLoading: false,
        };
        const { container } = renderWithProviders(<FreeEverythingCard />);
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(
            container.querySelector('.settings-card-state-meta')?.textContent
        ).toMatch(/until/);
        expect(toggle()).toBeChecked();
    });

    it('turning ON opens a confirm dialog and fires the mutation with the duration', async () => {
        renderWithProviders(<FreeEverythingCard />);
        await userEvent.click(toggle());
        expect(
            screen.getByRole('heading', { name: 'Turn on Free Everything?' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /Turn ON for 24 hours/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({
            enabled: true,
            durationHours: 24,
        });
        await waitFor(() =>
            expect(screen.getByText(/Free-everything ON until/)).toBeInTheDocument()
        );
    });

    it('applies the chosen duration to the confirm action', async () => {
        renderWithProviders(<FreeEverythingCard />);
        await userEvent.click(screen.getByRole('button', { name: '7 days' }));
        await userEvent.click(toggle());
        expect(
            screen.getByRole('button', { name: /Turn ON for 7 days/i })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /Turn ON for 7 days/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({
            enabled: true,
            durationHours: 24 * 7,
        });
    });

    it('turning OFF confirms and fires the disable mutation', async () => {
        mockStatus = {
            data: { active: true, until: '2026-12-31T23:59:59Z' },
            isLoading: false,
        };
        mockMutateAsync.mockResolvedValue({ active: false, until: null });
        renderWithProviders(<FreeEverythingCard />);
        await userEvent.click(toggle());
        expect(
            screen.getByRole('heading', { name: 'Turn off Free Everything?' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /Turn OFF/i })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({ enabled: false });
        await waitFor(() =>
            expect(screen.getByText('Free-everything OFF.')).toBeInTheDocument()
        );
    });

    it('cancels a pending toggle without mutating', async () => {
        renderWithProviders(<FreeEverythingCard />);
        await userEvent.click(toggle());
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockMutateAsync).not.toHaveBeenCalled();
        expect(
            screen.queryByRole('heading', { name: 'Turn on Free Everything?' })
        ).not.toBeInTheDocument();
    });
});
