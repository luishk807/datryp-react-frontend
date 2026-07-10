import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { TripProvider } from 'context/TripContext';
import type { Activity } from 'types';
import AddPlaceBtn from './index';

// Signed-out user → nearest-airport/station seeds stay disabled (no network).
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: null, isAdmin: false }),
}));

// The modal's onOpen pre-warms suggestions; stub the prefetchers so opening
// the modal doesn't fire real network requests.
vi.mock('api/suggestionsPrefetch', () => ({
    prefetchActivitySuggestions: vi.fn(),
    prefetchSuggestions: vi.fn(),
    buildSuggestionsQuery: () => '',
}));

const renderInTrip = (ui: React.ReactElement) =>
    renderWithProviders(<TripProvider>{ui}</TripProvider>);

beforeEach(() => {
    localStorage.clear();
});

const editData = { id: 1, name: 'Louvre' } as unknown as Activity;

describe('AddPlaceBtn', () => {
    it('renders the add trigger', () => {
        renderInTrip(<AddPlaceBtn onChange={() => {}} />);
        expect(
            screen.getByRole('button', { name: 'Add Activity' })
        ).toBeInTheDocument();
    });

    it('renders the edit trigger in edit mode', () => {
        renderInTrip(
            <AddPlaceBtn type="edit" data={editData} onChange={() => {}} />
        );
        expect(
            screen.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument();
    });

    it('renders an icon-only trigger with an accessible name', () => {
        renderInTrip(
            <AddPlaceBtn onChange={() => {}} triggerIcon={() => <span />} />
        );
        const trigger = screen.getByRole('button', { name: 'Add Activity' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent('');
    });

    it('renders nothing in view mode', () => {
        const { container } = renderInTrip(
            <AddPlaceBtn isViewMode onChange={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('opens the wizard on the type step with activity-type tiles', async () => {
        renderInTrip(<AddPlaceBtn onChange={() => {}} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        expect(
            screen.getByText('What would you like to add?')
        ).toBeInTheDocument();
        // The type tiles are rendered as a WAI-ARIA list of listitem buttons.
        expect(screen.getByText('Place')).toBeInTheDocument();
    });

    it('advances past the type step when an activity tile is picked', async () => {
        renderInTrip(<AddPlaceBtn onChange={() => {}} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        await userEvent.click(screen.getByText('Place'));
        expect(
            screen.queryByText('What would you like to add?')
        ).not.toBeInTheDocument();
    });
});
