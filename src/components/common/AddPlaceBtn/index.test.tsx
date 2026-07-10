import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { TripProvider } from 'context/TripContext';
import { ACTIVITY_KIND } from 'constants';
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

// PlaceAutocomplete + the arrival-image query hit `useSearchPlaces`; keep the
// wizard headless so custom/edit place flows never touch the network.
vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: () => ({
        data: undefined,
        isFetching: false,
        error: null,
        isSuccess: false,
    }),
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

describe('AddPlaceBtn — Note wizard flow', () => {
    it('completes the Note flow end-to-end and fires onChange with the derived name', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        // Note is a single-method (custom) kind → auto-skips the chooser
        // and lands straight on the note textarea.
        await userEvent.click(screen.getByText('Note'));
        const noteBox = await screen.findByRole('textbox', { name: 'Note' });
        await userEvent.type(noteBox, 'Buy museum tickets');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        // Step 3 review.
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.NOTE,
                name: 'Buy museum tickets',
            })
        );
    });

    it('blocks advancing an empty Note and surfaces the validation error', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        await userEvent.click(screen.getByText('Note'));
        await screen.findByRole('textbox', { name: 'Note' });
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(
            await screen.findByText('Please provide a note.')
        ).toBeInTheDocument();
        // Still on the note step (not advanced to review).
        expect(
            screen.getByRole('textbox', { name: 'Note' })
        ).toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('AddPlaceBtn — method chooser + custom Place flow', () => {
    it('shows the method chooser for Place and returns to the type step on Back', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        await userEvent.click(screen.getByText('Place'));
        expect(
            await screen.findByText('How would you like to add it?')
        ).toBeInTheDocument();
        // PLACE offers all three add methods.
        expect(screen.getByText('Suggestions')).toBeInTheDocument();
        expect(screen.getByText('Smart search')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            await screen.findByText('What would you like to add?')
        ).toBeInTheDocument();
    });

    it('completes a custom Place entry and fires onChange with kind place', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Activity' })
        );
        await userEvent.click(screen.getByText('Place'));
        await userEvent.click(screen.getByText('Custom'));
        const nameInput = await screen.findByRole('combobox', {
            name: 'Activity name',
        });
        await userEvent.type(nameInput, 'Louvre');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.PLACE,
                name: 'Louvre',
            })
        );
    });
});

describe('AddPlaceBtn — edit mode', () => {
    const placeToEdit = {
        id: 7,
        name: 'Louvre',
        kind: ACTIVITY_KIND.PLACE,
    } as unknown as Activity;

    it('prefills the edit form and saves the activity preserving id + kind', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn type="edit" data={placeToEdit} onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        // Edit renders the full single-screen form with the name prefilled.
        const nameInput = await screen.findByRole('combobox', {
            name: 'Activity name',
        });
        expect(nameInput).toHaveValue('Louvre');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 7,
                kind: ACTIVITY_KIND.PLACE,
                name: 'Louvre',
            })
        );
    });
});

// ============================================================================
// Additional orchestrator coverage: smart pipelines (flight / transit / hotel /
// place), find-my-flight search, custom segment editing, nearest-airport /
// station seeding, image upload, review in-place edit, smart-box routing,
// edit-mode hydration by kind, and modal-close reset.
//
// Strategy: mock the three headless lookup watchers so tests can drive their
// callbacks directly (the same pattern the per-form tests use), and mock the
// data hooks the pipelines touch so nothing hits MSW. These forms never render
// the watchers in the describes above (custom/edit/note slices skip them), so
// the mocks don't affect the existing suites.
// ============================================================================
import { waitFor, fireEvent, act } from '../../../test/renderWithProviders';

// Mutable, mock-prefixed so the vi.mock factories may reference them.
let mockNearestAirport: any = null;
let mockNearestStation: any = null;
let mockDepartures: any[] = [];
const mockFlightWatcherProps: any[] = [];
const mockTransitWatcherProps: any[] = [];
const mockPlaceWatcherProps: any[] = [];
// Returns a non-null suggestion so the fire*Suggest `.then` field-application
// branches actually run. `name: null` keeps the user's typed/picked name.
const mockSuggest = vi.fn(async () => ({
    name: null,
    location: 'Champ de Mars',
    city: 'Paris',
    country: 'France',
    startTime: '10:00',
    endTime: '12:00',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    departTime: '09:00',
    arrivalTime: '12:00',
    cost: '25',
    currency: 'USD',
}));

vi.mock('api/hooks/useHomeDeparture', () => ({
    useNearestAirport: () => ({ data: mockNearestAirport }),
    useNearestTrainStation: () => ({ data: mockNearestStation }),
}));
vi.mock('api/hooks/useFlightDepartures', () => ({
    useFlightDepartures: () => ({
        data: mockDepartures,
        isFetching: false,
        isError: false,
    }),
}));
// AirportAutocomplete (flight custom + find-my-flight) would otherwise hit
// `/airports/search`; keep it headless.
vi.mock('api/hooks/useAirports', () => ({
    useAirports: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('api/hooks/useDestinationAirport', () => ({
    useDestinationAirport: () => ({ data: undefined }),
}));
// Fire-and-forget AI field suggestion — resolve to null (no-op) so the
// suggest handlers run their guards without touching the network.
vi.mock('api/activitySuggestApi', () => ({
    // Wrap so the factory (hoisted above the declaration) doesn't read
    // `mockSuggest` before it's initialized — the call defers to run time.
    suggestActivityFields: (...args: any[]) => mockSuggest(...args),
}));
vi.mock('./FlightSegmentLookupWatcher', () => ({
    default: (props: any) => {
        mockFlightWatcherProps.push(props);
        return null;
    },
}));
vi.mock('./TransitSegmentLookupWatcher', () => ({
    default: (props: any) => {
        mockTransitWatcherProps.push(props);
        return null;
    },
}));
vi.mock('./PlaceSmartEntryWatcher', () => ({
    default: (props: any) => {
        mockPlaceWatcherProps.push(props);
        return null;
    },
}));

const resetAdded = () => {
    mockFlightWatcherProps.length = 0;
    mockTransitWatcherProps.length = 0;
    mockPlaceWatcherProps.length = 0;
    mockNearestAirport = null;
    mockNearestStation = null;
    mockDepartures = [];
    mockSuggest.mockClear();
};

const last = (arr: any[]) => arr[arr.length - 1];

const FLIGHT_SMART_PH = 'Try: "UA123 tomorrow" or "UA123 today stopover BA245"';
const TRANSIT_SMART_PH = 'e.g. "Tokyo to Kyoto 9am-12pm $100"';
const HOTEL_SMART_PH =
    'e.g. "Hilton Tokyo, check-in 3pm, $200", or paste a Google Maps link';
const PLACE_SMART_PH =
    'e.g. "Ankole Grill at 10am-12pm, around $50", or paste a Google Maps link';
const TYPE_SMART_PH =
    "Type anything — a place, flight, hotel, or how you're getting around";

const openAdd = () =>
    userEvent.click(screen.getByRole('button', { name: 'Add Activity' }));
const pickTile = (label: string) => userEvent.click(screen.getByText(label));

const rec = (over: any = {}) => ({
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rating: 4,
    bestTimeToVisit: '',
    description: 'A landmark',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: 48.8,
    longitude: 2.29,
    ...over,
});

describe('AddPlaceBtn — flight smart pipeline', () => {
    beforeEach(resetAdded);

    it('parses a flight paste, seeds legs from the lookup, auto-advances, and confirms with the route name', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />
        );
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(FLIGHT_SMART_PH);
        await userEvent.type(box, 'UA123 tomorrow');

        // The mocked per-segment watcher captured the form's onResult; drive
        // it as the lookup would, seeding depart/arrival airports.
        await waitFor(() =>
            expect(mockFlightWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockFlightWatcherProps).onResult({
                flightNumber: 'UA123',
                departAirport: 'JFK',
                arrivalAirport: 'LAX',
                departDate: '2026-06-15',
                departTime: '10:00',
                arrivalDate: '2026-06-15',
                arrivalTime: '13:00',
                airline: 'United',
            });
            // A second lookup that came back all-null exercises the
            // `?? current` keep-what-we-have branch of applyFlightLookup.
            last(mockFlightWatcherProps).onResult({
                flightNumber: null,
                departAirport: null,
                arrivalAirport: null,
                departDate: null,
                departTime: null,
                arrivalDate: null,
                arrivalTime: null,
                airline: null,
            });
        });

        // Smart status resolves (both airports set) → auto-advance to review.
        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        expect(screen.getAllByText('JFK → LAX').length).toBeGreaterThan(0);

        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.FLIGHT,
                name: 'JFK → LAX',
            })
        );
    });
});

describe('AddPlaceBtn — find-my-flight search', () => {
    beforeEach(resetAdded);

    it('searches airport departures, picks one, lands on the custom form, and confirms', async () => {
        mockNearestAirport = { iataCode: 'JFK', name: 'John F. Kennedy' };
        mockDepartures = [
            {
                flightNumber: 'UA100',
                airline: 'United',
                airlineIata: 'UA',
                departAirport: 'JFK',
                departDate: '2026-06-15',
                departTime: '08:00',
                arrivalAirport: 'LAX',
                arrivalAirportName: 'Los Angeles',
                arrivalDate: '2026-06-15',
                arrivalTime: '11:00',
                aircraft: 'A320',
            },
        ];
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />
        );
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Find my flight'));

        await userEvent.click(screen.getByRole('button', { name: 'Search' }));
        await userEvent.click(
            await screen.findByRole('button', { name: /UA100/ })
        );

        // Pick flips to the CUSTOM method → the populated flight form. Adding a
        // stopover now inherits the depart airport/date from the picked leg's
        // arrival (exercising handleAddSegment's inherit branch), then remove it.
        await userEvent.click(
            await screen.findByRole('button', { name: 'Add stopover' })
        );
        await waitFor(() =>
            expect(
                document.querySelectorAll('.add-destination-segment').length
            ).toBe(2)
        );
        const rm = document.querySelectorAll('.add-destination-segment-remove');
        fireEvent.click(rm[rm.length - 1]);

        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.FLIGHT })
        );
    });
});

describe('AddPlaceBtn — flight custom segments', () => {
    beforeEach(resetAdded);

    it('splits a multi-flight-number paste into two legs and derives the flight-number chain name', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />
        );
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Custom'));

        // Expand the first segment card, then paste a two-leg number.
        await userEvent.click(
            screen.getAllByRole('button', { expanded: false })[0]
        );
        const numberInput = document.getElementById(
            'flightNumber-0'
        ) as HTMLInputElement;
        fireEvent.change(numberInput, {
            target: { value: 'UA123 stopover BA345' },
        });

        await waitFor(() =>
            expect(document.getElementById('flightNumber-1')).not.toBeNull()
        );
        expect(
            (document.getElementById('flightNumber-1') as HTMLInputElement)
                .value
        ).toBe('BA345');

        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.FLIGHT,
                name: 'UA123 + BA345',
            })
        );
    });

    it('adds a stopover leg and removes it again', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Custom'));

        await userEvent.click(screen.getByRole('button', { name: 'Add stopover' }));
        // Two segment toggles now exist.
        await waitFor(() =>
            expect(
                document.querySelectorAll('.add-destination-segment').length
            ).toBe(2)
        );
        const removeBtn = document.querySelector(
            '.add-destination-segment-remove'
        ) as HTMLButtonElement;
        fireEvent.click(removeBtn);
        await waitFor(() =>
            expect(
                document.querySelectorAll('.add-destination-segment').length
            ).toBe(1)
        );
    });
});

describe('AddPlaceBtn — nearest airport / station seeding', () => {
    beforeEach(resetAdded);

    it('seeds the first flight segment depart airport from the home airport', async () => {
        mockNearestAirport = { iataCode: 'JFK', name: 'John F. Kennedy' };
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Custom'));
        // Seeded depart airport makes the draft valid on its own; the review
        // derives the single-endpoint name from it, and confirm runs the
        // flight-name derivation in handleSubmit.
        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        expect(screen.getAllByText('JFK').length).toBeGreaterThan(0);
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.FLIGHT, name: 'JFK' })
        );
    });

    it('seeds the first train segment depart station from the home station', async () => {
        mockNearestStation = { name: 'Penn Station' };
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        expect(screen.getByText('Penn Station')).toBeInTheDocument();
        // Confirm runs handleSubmit's train name derivation (no typed name).
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.TRAIN, name: 'Train' })
        );
    });
});

describe('AddPlaceBtn — transit smart pipeline', () => {
    beforeEach(resetAdded);

    it('parses a train paste, applies a lookup result, auto-advances, and confirms', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />
        );
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        await userEvent.type(box, 'Renfe 3152 Madrid to Barcelona');

        await waitFor(() =>
            expect(mockTransitWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockTransitWatcherProps).onResult({
                operator: 'Renfe',
                number: '3152',
                departStation: 'Madrid Atocha',
                arrivalStation: 'Barcelona Sants',
                departTime: '09:00',
                arrivalTime: '12:00',
                departDate: null,
                arrivalDate: null,
            });
            // All-null re-query → applyTransitLookup keeps the current fields.
            last(mockTransitWatcherProps).onResult({
                operator: null,
                number: null,
                departStation: null,
                arrivalStation: null,
                departTime: null,
                arrivalTime: null,
                departDate: null,
                arrivalDate: null,
            });
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.TRAIN,
                name: expect.stringMatching(/Renfe/),
            })
        );
    });
});

describe('AddPlaceBtn — transit custom (mode toggle + add/remove leg)', () => {
    beforeEach(resetAdded);

    it('toggles to Bus, fills operator + number, adds then removes a leg, and confirms', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Custom'));

        await userEvent.click(screen.getByRole('tab', { name: 'Bus' }));

        await userEvent.click(
            screen.getAllByRole('button', { expanded: false })[0]
        );
        fireEvent.change(document.getElementById('transitOperator-0')!, {
            target: { value: 'FlixBus' },
        });
        fireEvent.change(document.getElementById('transitNumber-0')!, {
            target: { value: 'N1900' },
        });
        // An arrival station lets the added leg inherit its depart station.
        fireEvent.change(document.getElementById('transitArrivalStation-0')!, {
            target: { value: 'Munich' },
        });

        await userEvent.click(
            screen.getByRole('button', { name: 'Add leg (transfer)' })
        );
        await waitFor(() =>
            expect(
                document.querySelectorAll('.add-destination-segment').length
            ).toBe(2)
        );
        // Remove the SECOND (inherited) leg so the first — which carries the
        // operator + number — survives.
        const removes = document.querySelectorAll(
            '.add-destination-segment-remove'
        );
        fireEvent.click(removes[removes.length - 1]);
        await waitFor(() =>
            expect(
                document.querySelectorAll('.add-destination-segment').length
            ).toBe(1)
        );

        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.BUS,
                name: 'Bus FlixBus N1900',
            })
        );
    });
});

describe('AddPlaceBtn — hotel pipeline', () => {
    beforeEach(resetAdded);

    it('custom check-in: fills name + confirmation and confirms with the check-in prefix + hotelInfo', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Hotel');
        await userEvent.click(screen.getByText('Custom'));

        await userEvent.type(
            await screen.findByRole('combobox', { name: 'Hotel name' }),
            'Ritz'
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Confirmation # (optional)' }),
            'C1'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                name: 'Check in: Ritz',
                hotelInfo: { confirmationNumber: 'C1' },
            })
        );
    });

    it('smart: a resolved hotel is picked, auto-advances, and confirms', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Hotel');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(HOTEL_SMART_PH);
        await userEvent.type(box, 'Hilton Tokyo');

        mockSuggest.mockResolvedValueOnce(null);
        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockPlaceWatcherProps).onResult(
                rec({ name: 'Hilton Tokyo', city: 'Tokyo', country: 'Japan' }),
                { query: 'hilton tokyo' },
                undefined
            );
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                name: 'Check in: Hilton Tokyo',
            })
        );
        expect(mockSuggest).toHaveBeenCalled();
    });

    it('smart bare match (name only) surfaces the fallback, then confirms via manual', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Hotel');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(HOTEL_SMART_PH);
        await userEvent.type(box, 'Cozy Inn Kyoto');

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            // No coords + no formatted address → bare match: name-only path;
            // fireHotelSuggest is called WITHOUT a location argument. Without a
            // location/coords the draft can't resolve → the not-found fallback.
            last(mockPlaceWatcherProps).onResult(
                rec({
                    name: 'Cozy Inn',
                    city: 'Kyoto',
                    country: 'Japan',
                    latitude: null,
                    longitude: null,
                }),
                { query: 'cozy inn', startTime: '15:00', cost: 180 },
                undefined
            );
        });

        // Hotel offers Suggestions, so the fallback shows both actions.
        await userEvent.click(
            await screen.findByRole('button', { name: 'Add manually' })
        );
        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                name: 'Check in: Cozy Inn',
            })
        );
    });
});

describe('AddPlaceBtn — place smart pipeline', () => {
    beforeEach(resetAdded);

    it('a resolved place is picked, auto-advances, and confirms with the place name', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(PLACE_SMART_PH);
        await userEvent.type(box, 'eiffel tower');

        // The AI suggest returning null once exercises the `if (!s) return`
        // early-out; resolution still holds via the picked coords.
        mockSuggest.mockResolvedValueOnce(null);

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            // Empty city / country / code exercise the `|| null` fallbacks in
            // handlePlacePicked; the coords still resolve the draft.
            last(mockPlaceWatcherProps).onResult(
                rec({ city: '', country: '', countryCode: null }),
                { query: 'eiffel tower' },
                undefined
            );
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.PLACE,
                name: 'Eiffel Tower',
            })
        );
    });

    it('a not-found warning surfaces the manual fallback which switches to the custom form', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(PLACE_SMART_PH);
        await userEvent.type(box, 'zzqqxx');

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockPlaceWatcherProps).onWarning('Could not find a match.');
        });

        const manual = await screen.findByRole('button', {
            name: 'Add manually',
        });
        await userEvent.click(manual);
        expect(
            await screen.findByRole('combobox', { name: 'Activity name' })
        ).toBeInTheDocument();
    });
});

describe('AddPlaceBtn — place custom image upload + review edit', () => {
    beforeEach(resetAdded);

    it('uploads an image, edits in place on the review, and confirms with the image', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Custom'));

        await userEvent.type(
            await screen.findByRole('combobox', { name: 'Activity name' }),
            'Louvre'
        );

        const fileInput = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const file = new File(['x'], 'pic.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);
        // FileReader.onload runs async → the preview image appears.
        await screen.findByRole('img', { name: 'pic.png' });

        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();

        // In-place edit sub-view → Save returns to the review.
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(
            await screen.findByRole('combobox', { name: 'Activity name' })
        ).toHaveValue('Louvre');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.PLACE,
                name: 'Louvre',
                image: expect.objectContaining({ name: 'pic.png' }),
            })
        );
    });
});

describe('AddPlaceBtn — smart-box routing (TypeStep)', () => {
    beforeEach(resetAdded);

    const submitSmartBox = async (text: string) => {
        await openAdd();
        await userEvent.type(
            screen.getByPlaceholderText(TYPE_SMART_PH),
            text
        );
        const go = screen.getByRole('button', { name: 'Detect and continue' });
        await waitFor(() => expect(go).toBeEnabled());
        await userEvent.click(go);
    };

    it('routes a flight paste to the flight smart form', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await submitSmartBox('UA123');
        expect(
            await screen.findByPlaceholderText(FLIGHT_SMART_PH)
        ).toBeInTheDocument();
    });

    it('routes a train paste to the transit smart form', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await submitSmartBox('Renfe 3152 Madrid to Barcelona');
        expect(
            screen.getByPlaceholderText(TRANSIT_SMART_PH)
        ).toBeInTheDocument();
    });

    it('routes a hotel paste to the hotel smart form', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await submitSmartBox('Hilton Times Square');
        expect(
            await screen.findByPlaceholderText(HOTEL_SMART_PH)
        ).toBeInTheDocument();
    });

    it('routes a plain place to the place smart form', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await submitSmartBox('mount fuji');
        expect(
            await screen.findByPlaceholderText(PLACE_SMART_PH)
        ).toBeInTheDocument();
    });
});

describe('AddPlaceBtn — edit hydration by kind', () => {
    beforeEach(resetAdded);

    const editAndSave = async (data: Activity, onChange = vi.fn()) => {
        renderInTrip(
            <AddPlaceBtn type="edit" data={data} onChange={onChange} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Save Activity' })
        );
        return onChange;
    };

    it('flight: hydrates the segments and saves preserving id + kind', async () => {
        const onChange = await editAndSave({
            id: 21,
            kind: ACTIVITY_KIND.FLIGHT,
            name: 'JFK → LAX',
            flightSegments: [
                { flightNumber: 'UA1', departAirport: 'JFK', arrivalAirport: 'LAX' },
            ],
        } as unknown as Activity);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 21,
                kind: ACTIVITY_KIND.FLIGHT,
                name: 'JFK → LAX',
            })
        );
    });

    it('hotel: strips the check-in prefix on edit and re-lifts hotelInfo on save', async () => {
        const onChange = await editAndSave({
            id: 22,
            kind: ACTIVITY_KIND.HOTEL_CHECKIN,
            name: 'Check in: Ritz',
            startTime: '15:00',
            location: 'Plaza 5',
            hotelInfo: { confirmationNumber: 'CC9' },
        } as unknown as Activity);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 22,
                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                name: 'Check in: Ritz',
                hotelInfo: { confirmationNumber: 'CC9' },
            })
        );
    });

    it('transit: hydrates transit segments and saves the train name', async () => {
        const onChange = await editAndSave({
            id: 23,
            kind: ACTIVITY_KIND.TRAIN,
            name: 'Train Renfe 3152',
            transitSegments: [
                { operator: 'Renfe', number: '3152', departTime: '09:00' },
            ],
        } as unknown as Activity);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 23,
                kind: ACTIVITY_KIND.TRAIN,
                name: 'Train Renfe 3152',
            })
        );
    });

    it('note: hydrates the note and saves the derived headline', async () => {
        const onChange = await editAndSave({
            id: 24,
            kind: ACTIVITY_KIND.NOTE,
            name: 'Buy tickets',
            note: 'Buy tickets',
        } as unknown as Activity);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 24,
                kind: ACTIVITY_KIND.NOTE,
                name: 'Buy tickets',
            })
        );
    });
});

describe('AddPlaceBtn — validation blocks an empty draft per kind', () => {
    beforeEach(resetAdded);

    const expectBlocked = async (tile: string) => {
        await openAdd();
        await pickTile(tile);
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        // Snackbar Alert surfaces the missing-field message; still on step 2.
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(
            screen.queryByText('Ready to add?')
        ).not.toBeInTheDocument();
    };

    it('flight: an empty segment cannot advance', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await expectBlocked('Flight');
    });

    it('hotel: no name or address cannot advance', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await expectBlocked('Hotel');
    });

    it('transit: no operator/number/station cannot advance', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await expectBlocked('Transport');
    });

    it('place: no name cannot advance', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await expectBlocked('Place');
    });
});

describe('AddPlaceBtn — place smart bare match backfills empty fields', () => {
    beforeEach(resetAdded);

    it('a name-only (no coords) result fills the name and the AI suggest backfills the location', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(PLACE_SMART_PH);
        await userEvent.type(box, 'secret garden cafe');

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockPlaceWatcherProps).onResult(
                rec({
                    name: 'Secret Garden Cafe',
                    city: '',
                    country: '',
                    latitude: null,
                    longitude: null,
                }),
                { query: 'secret garden cafe' },
                undefined
            );
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.PLACE,
                name: 'Secret Garden Cafe',
            })
        );
        // The AI suggest backfilled the location onto the previously empty draft.
        expect(mockSuggest).toHaveBeenCalled();
    });
});

describe('AddPlaceBtn — rental car custom', () => {
    beforeEach(resetAdded);

    it('fills the rental company and confirms with the derived rental name', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(screen.getByRole('tab', { name: 'Rental car' }));

        await userEvent.click(
            screen.getAllByRole('button', { expanded: false })[0]
        );
        fireEvent.change(document.getElementById('transitOperator-0')!, {
            target: { value: 'Hertz' },
        });

        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.RENTAL_CAR,
                name: 'Rental car Hertz',
            })
        );
    });
});

describe('AddPlaceBtn — edit a hotel check-out', () => {
    beforeEach(resetAdded);

    it('strips the check-out prefix on edit and re-derives it on save', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn
                type="edit"
                data={
                    {
                        id: 25,
                        kind: ACTIVITY_KIND.HOTEL_CHECKOUT,
                        name: 'Check out: Ritz',
                        startTime: '11:00',
                        hotelInfo: { confirmationNumber: 'D1' },
                    } as unknown as Activity
                }
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Save Activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 25,
                kind: ACTIVITY_KIND.HOTEL_CHECKOUT,
                name: 'Check out: Ritz',
                hotelInfo: { confirmationNumber: 'D1' },
            })
        );
    });
});

describe('AddPlaceBtn — transit smart-entry effect variants', () => {
    beforeEach(resetAdded);

    it('train: a detailed paste fills the segment via the parser and auto-advances', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        await userEvent.type(
            box,
            'Renfe 3152 Madrid to Barcelona 9am-12pm $100 seat 4A'
        );

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.TRAIN,
                name: expect.stringMatching(/Renfe/),
            })
        );
    });

    it('bus: toggling to bus in smart mode wraps the name with the bus prefix', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));
        await userEvent.click(screen.getByRole('tab', { name: 'Bus' }));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        await userEvent.type(box, 'FlixBus N1900 Berlin to Munich');

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.BUS })
        );
    });

    it('rental car: parses pickup/dropoff without firing the AI time suggest', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));
        await userEvent.click(screen.getByRole('tab', { name: 'Rental car' }));

        const box = await screen.findByPlaceholderText(
            'e.g. "Hertz pickup JFK 10am $50"'
        );
        await userEvent.type(
            box,
            'Hertz sedan pickup LAX dropoff JFK confirmation FL22'
        );

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.RENTAL_CAR })
        );
        // Rental cars skip the AI time/cost suggest.
        expect(mockSuggest).not.toHaveBeenCalled();
    });

    it('other (ride) smart: wraps the name with the ride prefix via the operator', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));
        await userEvent.click(screen.getByRole('tab', { name: 'Other' }));

        const box = await screen.findByPlaceholderText(
            'e.g. "Uber airport to hotel 10am $30"'
        );
        await userEvent.type(
            box,
            'ride with Uber company from airport to hotel 3pm-4pm'
        );

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.OTHER })
        );
    });

    it('unparseable text surfaces the could-not-parse warning', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        await userEvent.type(box, 'zzz qqq');

        expect(
            await screen.findByText(
                /Couldn't pick anything useful/,
                {},
                { timeout: 3000 }
            )
        ).toBeInTheDocument();
        expect(screen.queryByText('Ready to add?')).not.toBeInTheDocument();
    });
});

describe('AddPlaceBtn — flight smart searching + not-found', () => {
    beforeEach(resetAdded);

    it('shows the searching cue, then the not-found fallback that switches to custom', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(FLIGHT_SMART_PH);
        await userEvent.type(box, 'UA999');

        await waitFor(() =>
            expect(mockFlightWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            // false-when-absent + true-when-present exercise the no-op guards.
            last(mockFlightWatcherProps).onLoadingChange(false);
            last(mockFlightWatcherProps).onLoadingChange(true);
            last(mockFlightWatcherProps).onLoadingChange(true);
        });
        expect(await screen.findByText('Searching…')).toBeInTheDocument();

        await act(async () => {
            last(mockFlightWatcherProps).onLoadingChange(false);
            last(mockFlightWatcherProps).onNotFound('UA999');
        });
        await userEvent.click(
            await screen.findByRole('button', { name: 'Add manually' })
        );
        // Custom flight form is now visible (segment "Add stopover" affordance).
        expect(
            await screen.findByRole('button', { name: 'Add stopover' })
        ).toBeInTheDocument();
    });
});

describe('AddPlaceBtn — find-my-flight with sparse fields', () => {
    beforeEach(resetAdded);

    it('picks a departure that has null dates/times and no arrival-city image seed', async () => {
        mockNearestAirport = { iataCode: 'JFK', name: 'John F. Kennedy' };
        mockDepartures = [
            {
                flightNumber: 'DL5',
                airline: null,
                airlineIata: null,
                departAirport: 'JFK',
                departDate: null,
                departTime: null,
                arrivalAirport: 'BOS',
                arrivalAirportName: null,
                arrivalDate: null,
                arrivalTime: null,
                aircraft: null,
            },
        ];
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Find my flight'));
        await userEvent.click(screen.getByRole('button', { name: 'Search' }));
        await userEvent.click(
            await screen.findByRole('button', { name: /DL5/ })
        );
        await userEvent.click(
            await screen.findByRole('button', { name: 'Next' })
        );
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.FLIGHT })
        );
    });
});

describe('AddPlaceBtn — place smart with country scope', () => {
    beforeEach(resetAdded);

    it('an in-country match (comma-tail country) passes the same-country guard and resolves', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn onChange={onChange} countryScope="France" />
        );
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Smart search'));

        const box = screen.getByRole('textbox');
        await userEvent.type(box, 'eiffel tower');

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockPlaceWatcherProps).onResult(
                rec({ country: 'Paris, France', imageUrl: 'http://img/e.jpg' }),
                { query: 'eiffel tower' },
                undefined
            );
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.PLACE })
        );
    });
});

describe('AddPlaceBtn — more kind derivations', () => {
    beforeEach(resetAdded);

    it('hotel check-out: toggles the side and confirms with the check-out headline', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Hotel');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(screen.getByRole('tab', { name: 'Check-out' }));

        await userEvent.type(
            await screen.findByRole('combobox', { name: 'Hotel name' }),
            'Ritz'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.HOTEL_CHECKOUT,
                name: 'Check out: Ritz',
            })
        );
    });

    it('ride (Other): toggles to Other and derives the ride name', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(screen.getByRole('tab', { name: 'Other' }));

        await userEvent.click(
            screen.getAllByRole('button', { expanded: false })[0]
        );
        fireEvent.change(document.getElementById('transitOperator-0')!, {
            target: { value: 'Uber' },
        });
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.OTHER,
                name: 'Ride Uber',
            })
        );
    });

    it('flight custom: a single number with trailing noise collapses to the bare number', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Flight');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(
            screen.getAllByRole('button', { expanded: false })[0]
        );
        fireEvent.change(document.getElementById('flightNumber-0')!, {
            target: { value: 'UA123 with stopover' },
        });
        await waitFor(() =>
            expect(
                (document.getElementById('flightNumber-0') as HTMLInputElement)
                    .value
            ).toBe('UA123')
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.FLIGHT,
                name: 'UA123',
            })
        );
    });
});

describe('AddPlaceBtn — place smart from a pasted URL', () => {
    beforeEach(resetAdded);

    it('a URL entry resolves on name + link even without coordinates', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Smart search'));

        const box = screen.getByRole('textbox');
        await userEvent.type(box, 'https://maps.example/x');

        await waitFor(() =>
            expect(mockPlaceWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockPlaceWatcherProps).onResult(
                rec({
                    name: 'Hidden Bar',
                    latitude: null,
                    longitude: null,
                    imageUrl: 'http://img/x.jpg',
                }),
                { query: 'hidden bar' },
                undefined
            );
        });

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: ACTIVITY_KIND.PLACE,
                name: 'Hidden Bar',
                sourceUrl: 'https://maps.example/x',
            })
        );
    });
});

describe('AddPlaceBtn — edit a fully-populated place', () => {
    beforeEach(resetAdded);

    it('hydrates status + structured place block and saves preserving them', async () => {
        const onChange = vi.fn();
        renderInTrip(
            <AddPlaceBtn
                type="edit"
                data={
                    {
                        id: 26,
                        kind: ACTIVITY_KIND.PLACE,
                        name: 'Louvre',
                        location: 'Paris',
                        cost: '20',
                        note: 'art',
                        startTime: '10:00',
                        endTime: '12:00',
                        status: { value: 's1', label: 'Confirmed' },
                        image: { url: 'http://img/l.jpg', name: 'L' },
                        placeCity: 'Paris',
                        placeCountry: 'France',
                        countryCode: 'FR',
                        latitude: 48.86,
                        longitude: 2.34,
                    } as unknown as Activity
                }
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Save Activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 26,
                kind: ACTIVITY_KIND.PLACE,
                name: 'Louvre',
                placeCity: 'Paris',
                countryCode: 'FR',
            })
        );
    });
});

describe('AddPlaceBtn — review edit blocks an invalid draft', () => {
    beforeEach(resetAdded);

    it('clearing the name in the review edit sub-view blocks Save until refilled', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Place');
        await userEvent.click(screen.getByText('Custom'));

        const nameField = await screen.findByRole('combobox', {
            name: 'Activity name',
        });
        await userEvent.type(nameField, 'Louvre');
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        const editName = await screen.findByRole('combobox', {
            name: 'Activity name',
        });
        await userEvent.clear(editName);
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        // Blocked: the Snackbar error shows and we're still on the edit form.
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(screen.queryByText('Ready to add?')).not.toBeInTheDocument();

        await userEvent.type(
            screen.getByRole('combobox', { name: 'Activity name' }),
            'Louvre'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
    });
});

describe('AddPlaceBtn — more suggest + status coverage', () => {
    beforeEach(resetAdded);

    it('train smart without times lets the AI suggest backfill the segment times', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} defaultDate="2026-06-15" />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        // No time tokens → the segment keeps the 00:00 placeholder, so the
        // suggest's departTime/arrivalTime actually apply.
        await userEvent.type(box, 'Amtrak 100 Boston to New York on 6/15/2026');

        expect(
            await screen.findByText('Ready to add?', {}, { timeout: 3000 })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.TRAIN })
        );
        expect(mockSuggest).toHaveBeenCalled();
    });

    it('transit smart shows the searching cue then the not-found fallback to custom', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await openAdd();
        await pickTile('Transport');
        await userEvent.click(screen.getByText('Smart search'));

        const box = await screen.findByPlaceholderText(TRANSIT_SMART_PH);
        // Operator only (no number / stations) → never resolves on its own.
        await userEvent.type(box, 'Amtrak');

        await waitFor(() =>
            expect(mockTransitWatcherProps.length).toBeGreaterThan(0)
        );
        await act(async () => {
            last(mockTransitWatcherProps).onLoadingChange(false);
            last(mockTransitWatcherProps).onLoadingChange(true);
            last(mockTransitWatcherProps).onLoadingChange(true);
        });
        expect(await screen.findByText('Searching…')).toBeInTheDocument();

        await act(async () => {
            last(mockTransitWatcherProps).onLoadingChange(false);
            last(mockTransitWatcherProps).onNotFound('Amtrak');
        });
        await userEvent.click(
            await screen.findByRole('button', { name: 'Add manually' })
        );
        expect(
            await screen.findByRole('button', { name: 'Add leg (transfer)' })
        ).toBeInTheDocument();
    });

    it('hotel check-out with an address but no name uses the generic check-out headline', async () => {
        const onChange = vi.fn();
        renderInTrip(<AddPlaceBtn onChange={onChange} />);
        await openAdd();
        await pickTile('Hotel');
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(screen.getByRole('tab', { name: 'Check-out' }));

        await userEvent.type(
            screen.getByRole('textbox', { name: 'Address (optional)' }),
            '5 Rue de Rivoli'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(await screen.findByText('Ready to add?')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Add activity' })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ kind: ACTIVITY_KIND.HOTEL_CHECKOUT })
        );
    });
});

describe('AddPlaceBtn — modal close resets the wizard', () => {
    beforeEach(resetAdded);

    it('closing mid-wizard returns to the type step on reopen', async () => {
        renderInTrip(<AddPlaceBtn onChange={vi.fn()} />);
        await openAdd();
        await pickTile('Flight');
        // On step 2 (method chooser) now.
        expect(screen.getByText('How would you like to add it?')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await openAdd();
        expect(
            await screen.findByText('What would you like to add?')
        ).toBeInTheDocument();
    });
});
