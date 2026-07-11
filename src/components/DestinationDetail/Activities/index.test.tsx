import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, Destination } from 'types';

// ---- data hooks / context ------------------------------------------------
let mockNow: Date;
vi.mock('hooks/useNow', () => ({ useNow: () => mockNow }));

let mockAirportCities: Record<string, string | undefined>;
vi.mock('api/hooks/useAirportCity', () => ({
    useAirportCity: (code?: string) => ({
        data: code ? mockAirportCities[code] : undefined,
    }),
}));

let mockStatuses: any[];
vi.mock('api/hooks/useLookups', () => ({
    useTripStatuses: () => ({ data: mockStatuses }),
}));

vi.mock('api/suggestionsPrefetch', () => ({
    prefetchActivitySuggestions: vi.fn(),
    prefetchSuggestions: vi.fn(),
}));

let mockTripState: any;
vi.mock('context/TripContext', () => ({
    useTripState: () => mockTripState,
}));

// ---- heavy children ------------------------------------------------------
const mockAddPlaceProps: any[] = [];
vi.mock('components/common/AddPlaceBtn', () => ({
    default: (props: any) => {
        mockAddPlaceProps.push(props);
        if (props.isViewMode) return null;
        const isEdit = props.type === 'edit';
        const label = isEdit
            ? `edit-activity-${props.data?.id}`
            : 'add-activity';
        return (
            <button
                type="button"
                aria-label={label}
                onClick={() =>
                    props.onChange({
                        id: props.data?.id ?? 0,
                        name: 'Changed',
                        kind: ACTIVITY_KIND.PLACE,
                    })
                }
            >
                {label}
            </button>
        );
    },
}));

vi.mock('components/common/AddPlaceBtn/pickSmartEntryLocation', () => ({
    pickSmartEntryLocation: (args: any) =>
        args.excludeActivityId === 555 ? 'Hotel Origin' : undefined,
}));

vi.mock('components/DestinationDetail/ImageBlock', () => ({
    default: () => <div data-testid="image-block" />,
}));

vi.mock('components/DestinationDetail/AddBudget', () => ({
    default: (props: any) =>
        props.isViewMode ? null : (
            <button
                type="button"
                data-testid="add-budget"
                onClick={() =>
                    props.onSubmit([{ user: { id: 1, label: 'Ana' }, budget: '10' }])
                }
            >
                add-budget
            </button>
        ),
}));

vi.mock('components/DestinationDetail/Activities/DraggableActivity', () => ({
    default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('components/common/AirlineLogo', () => ({
    default: (props: any) => <span data-testid="airline-logo">{props.label}</span>,
}));

const mockMarkPaidProps: any[] = [];
const mockMarkPaidOpen = vi.fn();
vi.mock('components/MarkPaidModal', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    return {
        default: forwardRef((props: any, ref: any) => {
            mockMarkPaidProps.push(props);
            useImperativeHandle(ref, () => ({ open: mockMarkPaidOpen }));
            return null;
        }),
    };
});

vi.mock('components/NotifyParticipantsButton', () => ({
    default: () => <div data-testid="notify-participants" />,
}));
vi.mock('components/ActivityFavoriteButton', () => ({
    default: () => <div data-testid="favorite-btn" />,
}));
vi.mock('components/ActivityInlineReview', () => ({
    default: () => <div data-testid="inline-review" />,
}));
vi.mock('components/FriendsVisitedBadge', () => ({
    default: () => <div data-testid="friends-visited" />,
}));

vi.mock('components/common/IconConfirmButton', () => ({
    default: (props: any) =>
        props.isViewMode ? null : (
            <button
                type="button"
                aria-label={props.ariaLabel}
                onClick={props.onConfirm}
            >
                delete
            </button>
        ),
}));

import Activities from './index';

// ---- fixtures ------------------------------------------------------------
const DATE = '2026-08-01';

const place = (over: Partial<Activity> = {}): Activity =>
    ({
        id: 100,
        apiId: 'a-100',
        name: 'Museum',
        kind: ACTIVITY_KIND.PLACE,
        placeCity: 'Paris',
        placeCountry: 'France',
        startTime: '15:00',
        endTime: '16:00',
        cost: 20,
        ...over,
    }) as unknown as Activity;

const participants = [
    { id: 1, userId: 'u1', label: 'Ana', name: 'Ana' },
    { id: 2, userId: 'u2', label: 'Bob', name: 'Bob' },
] as any;

const renderActivities = (props: Partial<React.ComponentProps<typeof Activities>> = {}) =>
    renderWithProviders(
        <Activities
            onChangePlace={props.onChangePlace ?? vi.fn()}
            onChangeBudget={props.onChangeBudget ?? vi.fn()}
            activities={props.activities ?? []}
            participants={props.participants ?? participants}
            date={props.date ?? DATE}
            country={props.country ?? 'France'}
            {...props}
        />,
        { route: '/trip-detail?id=t1' }
    );

beforeEach(() => {
    mockNow = new Date('2026-08-01T12:00:00');
    mockAirportCities = { BOS: 'Boston', LAX: 'Los Angeles' };
    mockStatuses = [
        { id: 'st-plan', name: 'Planning' },
        { id: 'st-conf', name: 'Confirmed' },
        { id: 'st-comp', name: 'Completed' },
    ];
    mockTripState = { destinations: [] };
    mockAddPlaceProps.length = 0;
    mockMarkPaidProps.length = 0;
    mockMarkPaidOpen.mockReset();
});

describe('Activities — empty day', () => {
    it('shows the drop hint and the Add-Activity affordance when empty', () => {
        renderActivities({ activities: [] });
        expect(
            screen.getByText('Drop a place here, or add one below.')
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'add-activity' })
        ).toBeInTheDocument();
    });

    it('hides the drop hint and the add button in view mode', () => {
        renderActivities({ activities: [], isViewMode: true });
        expect(
            screen.queryByText('Drop a place here, or add one below.')
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'add-activity' })
        ).not.toBeInTheDocument();
    });
});

describe('Activities — place card (Planning)', () => {
    it('renders the title link, location, cost, budget chips, and image', () => {
        renderActivities({
            activities: [
                place({
                    budget: [{ id: 9, user: { id: 1, label: 'Ana' }, budget: '10' }],
                    image: { url: 'http://img/x.jpg', name: 'x' },
                }),
            ],
            tripStatusName: 'Planning',
        });
        const link = screen.getByRole('link', { name: /Museum/ });
        expect(link).toHaveAttribute(
            'href',
            expect.stringContaining('/place?q=Museum')
        );
        expect(screen.getByText('Paris, France')).toBeInTheDocument();
        expect(screen.getByTestId('image-block')).toBeInTheDocument();
        // Budget chip name + a directions affordance.
        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /directions|google maps/i })
        ).toBeInTheDocument();
    });

    it('deletes an activity through the confirm button', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [place()],
            tripStatusName: 'Planning',
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Museum' })
        );
        expect(onChangePlace).toHaveBeenCalledWith('delete', 100);
    });

    it('edits an activity through the edit trigger', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [place()],
            tripStatusName: 'Planning',
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'edit-activity-100' })
        );
        expect(onChangePlace).toHaveBeenCalledWith('edit', {
            index: 0,
            value: expect.objectContaining({ id: 100, name: 'Changed' }),
        });
    });

    it('adds a budget split through AddBudget', async () => {
        const onChangeBudget = vi.fn();
        renderActivities({
            activities: [place()],
            tripStatusName: 'Planning',
            onChangeBudget,
        });
        await userEvent.click(screen.getByTestId('add-budget'));
        expect(onChangeBudget).toHaveBeenCalledWith('add', {
            activityId: 100,
            value: [{ user: { id: 1, label: 'Ana' }, budget: '10' }],
        });
    });

    it('adds a new activity via the bottom Add-Activity button', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [place()],
            tripStatusName: 'Planning',
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'add-activity' })
        );
        expect(onChangePlace).toHaveBeenCalledWith(
            'add',
            expect.objectContaining({ name: 'Changed' })
        );
    });
});

describe('Activities — status pill (Planning)', () => {
    it('toggles a Planning activity to Confirmed', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [place({ startTime: '15:00', endTime: '16:00' })],
            tripStatusName: 'Planning',
            allowStatusToggle: true,
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: /Status: Planning/i })
        );
        expect(onChangePlace).toHaveBeenCalledWith('edit', {
            index: 0,
            value: expect.objectContaining({
                status: expect.objectContaining({ name: 'Confirmed' }),
            }),
        });
    });

    it('reads as "Past due" for an elapsed, still-unconfirmed activity', () => {
        renderActivities({
            activities: [place({ startTime: '08:00', endTime: '09:00' })],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText('Past due')).toBeInTheDocument();
    });

    it('disables the pill while a status save is in flight', () => {
        renderActivities({
            activities: [place()],
            tripStatusName: 'Planning',
            isAutoSaving: true,
        });
        expect(
            screen.getByRole('button', { name: /Status: Planning/i })
        ).toBeDisabled();
    });
});

describe('Activities — Confirmed trip', () => {
    it('offers a Complete tick and marks an activity completed', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            // upcoming so the auto-complete effect does not fire
            activities: [place({ startTime: '15:00', endTime: '16:00' })],
            tripStatusName: 'Confirmed',
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: /Mark Museum as completed/i })
        );
        expect(onChangePlace).toHaveBeenCalledWith('edit', {
            index: 0,
            value: expect.objectContaining({
                status: expect.objectContaining({ name: 'Completed' }),
            }),
        });
    });

    it('auto-completes a past-due activity on a Confirmed trip', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [place({ startTime: '08:00', endTime: '09:00' })],
            tripStatusName: 'Confirmed',
            onChangePlace,
        });
        await waitFor(() =>
            expect(onChangePlace).toHaveBeenCalledWith(
                'edit',
                expect.objectContaining({
                    value: expect.objectContaining({
                        status: expect.objectContaining({ name: 'Completed' }),
                    }),
                })
            )
        );
    });

    it('reverts a completed activity back to Confirmed via the checked tick', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [
                place({
                    startTime: '15:00',
                    endTime: '16:00',
                    status: { id: 'st-comp', name: 'Completed' } as any,
                }),
            ],
            tripStatusName: 'Confirmed',
            onChangePlace,
        });
        await userEvent.click(
            screen.getByRole('button', { name: /Uncheck Museum/i })
        );
        expect(onChangePlace).toHaveBeenCalledWith('edit', {
            index: 0,
            value: expect.objectContaining({
                status: expect.objectContaining({ name: 'Confirmed' }),
            }),
        });
    });

    it('locks the tick on a completed activity whose time has already passed', () => {
        renderActivities({
            activities: [
                place({
                    startTime: '08:00',
                    endTime: '09:00',
                    status: { id: 'st-comp', name: 'Completed' } as any,
                }),
            ],
            tripStatusName: 'Confirmed',
        });
        expect(
            screen.getByRole('button', { name: /is locked — its time has passed/i })
        ).toBeDisabled();
    });

    it('shows the favorite button for a place on a Confirmed trip', () => {
        renderActivities({
            activities: [place({ startTime: '15:00', endTime: '16:00' })],
            tripStatusName: 'Confirmed',
        });
        expect(screen.getByTestId('favorite-btn')).toBeInTheDocument();
        // Not yet visited → no inline review for an upcoming activity.
        expect(screen.queryByTestId('inline-review')).not.toBeInTheDocument();
    });

    it('mounts the per-activity notify button for organizers on a confirmed activity', () => {
        renderActivities({
            activities: [
                place({
                    startTime: '15:00',
                    endTime: '16:00',
                    status: { id: 'st-conf', name: 'Confirmed' } as any,
                }),
            ],
            tripStatusName: 'Confirmed',
            allowPaidEdits: true,
        });
        expect(screen.getByTestId('notify-participants')).toBeInTheDocument();
    });
});

describe('Activities — Completed trip', () => {
    it('shows favorite + inline review for a place on a completed trip', () => {
        renderActivities({
            activities: [place()],
            tripStatusName: 'Completed',
        });
        expect(screen.getByTestId('favorite-btn')).toBeInTheDocument();
        expect(screen.getByTestId('inline-review')).toBeInTheDocument();
    });
});

describe('Activities — paid-by row', () => {
    it('renders the paid chip + edit pencil and forwards submit / clear', async () => {
        const onChangePlace = vi.fn();
        renderActivities({
            activities: [
                place({
                    paidAt: '2026-08-02',
                    paidBy: { id: 'u1', name: 'Ana' } as any,
                    budget: [{ id: 3, user: { id: 1, label: 'Ana' }, budget: '20' }],
                }),
            ],
            tripStatusName: 'Planning',
            onChangePlace,
        });
        expect(screen.getByText('Paid by Ana')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit payment' })
        );
        expect(mockMarkPaidOpen).toHaveBeenCalled();

        const submit = mockMarkPaidProps[mockMarkPaidProps.length - 1].onSubmit;
        submit({ paidAt: '2026-08-03', paidBy: { id: 'u1', name: 'Ana' } });
        expect(onChangePlace).toHaveBeenCalledWith(
            'edit',
            expect.objectContaining({
                value: expect.objectContaining({ paidAt: '2026-08-03' }),
            })
        );

        const clear = mockMarkPaidProps[mockMarkPaidProps.length - 1].onClear;
        clear();
        expect(onChangePlace).toHaveBeenCalledWith(
            'edit',
            expect.objectContaining({
                value: expect.objectContaining({ paidAt: null, paidBy: null }),
            })
        );
    });

    it('formats a two-payer chip label from the budget split', () => {
        renderActivities({
            activities: [
                place({
                    paidAt: '2026-08-02',
                    budget: [
                        { id: 3, user: { id: 1, label: 'Ana' }, budget: '10' },
                        { id: 4, user: { id: 2, label: 'Bob' }, budget: '10' },
                    ],
                }),
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText('Paid by Ana & Bob')).toBeInTheDocument();
    });

    it('formats a many-payer chip label', () => {
        renderActivities({
            activities: [
                place({
                    paidAt: '2026-08-02',
                    budget: [
                        { id: 3, user: { id: 1, label: 'Ana' }, budget: '10' },
                        { id: 4, user: { id: 2, label: 'Bob' }, budget: '10' },
                        { id: 5, user: { id: 3, label: 'Cy' }, budget: '10' },
                    ],
                }),
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText('Paid by Ana + 2 others')).toBeInTheDocument();
    });

    it('offers the "Mark as paid" pill for an unpaid activity with cost', () => {
        renderActivities({
            activities: [place({ cost: 30 })],
            tripStatusName: 'Planning',
        });
        expect(
            screen.getByRole('button', { name: /mark as paid/i })
        ).toBeInTheDocument();
    });

    it('hides the paid affordance for a read-only viewer on an unpaid activity', () => {
        renderActivities({
            activities: [place({ cost: 30 })],
            isViewMode: true,
        });
        expect(
            screen.queryByRole('button', { name: /mark as paid/i })
        ).not.toBeInTheDocument();
    });
});

describe('Activities — non-place kinds', () => {
    it('renders a flight with the airline logo, route, and depart→arrive time', () => {
        renderActivities({
            activities: [
                {
                    id: 300,
                    name: 'JFK → LAX',
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [
                        {
                            flightNumber: 'UA1',
                            departAirport: 'JFK',
                            arrivalAirport: 'LAX',
                            departTime: '10:00',
                            arrivalTime: '13:00',
                        },
                    ],
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getAllByTestId('airline-logo').length).toBeGreaterThan(0);
        expect(screen.getByText(/Flight UA1/)).toBeInTheDocument();
        expect(screen.getByText('10:00 AM → 1:00 PM')).toBeInTheDocument();
    });

    it('renders a hotel check-in with a Google Maps title link and single time', () => {
        renderActivities({
            activities: [
                {
                    id: 301,
                    name: 'Ritz',
                    kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                    location: 'Plaza 5',
                    startTime: '15:00',
                    latitude: 48.8,
                    longitude: 2.3,
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        const link = screen.getByRole('link', { name: /Ritz/ });
        expect(link).toHaveAttribute(
            'href',
            expect.stringContaining('google.com/maps')
        );
        expect(screen.getByText('3:00 PM')).toBeInTheDocument();
    });

    it('renders a train with a depart→arrive time from its segments', () => {
        renderActivities({
            activities: [
                {
                    id: 302,
                    name: 'Renfe',
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [
                        { departTime: '09:00', arrivalTime: '12:00' },
                    ],
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText('9:00 AM → 12:00 PM')).toBeInTheDocument();
    });

    it('renders a note row and no time row for a note', () => {
        renderActivities({
            activities: [
                {
                    id: 303,
                    name: 'Reminder',
                    kind: ACTIVITY_KIND.NOTE,
                    note: 'Buy museum tickets',
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText('Buy museum tickets')).toBeInTheDocument();
    });

    it('shows a source link for a place carrying a sourceUrl', () => {
        renderActivities({
            activities: [place({ sourceUrl: 'https://tripadvisor.com/x' })],
            tripStatusName: 'Planning',
        });
        expect(
            screen.getByRole('link', { name: 'View source' })
        ).toHaveAttribute('href', 'https://tripadvisor.com/x');
    });

    it('flags a reservation that needs rescheduling after a date shift', () => {
        renderActivities({
            activities: [
                {
                    id: 304,
                    name: 'Flight',
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [
                        {
                            flightNumber: 'UA9',
                            departAirport: 'JFK',
                            arrivalAirport: 'LAX',
                            departDate: '2026-07-04',
                        },
                    ],
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        expect(screen.getByText(/Needs rescheduling/i)).toBeInTheDocument();
    });
});

describe('Activities — live timing + ordering', () => {
    it('renders the "happening now" progress stripe for a current activity', () => {
        renderActivities({
            activities: [place({ startTime: '11:00', endTime: '13:00' })],
            tripStatusName: 'Confirmed',
        });
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('sorts timed activities chronologically while notes keep their slot', () => {
        renderActivities({
            activities: [
                place({ id: 1, name: 'Later', startTime: '18:00', endTime: '19:00' }),
                {
                    id: 2,
                    name: 'A Note',
                    kind: ACTIVITY_KIND.NOTE,
                    note: 'note',
                } as unknown as Activity,
                place({ id: 3, name: 'Earlier', startTime: '09:00', endTime: '10:00' }),
            ],
            tripStatusName: 'Planning',
        });
        const titles = screen
            .getAllByText(/Later|Earlier|A Note/)
            .map((el) => el.textContent);
        // Earlier (09:00) sorts before Later (18:00); the note holds slot 2.
        expect(titles.indexOf('Earlier')).toBeLessThan(titles.indexOf('Later'));
    });
});

describe('Activities — smart-entry origin + scope', () => {
    it('threads a resolved directions origin into the maps link', () => {
        const destinations: Destination[] = [
            {
                id: 1,
                country: { id: 1, name: 'France' },
                startDate: DATE,
                endDate: DATE,
                itinerary: [{ id: 9, date: DATE, activities: [] }],
            },
        ] as unknown as Destination[];
        renderActivities({
            activities: [place({ id: 555, location: 'Louvre' })],
            destinations,
            tripStatusName: 'Planning',
        });
        // pickSmartEntryLocation mock returns an origin for id 555 → "get directions".
        const dir = screen.getByRole('link', {
            name: /Get directions on Google Maps/i,
        });
        expect(dir).toHaveAttribute(
            'href',
            expect.stringContaining('origin=Hotel%20Origin')
        );
    });

    it('scopes Add-Activity suggestions to an onward flight arrival city', () => {
        renderActivities({
            activities: [
                place({ id: 400 }),
                {
                    id: 401,
                    name: 'Onward',
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [
                        { departAirport: 'JFK', arrivalAirport: 'LAX' },
                    ],
                } as unknown as Activity,
            ],
            tripStatusName: 'Planning',
        });
        // The bottom Add-Activity button received the resolved onward city scope.
        const addProps = mockAddPlaceProps.find((p) => p.type === undefined);
        expect(addProps.cityScope).toBe('Los Angeles');
    });
});
