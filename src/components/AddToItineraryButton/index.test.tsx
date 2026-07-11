import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';

// ── Mutable state flipped per test. ──────────────────────────────────────
let mockUser: { id?: string } | null = { id: 'u1' };
let mockSearchParams = new URLSearchParams('');
let mockItineraries: Array<{ id: string; name?: string }> = [];
let mockItinSuccess = true;
const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
const mockSaveMutate = vi.fn();
const mockLookupCountry = vi.fn();
const mockDispatchStartFresh = vi.fn();
const mockFindMatching = vi.fn();
const mockAddPlace = vi.fn();
const mockApiToTripState = vi.fn();
const mockResolveType = vi.fn();
const mockTripStateToInput = vi.fn();
const mockFetchAirport = vi.fn();

// Factories reference the mock* vars LAZILY inside arrow bodies only — never
// as eager property values — so module-init doesn't hit their TDZ.
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
}));

vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => ({
        data: mockItineraries,
        isSuccess: mockItinSuccess,
        isLoading: false,
    }),
    useSaveItinerary: () => ({ mutateAsync: mockSaveMutate, isPending: false }),
}));

vi.mock('api/hooks/useLookups', () => ({
    useItineraryTypes: () => ({ data: [{ id: 't1', name: 'City' }] }),
    useTripStatuses: () => ({ data: [] }),
}));

vi.mock('api/hooks/useHomeDeparture', () => ({
    useNearestAirport: () => ({ data: null }),
}));

vi.mock('api/homeDepartureApi', () => ({
    fetchNearestAirportForCoords: (...a: unknown[]) => mockFetchAirport(...a),
}));

vi.mock('utils/addPlaceToItinerary', () => ({
    lookupCountry: (...a: unknown[]) => mockLookupCountry(...a),
    dispatchStartFreshTrip: (...a: unknown[]) => mockDispatchStartFresh(...a),
    findMatchingDestinationIndex: (...a: unknown[]) => mockFindMatching(...a),
    addPlaceToTripState: (...a: unknown[]) => mockAddPlace(...a),
}));

vi.mock('utils/itineraryAdapter', () => ({
    apiToTripState: (...a: unknown[]) => mockApiToTripState(...a),
}));

vi.mock('utils/tripMapper', () => ({
    resolveInteraryTypeId: (...a: unknown[]) => mockResolveType(...a),
    tripStateToSaveInput: (...a: unknown[]) => mockTripStateToInput(...a),
}));

import AddToItineraryButton from './index';

const place: PlaceRecommendation = {
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    rating: 5,
    bestTimeToVisit: 'Spring',
    description: 'Temples',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: null,
    longitude: null,
};

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockSearchParams = new URLSearchParams('');
    mockItineraries = [];
    mockItinSuccess = true;
    mockNavigate.mockReset();
    mockDispatch.mockReset();
    mockSaveMutate.mockReset().mockResolvedValue(undefined);
    mockLookupCountry.mockReset().mockResolvedValue({ id: 1, name: 'Japan' });
    mockDispatchStartFresh.mockReset();
    mockFindMatching.mockReset().mockReturnValue(-1);
    mockAddPlace.mockReset().mockReturnValue({
        destinations: [],
        status: { id: 'status-1', name: 'Planning' },
    });
    mockApiToTripState.mockReset().mockReturnValue({ destinations: [] });
    mockResolveType.mockReset().mockReturnValue('type-1');
    mockTripStateToInput.mockReset().mockReturnValue({ id: 'trip-1' });
    mockFetchAirport.mockReset();
});

describe('AddToItineraryButton', () => {
    it('renders nothing when there is no signed-in user', () => {
        mockUser = null;
        const { container } = renderWithProviders(
            <AddToItineraryButton place={place} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('starts a fresh trip when there is no trip id in the URL', async () => {
        renderWithProviders(<AddToItineraryButton place={place} />);
        const btn = () =>
            screen.getByRole('button', { name: /Plan a trip to Kyoto/ });
        await waitFor(() => expect(btn()).toBeEnabled());

        await userEvent.click(btn());
        expect(mockDispatchStartFresh).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/single');
    });

    it('adds the place to an existing trip and navigates to it', async () => {
        mockSearchParams = new URLSearchParams('id=trip-1');
        mockItineraries = [{ id: 'trip-1', name: 'Japan Trip' }];
        renderWithProviders(<AddToItineraryButton place={place} />);
        const btn = () =>
            screen.getByRole('button', { name: /Add Kyoto to your trip/ });
        await waitFor(() => expect(btn()).toBeEnabled());

        await userEvent.click(btn());
        await waitFor(() =>
            expect(mockSaveMutate).toHaveBeenCalledWith({ id: 'trip-1' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/trip-detail?id=trip-1');
    });

    it('disables the button with a reason when the trip is not in the user list', async () => {
        mockSearchParams = new URLSearchParams('id=ghost');
        mockItineraries = [{ id: 'other' }];
        mockItinSuccess = true;
        renderWithProviders(<AddToItineraryButton place={place} />);
        const btn = screen.getByRole('button', { name: /Add Kyoto to your trip/ });
        await waitFor(() => expect(btn).toBeDisabled());
        await waitFor(() =>
            expect(btn).toHaveAttribute(
                'title',
                expect.stringContaining("isn't in your list")
            )
        );
        expect(mockSaveMutate).not.toHaveBeenCalled();
    });
});
