import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';

const mockMutateAsync = vi.fn();
let mockIsPending = false;
vi.mock('api/hooks/useSaveTripNote', () => ({
    useSaveTripNote: () => ({
        mutateAsync: mockMutateAsync,
        isPending: mockIsPending,
    }),
}));

import TripNote from './index';

beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue(undefined);
    mockIsPending = false;
});

describe('TripNote', () => {
    it('renders nothing with no note and no edit rights', () => {
        const { container } = renderWithProviders(
            <TripNote tripId="t1" canEdit={false} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('offers an add affordance when empty and editable', () => {
        renderWithProviders(<TripNote tripId="t1" canEdit />);
        expect(
            screen.getByRole('button', { name: 'Add a trip recap' })
        ).toBeInTheDocument();
    });

    it('shows a saved note read-only with no edit control for non-editors', () => {
        renderWithProviders(
            <TripNote tripId="t1" note="Amazing trip" canEdit={false} />
        );
        expect(screen.getByText('Amazing trip')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Edit trip recap' })
        ).not.toBeInTheDocument();
    });

    it('lets an editor open the editor, type, and save the recap', async () => {
        renderWithProviders(<TripNote tripId="t1" canEdit />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add a trip recap' })
        );
        const textarea = screen.getByRole('textbox', { name: 'Trip recap' });
        await userEvent.type(textarea, 'Great trip');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save note' })
        );
        expect(mockMutateAsync).toHaveBeenCalledWith({
            tripId: 't1',
            note: 'Great trip',
        });
        // A successful save closes the editor. (In isolation the display
        // re-syncs from the still-empty `note` prop, so the add affordance
        // returns — the real page re-renders with the refetched note.)
        await waitFor(() =>
            expect(
                screen.queryByRole('textbox', { name: 'Trip recap' })
            ).not.toBeInTheDocument()
        );
        expect(
            screen.getByRole('button', { name: 'Add a trip recap' })
        ).toBeInTheDocument();
    });

    it('surfaces a save error and stays in the editor', async () => {
        mockMutateAsync.mockRejectedValueOnce(new Error('network down'));
        renderWithProviders(
            <TripNote tripId="t1" note="Old note" canEdit />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit trip recap' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save note' })
        );
        await waitFor(() =>
            expect(screen.getByText('network down')).toBeInTheDocument()
        );
        // Still editing — the textarea is present.
        expect(
            screen.getByRole('textbox', { name: 'Trip recap' })
        ).toBeInTheDocument();
    });
});
