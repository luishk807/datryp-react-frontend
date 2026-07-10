import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import { ACTION } from 'constants';
import type { Destination } from 'types';
import AddDestinationBtn from './index';

// The trigger's nearest-airport seed reads the signed-in user; stub it to a
// signed-out state so the query stays disabled (no network on modal open).
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: null, isAdmin: false }),
}));

const editData = {
    id: 5,
    country: { id: 1, name: 'Japan' },
    itinerary: [],
} as unknown as Destination;

describe('AddDestinationBtn', () => {
    it('renders the add trigger', () => {
        renderWithProviders(<AddDestinationBtn onChange={() => {}} />);
        expect(
            screen.getByRole('button', { name: 'Add Destination' })
        ).toBeInTheDocument();
    });

    it('honors a custom add-button label', () => {
        renderWithProviders(
            <AddDestinationBtn
                onChange={() => {}}
                addButtonLabel="Add next destination"
            />
        );
        expect(
            screen.getByRole('button', { name: 'Add next destination' })
        ).toBeInTheDocument();
    });

    it('renders the edit trigger in edit mode', () => {
        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={editData}
                onChange={() => {}}
            />
        );
        expect(
            screen.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument();
    });

    it('renders nothing in view mode', () => {
        const { container } = renderWithProviders(
            <AddDestinationBtn isViewMode onChange={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('opens the type-picker step with the transport tiles', async () => {
        renderWithProviders(<AddDestinationBtn onChange={() => {}} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Destination' })
        );
        expect(
            screen.getByRole('heading', { name: 'Where to?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: /Flight/ })
        ).toBeInTheDocument();
    });

    it('advances past the type step when a transport tile is picked', async () => {
        renderWithProviders(<AddDestinationBtn onChange={() => {}} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Destination' })
        );
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        // The Method step drops the tile grid and shows the footer Back control.
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Back' })
            ).toBeInTheDocument()
        );
        expect(
            screen.queryByRole('tablist', { name: 'Transport type' })
        ).not.toBeInTheDocument();
    });

    it('saves an edited destination and fires onChange with its country', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={editData}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        // ModalButton wraps a raw MUI Modal (no dialog role); the save action
        // lives in the modal footer.
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Destination' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 5,
                country: { id: 1, name: 'Japan' },
            })
        );
        // Saving closes the modal, unmounting its content.
        await waitFor(() =>
            expect(
                screen.queryByRole('button', { name: 'Save Destination' })
            ).not.toBeInTheDocument()
        );
    });
});
