import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    fireEvent,
} from '../../test/renderWithProviders';
import type { TripRating } from 'api/tripRatingApi';

let mockRating: TripRating;
vi.mock('api/hooks/useTripRating', () => ({
    useTripRating: () => ({ data: mockRating }),
}));

const mockSaveMutate = vi.fn();
let mockSaveState = { isPending: false, isError: false };
vi.mock('api/hooks/useSaveTripRating', () => ({
    useSaveTripRating: () => ({
        mutate: mockSaveMutate,
        isPending: mockSaveState.isPending,
        isError: mockSaveState.isError,
    }),
}));

let mockCompanions: unknown[];
vi.mock('api/hooks/useTripCompanions', () => ({
    useTripCompanions: () => ({ data: mockCompanions }),
}));

let mockUser: { id: string; profileImageUrl: string | null } | null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

// The recap modal body is its own well-tested form — stub it to a button that
// echoes a save so we can assert the card wires save → mutation.
vi.mock('components/TripRecapCard/RecapForm', () => ({
    default: ({ onSave }: { onSave: (r: unknown) => void }) => (
        <button type="button" onClick={() => onSave({ rating: 5 })}>
            stub-save
        </button>
    ),
}));

import TripRecapCard from './index';

const emptyRating: TripRating = {
    myRating: null,
    myExpectations: null,
    mySurprised: null,
    myAdvice: null,
    average: null,
    count: 0,
};

beforeEach(() => {
    mockSaveMutate.mockReset();
    mockSaveState = { isPending: false, isError: false };
    mockRating = { ...emptyRating };
    mockCompanions = [];
    mockUser = { id: 'u1', profileImageUrl: null };
});

describe('TripRecapCard', () => {
    it('prompts an unreviewed member to rate', () => {
        renderWithProviders(<TripRecapCard tripId="t1" canRate />);
        expect(screen.getByText('Click to rate')).toBeInTheDocument();
        expect(
            screen.getByRole('radiogroup', { name: 'Pick a rating' })
        ).toBeInTheDocument();
    });

    it('opens the recap modal from the stars and wires save to the mutation', async () => {
        const { container } = renderWithProviders(
            <TripRecapCard tripId="t1" canRate />
        );
        // The interactive stars are aria-hidden MUI svgs — click the 5th one.
        const stars = container.querySelectorAll('.star-input-star');
        fireEvent.click(stars[4]);
        await userEvent.click(
            await screen.findByRole('button', { name: 'stub-save' })
        );
        expect(mockSaveMutate).toHaveBeenCalledWith(
            { tripId: 't1', recap: { rating: 5 } },
            expect.anything()
        );
    });

    it('shows the member\'s own rating and an edit affordance once reviewed', async () => {
        mockRating = { ...emptyRating, myRating: 4, myExpectations: 'better' };
        renderWithProviders(<TripRecapCard tripId="t1" canRate />);
        expect(
            screen.getByRole('img', { name: '4 out of 5 stars' })
        ).toBeInTheDocument();
        expect(screen.getByText('Your rating')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit recap' })
        );
        expect(
            await screen.findByRole('button', { name: 'stub-save' })
        ).toBeInTheDocument();
    });

    it('hides the rating controls when the viewer cannot rate', () => {
        renderWithProviders(<TripRecapCard tripId="t1" canRate={false} />);
        expect(screen.queryByText('Click to rate')).not.toBeInTheDocument();
        expect(screen.queryByText('Your rating')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('radiogroup', { name: 'Pick a rating' })
        ).not.toBeInTheDocument();
    });

    it('shows the trip-wide count when there are ratings', () => {
        mockRating = { ...emptyRating, average: 4.5, count: 3 };
        renderWithProviders(<TripRecapCard tripId="t1" canRate />);
        expect(screen.getByText('3 ratings')).toBeInTheDocument();
    });

    it('lists the group\'s reviews with each companion\'s rating and favorite', () => {
        mockCompanions = [
            {
                userId: 'c1',
                name: 'Bob',
                profileImageUrl: null,
                rating: 5,
                favoritePlace: 'Sunset Beach',
            },
        ];
        renderWithProviders(<TripRecapCard tripId="t1" canRate={false} />);
        expect(
            screen.getByText('Reviews from your group')
        ).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Sunset Beach')).toBeInTheDocument();
    });
});
