import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
} from '../../test/renderWithProviders';
import type { ModalButtonHandle } from 'components/ModalButton';

let mockPrefData: { channel: string | null } | undefined = { channel: null };
let mockPrefLoading = false;
let mockSetPending = false;
let mockSetError = false;
let mockSmsEnabled = true;
const mockSetMutate = vi.fn();

vi.mock('api/hooks/useTripNotificationPref', () => ({
    useTripNotificationPref: () => ({
        data: mockPrefData,
        isLoading: mockPrefLoading,
    }),
    useSetTripNotificationPref: () => ({
        mutate: mockSetMutate,
        isPending: mockSetPending,
        isError: mockSetError,
    }),
}));

vi.mock('api/hooks/useFeatures', () => ({
    useSmsEnabled: () => mockSmsEnabled,
}));

import TripNotificationPrefModal from './index';

const open = (isPro = true) => {
    const ref = createRef<ModalButtonHandle>();
    renderWithProviders(
        <TripNotificationPrefModal ref={ref} tripId="trip-1" isPro={isPro} />
    );
    act(() => ref.current?.openModel());
    return ref;
};

beforeEach(() => {
    mockPrefData = { channel: null };
    mockPrefLoading = false;
    mockSetPending = false;
    mockSetError = false;
    mockSmsEnabled = true;
    mockSetMutate.mockReset();
});

describe('TripNotificationPrefModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(
            <TripNotificationPrefModal ref={ref} tripId="trip-1" isPro />
        );
        expect(
            screen.queryByRole('heading', {
                name: 'Notifications for this trip',
            })
        ).not.toBeInTheDocument();
    });

    it('opens with every channel option for a Pro user', () => {
        open(true);
        expect(
            screen.getByRole('heading', { name: 'Notifications for this trip' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Use account default/ })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Email only' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /SMS only/ })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Email & SMS/ })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /None/ })).toBeInTheDocument();
    });

    it('mutates with the chosen channel value', async () => {
        open(true);
        await userEvent.click(
            screen.getByRole('button', { name: 'Email only' })
        );
        expect(mockSetMutate).toHaveBeenCalledWith('email');

        await userEvent.click(
            screen.getByRole('button', { name: /Use account default/ })
        );
        expect(mockSetMutate).toHaveBeenCalledWith(null);
    });

    it('locks the SMS channels for a free user', () => {
        open(false);
        expect(screen.getByRole('button', { name: /SMS only/ })).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /Email & SMS/ })
        ).toBeDisabled();
    });

    it('hides SMS channels when the SMS feature is off', () => {
        mockSmsEnabled = false;
        open(true);
        expect(
            screen.queryByRole('button', { name: /SMS only/ })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Email & SMS/ })
        ).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /None/ })).toBeInTheDocument();
    });

    it('marks the current channel as selected', () => {
        mockPrefData = { channel: 'email' };
        open(true);
        expect(screen.getByRole('button', { name: 'Email only' })).toHaveClass(
            'is-selected'
        );
    });

    it('shows an error when saving fails', () => {
        mockSetError = true;
        open(true);
        expect(screen.getByRole('alert')).toHaveTextContent(
            "Couldn't save — try again."
        );
    });

    it('disables options while a save is pending', () => {
        mockSetPending = true;
        open(true);
        expect(screen.getByRole('button', { name: 'Email only' })).toBeDisabled();
    });
});
