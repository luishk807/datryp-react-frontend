import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import { OFFLINE_STATUS } from 'constants';
import TripOfflineButton from './index';

const baseProps = {
    savedAt: null,
    isOffline: false,
    onDownload: vi.fn(),
    onRemove: vi.fn(),
};

describe('TripOfflineButton', () => {
    it('shows a live "Saving offline…" status while syncing', () => {
        renderWithProviders(
            <TripOfflineButton {...baseProps} status={OFFLINE_STATUS.SYNCING} />
        );
        const chip = screen.getByRole('status');
        expect(chip).toHaveTextContent('Saving offline…');
    });

    it('renders a named download button and fires onDownload', async () => {
        const onDownload = vi.fn();
        renderWithProviders(
            <TripOfflineButton
                {...baseProps}
                status={OFFLINE_STATUS.NOT_DOWNLOADED}
                onDownload={onDownload}
            />
        );
        const btn = screen.getByRole('button', {
            name: 'Download itinerary for offline use',
        });
        // Desktop (matchMedia=false) keeps the visible "Offline" label.
        expect(btn).toHaveTextContent('Offline');
        await userEvent.click(btn);
        expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('disables the download button while the browser is offline', () => {
        renderWithProviders(
            <TripOfflineButton
                {...baseProps}
                status={OFFLINE_STATUS.NOT_DOWNLOADED}
                isOffline
            />
        );
        expect(
            screen.getByRole('button', {
                name: 'Download itinerary for offline use',
            })
        ).toBeDisabled();
    });

    it('surfaces a save error alert in the ERROR state', () => {
        renderWithProviders(
            <TripOfflineButton {...baseProps} status={OFFLINE_STATUS.ERROR} />
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            "Couldn't save — try again"
        );
    });

    it('requires two taps to remove a saved snapshot', async () => {
        const onRemove = vi.fn();
        renderWithProviders(
            <TripOfflineButton
                {...baseProps}
                status={OFFLINE_STATUS.SAVED}
                savedAt={Date.now()}
                onRemove={onRemove}
            />
        );
        const chip = screen.getByRole('button', {
            name: 'Saved offline. Tap to remove the offline copy.',
        });
        expect(chip).toHaveTextContent('Saved');

        // First tap arms the confirmation — does not remove yet.
        await userEvent.click(chip);
        expect(onRemove).not.toHaveBeenCalled();
        const armed = screen.getByRole('button', {
            name: 'Tap again to remove the offline copy',
        });
        expect(armed).toHaveTextContent('Tap again to remove');

        // Second tap removes.
        await userEvent.click(armed);
        expect(onRemove).toHaveBeenCalledTimes(1);
    });
});
