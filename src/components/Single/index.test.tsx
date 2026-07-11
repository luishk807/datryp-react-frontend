import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { Activity } from 'types';

// Both branches mount heavy feature children — stub them so this thin wrapper
// is tested in isolation (does it pick the right child for the trips prop).
vi.mock('components/DestinationDetail/Activities', () => ({
    default: ({ activities }: { activities: Activity[] }) => (
        <div data-testid="activities">count:{activities.length}</div>
    ),
}));
vi.mock('components/common/AddPlaceBtn', () => ({
    default: () => <div data-testid="add-place" />,
}));

import Single from './index';

describe('Single', () => {
    it('renders the Add Place affordance when there are no activities', () => {
        renderWithProviders(<Single />);
        expect(screen.getByTestId('add-place')).toBeInTheDocument();
        expect(screen.queryByTestId('activities')).not.toBeInTheDocument();
    });

    it('renders the Activities list when trips are supplied', () => {
        const trips = [
            { id: 'a1' } as Activity,
            { id: 'a2' } as Activity,
        ];
        renderWithProviders(<Single trips={trips} />);
        const list = screen.getByTestId('activities');
        expect(list).toBeInTheDocument();
        expect(list).toHaveTextContent('count:2');
        expect(screen.queryByTestId('add-place')).not.toBeInTheDocument();
    });
});
