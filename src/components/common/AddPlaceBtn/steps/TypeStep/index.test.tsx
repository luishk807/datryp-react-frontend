import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import TypeStep from './index';

const PLACEHOLDER = /Type anything/;

describe('TypeStep', () => {
    it('renders the headline and all five type tiles', () => {
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={() => {}}
                onSmartSubmit={() => {}}
            />
        );
        expect(
            screen.getByText('What would you like to add?')
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
        ['Place', 'Note', 'Flight', 'Hotel', 'Transport'].forEach((label) =>
            expect(screen.getByText(label)).toBeInTheDocument()
        );
    });

    it('fires onPick with the tile value (mapping Transport → train)', async () => {
        const onPick = vi.fn();
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={onPick}
                onSmartSubmit={() => {}}
            />
        );
        await userEvent.click(screen.getByText('Place'));
        expect(onPick).toHaveBeenCalledWith(ACTIVITY_KIND.PLACE);
        await userEvent.click(screen.getByText('Transport'));
        expect(onPick).toHaveBeenCalledWith(ACTIVITY_KIND.TRAIN);
    });

    it('marks the tile matching the current kind as selected', () => {
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.FLIGHT}
                onPick={() => {}}
                onSmartSubmit={() => {}}
            />
        );
        expect(screen.getByText('Flight').closest('button')).toHaveClass(
            'is-selected'
        );
        expect(screen.getByText('Place').closest('button')).not.toHaveClass(
            'is-selected'
        );
    });

    it('disables the smart-box submit until text is detected', () => {
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={() => {}}
                onSmartSubmit={() => {}}
            />
        );
        expect(
            screen.getByRole('button', { name: 'Detect and continue' })
        ).toBeDisabled();
    });

    it.each([
        ['UA123 tomorrow', 'Flight'],
        ['mount fuji', 'Place'],
        ['Hilton Times Square', 'Hotel'],
        ['Renfe 3152 Madrid to Barcelona', 'Train'],
        ['FlixBus to Berlin', 'Bus'],
        ['uber to JFK', 'Ride'],
        ['Hertz car rental LAX', 'Rental car'],
    ])('classifies "%s" as %s in the smart box', async (text, label) => {
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={() => {}}
                onSmartSubmit={() => {}}
            />
        );
        await userEvent.type(
            screen.getByPlaceholderText(PLACEHOLDER),
            text
        );
        await waitFor(() =>
            expect(
                screen.getByText(label, { selector: 'strong' })
            ).toBeInTheDocument()
        );
    });

    it('submits the smart box with the detected kind on Continue', async () => {
        const onSmartSubmit = vi.fn();
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={() => {}}
                onSmartSubmit={onSmartSubmit}
            />
        );
        await userEvent.type(
            screen.getByPlaceholderText(PLACEHOLDER),
            'UA123 tomorrow'
        );
        const go = screen.getByRole('button', {
            name: 'Detect and continue',
        });
        await waitFor(() => expect(go).toBeEnabled());
        await userEvent.click(go);
        expect(onSmartSubmit).toHaveBeenCalledWith(
            'UA123 tomorrow',
            ACTIVITY_KIND.FLIGHT
        );
    });

    it('lets the user override the detected kind before submitting', async () => {
        const onSmartSubmit = vi.fn();
        renderWithProviders(
            <TypeStep
                currentKind={ACTIVITY_KIND.PLACE}
                onPick={() => {}}
                onSmartSubmit={onSmartSubmit}
            />
        );
        await userEvent.type(
            screen.getByPlaceholderText(PLACEHOLDER),
            'UA123 tomorrow'
        );
        const change = await screen.findByRole('button', { name: 'change' });
        await userEvent.click(change);
        // The override list drops Note; each remaining kind is a real button.
        await userEvent.click(
            screen.getByRole('button', { name: 'Hotel' })
        );
        expect(onSmartSubmit).toHaveBeenCalledWith(
            'UA123 tomorrow',
            ACTIVITY_KIND.HOTEL_CHECKIN
        );
    });
});
