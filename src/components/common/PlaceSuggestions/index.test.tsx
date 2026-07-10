import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';
import PlaceSuggestions from './index';

const makeItem = (
    over: Partial<PlaceRecommendation> = {}
): PlaceRecommendation => ({
    name: 'Fushimi Inari',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    rating: 4.7,
    bestTimeToVisit: '',
    description: 'A shrine',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: null,
    longitude: null,
    ...over,
});

let mockData: { items: PlaceRecommendation[] } | undefined;
let mockFetching = false;
let mockError = false;

vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: () => ({
        data: mockData,
        isFetching: mockFetching,
        isError: mockError,
    }),
}));

// RatingBadge (rendered per card) would otherwise fire the live Google
// rating lookup — stub the hook so no network escapes and it renders null.
vi.mock('api/hooks/usePlaceRating', () => ({
    usePlaceRating: () => ({ data: undefined }),
}));

beforeEach(() => {
    mockData = { items: [makeItem()] };
    mockFetching = false;
    mockError = false;
});

describe('PlaceSuggestions', () => {
    it('renders nothing without a country scope', () => {
        const { container } = renderWithProviders(
            <PlaceSuggestions onPick={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a labelled region with the heading + suggestion cards', () => {
        renderWithProviders(
            <PlaceSuggestions country="Japan" collapsible={false} onPick={vi.fn()} />
        );
        expect(
            screen.getByRole('region', { name: 'Suggested places in Japan' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Suggested for Japan' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', {
                name: 'Open Fushimi Inari details in a new tab',
            })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Use Fushimi Inari' })
        ).toBeInTheDocument();
    });

    it('fires onPick with the mapped suggestion payload', async () => {
        const onPick = vi.fn();
        renderWithProviders(
            <PlaceSuggestions country="Japan" collapsible={false} onPick={onPick} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Use Fushimi Inari' })
        );
        expect(onPick).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Fushimi Inari',
                location: 'Kyoto, Japan',
                city: 'Kyoto',
                country: 'Japan',
                countryCode: 'JP',
                note: 'A shrine',
            })
        );
    });

    it('renders skeletons (no cards) while fetching and disables shuffle', () => {
        mockData = { items: [] };
        mockFetching = true;
        renderWithProviders(
            <PlaceSuggestions country="Japan" collapsible={false} onPick={vi.fn()} />
        );
        expect(
            screen.queryByRole('button', { name: /^Use / })
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Refresh suggestions' })
        ).toBeDisabled();
    });

    it('shows the error message when the recommender fails', () => {
        mockData = { items: [] };
        mockError = true;
        renderWithProviders(
            <PlaceSuggestions country="Japan" collapsible={false} onPick={vi.fn()} />
        );
        expect(
            screen.getByText(
                "Couldn't load suggestions — type a place above instead."
            )
        ).toBeInTheDocument();
    });

    it('starts collapsed and reveals cards when the show toggle is clicked', async () => {
        renderWithProviders(
            <PlaceSuggestions country="Japan" onPick={vi.fn()} />
        );
        expect(
            screen.queryByRole('button', { name: 'Use Fushimi Inari' })
        ).not.toBeInTheDocument();
        const toggle = screen.getByRole('button', { name: 'Show suggestions' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(toggle);
        expect(
            screen.getByRole('button', { name: 'Use Fushimi Inari' })
        ).toBeInTheDocument();
    });
});
