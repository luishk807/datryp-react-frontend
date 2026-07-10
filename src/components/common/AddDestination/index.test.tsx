import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import { ACTION } from 'constants';
import type { Destination } from 'types';
import type { PlaceResult } from 'api/hooks/usePlaces';
import AddDestinationBtn from './index';

// The trigger's nearest-airport seed reads the signed-in user; stub it to a
// signed-out state so the query stays disabled (no network on modal open).
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: null, isAdmin: false }),
}));

// The wizard's async enrichment (country derivation, flight/transit lookups)
// would hit the network on the deeper steps — MSW's onUnhandledRequest:'error'
// fails those. Stub the data hooks + lookup watchers so navigation is offline,
// and stub SearchBar to a button that returns a picked place.
let mockCountryMatches:
    | Array<{
          id: number;
          name: string;
          code: string;
          local: string | null;
          image: string | null;
      }>
    | undefined;
let mockPlace: PlaceResult;

vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({ data: mockCountryMatches }),
}));
vi.mock('api/hooks/useAirports', () => ({
    useAirports: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('api/hooks/useDestinationAirport', () => ({
    useDestinationAirport: () => ({ data: undefined }),
}));
vi.mock('components/common/AddPlaceBtn/FlightSegmentLookupWatcher', () => ({
    default: () => null,
}));
vi.mock('components/common/AddPlaceBtn/TransitSegmentLookupWatcher', () => ({
    default: () => null,
}));
vi.mock('components/SearchBar', () => ({
    default: ({
        onPlaceSelected,
    }: {
        onPlaceSelected: (p: PlaceResult) => void;
    }) => (
        <button type="button" onClick={() => onPlaceSelected(mockPlace)}>
            stub-pick-place
        </button>
    ),
}));

// The "Find my flight" departures search fires a live query on mount; stub it
// to a button that returns a chosen departure.
vi.mock('components/common/AddPlaceBtn/FlightDeparturesSearch', () => ({
    default: ({ onPick }: { onPick: (i: Record<string, string>) => void }) => (
        <button
            type="button"
            onClick={() =>
                onPick({
                    flightNumber: 'UA1',
                    departAirport: 'EWR',
                    arrivalAirport: 'PTY',
                    departDate: '2026-06-06',
                    departTime: '10:00',
                    arrivalDate: '2026-06-06',
                    arrivalTime: '14:00',
                })
            }
        >
            stub-flight-pick
        </button>
    ),
}));

beforeEach(() => {
    mockCountryMatches = [
        { id: 10, name: 'Panama', code: 'PA', local: null, image: null },
    ];
    mockPlace = {
        id: 'country:panama',
        kind: 'country',
        name: 'Panama',
        countryCode: 'PA',
        countryName: 'Panama',
        population: null,
        latitude: null,
        longitude: null,
    };
});

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

const open = async () =>
    userEvent.click(screen.getByRole('button', { name: 'Add Destination' }));

describe('AddDestinationBtn — wizard flows', () => {
    it('walks type → method → describe → confirm and saves a full flight destination', async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <AddDestinationBtn onChange={onChange} lastArrivalAirport="JFK" />
        );
        await open();

        // Type → Method.
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        // Method → Describe (Custom opens the fields directly). The method tiles
        // use role="listitem", so target the tile by its label text.
        await userEvent.click(screen.getByText('Custom'));
        expect(
            await screen.findByRole('heading', { name: 'Describe your Flight' })
        ).toBeInTheDocument();

        // Describe → Confirm.
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue' })
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();

        // No country yet → the fallback picker resolves one via the stub.
        await userEvent.click(
            screen.getByRole('button', { name: 'stub-pick-place' })
        );
        await waitFor(() => expect(screen.getByText('Panama')).toBeInTheDocument());

        // The footer "Add Destination" (last of the two same-named buttons —
        // the other is the modal trigger) commits the destination.
        await waitFor(() => {
            const btns = screen.getAllByRole('button', {
                name: 'Add Destination',
            });
            expect(btns[btns.length - 1]).toBeEnabled();
        });
        const commit = screen.getAllByRole('button', {
            name: 'Add Destination',
        });
        await userEvent.click(commit[commit.length - 1]);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                country: expect.objectContaining({ name: 'Panama' }),
                flightInfo: expect.objectContaining({ segments: expect.any(Array) }),
            })
        );
    });

    it('navigates back from the method step to the type picker', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Train/ }));
        // Method step is up (Back present, tiles gone).
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
    });

    it('opens the destination-only describe step for "I\'ll add later"', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /add later/ }));
        expect(
            await screen.findByRole('heading', { name: 'Where are you going?' })
        ).toBeInTheDocument();
        // Back from the no-kind describe step returns to the type picker.
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
    });

    it('returns to the type picker via the no-kind describe "Change" link', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /add later/ }));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Change' })
        );
        expect(
            screen.getByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
    });

    it('re-picks the same kind and switches kinds without leaking state', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        // Re-pick Flight (same kind → keeps its seeded segment).
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        // Switch to Train (kind change → transit segment seeded).
        await userEvent.click(screen.getByRole('tab', { name: /Train/ }));
        expect(
            await screen.findByRole('heading', {
                name: 'How would you like to add it?',
            })
        ).toBeInTheDocument();
    });

    it('resets transient state when the modal is dismissed (add)', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        // Dismiss via the header close button.
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        // Re-opening starts clean on the type picker.
        await open();
        expect(
            await screen.findByRole('tablist', { name: 'Transport type' })
        ).toBeInTheDocument();
    });

    it('re-seeds the saved destination when an edit modal is dismissed', async () => {
        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={editData}
                onChange={vi.fn()}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        // Re-opening the edit modal restores the save screen.
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(
            await screen.findByRole('button', { name: 'Save Destination' })
        ).toBeInTheDocument();
    });

    it('smart-submits a flight entry straight to the confirm step', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.type(
            screen.getByRole('textbox'),
            'Copa CM123 June 6'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Detect and continue' })
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();
    });

    it('smart-submits a train entry and shows the Train mode on confirm', async () => {
        mockCountryMatches = undefined; // leave the country unresolved
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.type(
            screen.getByRole('textbox'),
            'Renfe 3152 Madrid to Barcelona'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Detect and continue' })
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Train')).toBeInTheDocument();
    });

    it('seeds edit mode from a saved flight and strips the legacy arrival card on save', async () => {
        const onChange = vi.fn();
        const editFlight = {
            id: 7,
            country: { id: 2, name: 'Panama' },
            flightInfo: {
                segments: [
                    {
                        flightNumber: 'CM123',
                        departAirport: 'EWR',
                        arrivalAirport: 'PTY',
                        departDate: '2026-06-06',
                        arrivalDate: '2026-06-06',
                    },
                ],
                cost: 200,
            },
            itinerary: [
                {
                    activities: [{ kind: 'flight', name: 'Flight to PTY' }],
                },
            ],
        } as unknown as Destination;

        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={editFlight}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Destination' })
        );

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 7,
                country: expect.objectContaining({ name: 'Panama' }),
            })
        );
        const arg = onChange.mock.calls[0][0];
        // The legacy day-1 "Flight to …" activity is dropped (arrival now lives
        // on the header flightInfo, not as a duplicate card).
        expect(arg.itinerary[0].activities).toEqual([]);
        expect(arg.flightInfo.segments[0].flightNumber).toBe('CM123');
    });

    it('routes the flight "Find my flight" method through the departures search', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        await userEvent.click(screen.getByText('Find my flight'));
        // The departures search takes the describe slot (stubbed).
        await userEvent.click(
            await screen.findByRole('button', { name: 'stub-flight-pick' })
        );
        // Picking a flight lands directly on the confirm step.
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();
    });

    it('jumps back to the method step via the describe "Change" link', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Flight/ }));
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(screen.getByRole('button', { name: 'Change' }));
        expect(
            await screen.findByRole('heading', {
                name: 'How would you like to add it?',
            })
        ).toBeInTheDocument();
    });

    it('saves a ground (train) destination with a mode-tagged arrival', async () => {
        const onChange = vi.fn();
        renderWithProviders(<AddDestinationBtn onChange={onChange} />);
        await open();
        await userEvent.click(screen.getByRole('tab', { name: /Train/ }));
        await userEvent.click(screen.getByText('Custom'));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Continue' })
        );
        await userEvent.click(
            await screen.findByRole('button', { name: 'stub-pick-place' })
        );
        await waitFor(() => {
            const btns = screen.getAllByRole('button', {
                name: 'Add Destination',
            });
            expect(btns[btns.length - 1]).toBeEnabled();
        });
        const commit = screen.getAllByRole('button', {
            name: 'Add Destination',
        });
        await userEvent.click(commit[commit.length - 1]);

        const arg = onChange.mock.calls[0][0];
        expect(arg.flightInfo.mode).toBe('train');
    });

    it('seeds edit mode from a saved train and strips the legacy transit card', async () => {
        const onChange = vi.fn();
        const editTrain = {
            id: 9,
            country: { id: 3, name: 'Spain' },
            flightInfo: {
                mode: 'train',
                segments: [
                    {
                        departAirport: 'MAD',
                        arrivalAirport: 'BCN',
                        flightNumber: '3152',
                        carrier: 'Renfe',
                        departDate: '2026-06-06',
                        arrivalDate: '2026-06-06',
                    },
                ],
                cost: 30,
            },
            itinerary: [
                { activities: [{ kind: 'train', name: 'Train to BCN' }] },
            ],
        } as unknown as Destination;

        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={editTrain}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Destination' })
        );

        const arg = onChange.mock.calls[0][0];
        expect(arg.id).toBe(9);
        expect(arg.flightInfo.mode).toBe('train');
        expect(arg.itinerary[0].activities).toEqual([]);
    });

    it('detects a bus from smart text', async () => {
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.type(
            screen.getByRole('textbox'),
            'FlixBus Madrid to Sevilla $30'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Detect and continue' })
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Bus')).toBeInTheDocument();
    });

    it('seeds edit mode from a legacy day-1 flight activity', async () => {
        const onChange = vi.fn();
        const legacy = {
            id: 11,
            country: { id: 4, name: 'Japan' },
            // Header flightInfo carries only a bare stub (no populated segments).
            flightInfo: { arrivalAirport: 'NRT' },
            itinerary: [
                {
                    activities: [
                        {
                            kind: 'flight',
                            name: 'Flight to NRT',
                            cost: 500,
                            flightSegments: [
                                {
                                    flightNumber: 'NH110',
                                    departAirport: 'EWR',
                                    arrivalAirport: 'NRT',
                                    departDate: '2026-06-06',
                                    arrivalDate: '2026-06-07',
                                },
                            ],
                        },
                    ],
                },
            ],
        } as unknown as Destination;

        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={legacy}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Destination' })
        );
        const arg = onChange.mock.calls[0][0];
        expect(arg.flightInfo.segments[0].flightNumber).toBe('NH110');
    });

    it('seeds edit mode from a flat flightInfo (no segments array)', async () => {
        const onChange = vi.fn();
        const flat = {
            id: 12,
            country: { id: 5, name: 'France' },
            flightInfo: {
                flightNumber: 'AF11',
                departAirport: 'JFK',
                arrivalAirport: 'CDG',
                departDate: '2026-06-06',
                arrivalDate: '2026-06-07',
                cost: 800,
            },
            itinerary: [],
        } as unknown as Destination;

        renderWithProviders(
            <AddDestinationBtn
                type={ACTION.EDIT}
                data={flat}
                onChange={onChange}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Destination' })
        );
        const arg = onChange.mock.calls[0][0];
        expect(arg.flightInfo.segments[0].flightNumber).toBe('AF11');
    });

    it('detects a rental car from smart text', async () => {
        mockCountryMatches = undefined;
        renderWithProviders(<AddDestinationBtn onChange={vi.fn()} />);
        await open();
        await userEvent.type(
            screen.getByRole('textbox'),
            'Hertz rental car pickup PTY'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Detect and continue' })
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Confirm your destination',
            })
        ).toBeInTheDocument();
        expect(screen.getByText('Rental Car')).toBeInTheDocument();
    });
});
