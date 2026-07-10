import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../../test/renderWithProviders';

let mockStatus: { data: unknown; isLoading: boolean } = {
    data: { enabled: false, configured: true, effective: false },
    isLoading: false,
};
const mockMutateAsync = vi.fn();
let mockIsPending = false;
vi.mock('api/hooks/useFeatures', () => ({
    useSmsSetting: () => mockStatus,
    useUpdateSmsSetting: () => ({
        mutateAsync: mockMutateAsync,
        isPending: mockIsPending,
    }),
}));

import SmsCard from './index';

beforeEach(() => {
    mockStatus = {
        data: { enabled: false, configured: true, effective: false },
        isLoading: false,
    };
    mockIsPending = false;
    mockMutateAsync.mockReset();
});

const toggle = () =>
    screen.getByRole('checkbox', { name: 'Toggle SMS notifications feature' });

describe('SmsCard', () => {
    it('shows a loading pill before status resolves', () => {
        mockStatus = { data: undefined, isLoading: true };
        renderWithProviders(<SmsCard />);
        expect(screen.getByText('…')).toBeInTheDocument();
    });

    it('shows LIVE when SMS is effective', () => {
        mockStatus = {
            data: { enabled: true, configured: true, effective: true },
            isLoading: false,
        };
        renderWithProviders(<SmsCard />);
        expect(screen.getByText('LIVE')).toBeInTheDocument();
        expect(toggle()).toBeChecked();
    });

    it('explains why SMS is dark when Twilio is not configured', () => {
        mockStatus = {
            data: { enabled: false, configured: false, effective: false },
            isLoading: false,
        };
        renderWithProviders(<SmsCard />);
        expect(screen.getByText('OFF')).toBeInTheDocument();
        expect(screen.getByText('Twilio not configured')).toBeInTheDocument();
    });

    it('flags "switch ON, waiting on server creds"', () => {
        mockStatus = {
            data: { enabled: true, configured: false, effective: false },
            isLoading: false,
        };
        renderWithProviders(<SmsCard />);
        expect(
            screen.getByText('switch ON, waiting on server creds')
        ).toBeInTheDocument();
    });

    it('turns SMS on and toasts LIVE when it becomes effective', async () => {
        mockMutateAsync.mockResolvedValue({
            enabled: true,
            configured: true,
            effective: true,
        });
        renderWithProviders(<SmsCard />);
        await userEvent.click(toggle());
        expect(mockMutateAsync).toHaveBeenCalledWith(true);
        await waitFor(() =>
            expect(
                screen.getByText('SMS notifications ON.')
            ).toBeInTheDocument()
        );
    });

    it('warns when switched ON but Twilio is still unconfigured', async () => {
        mockMutateAsync.mockResolvedValue({
            enabled: true,
            configured: false,
            effective: false,
        });
        renderWithProviders(<SmsCard />);
        await userEvent.click(toggle());
        await waitFor(() =>
            expect(
                screen.getByText(/Twilio is not configured/)
            ).toBeInTheDocument()
        );
    });

    it('turns SMS off and toasts that texts are paused', async () => {
        mockStatus = {
            data: { enabled: true, configured: true, effective: true },
            isLoading: false,
        };
        mockMutateAsync.mockResolvedValue({
            enabled: false,
            configured: true,
            effective: false,
        });
        renderWithProviders(<SmsCard />);
        await userEvent.click(toggle());
        expect(mockMutateAsync).toHaveBeenCalledWith(false);
        await waitFor(() =>
            expect(
                screen.getByText('SMS notifications OFF — texts are paused.')
            ).toBeInTheDocument()
        );
    });
});
