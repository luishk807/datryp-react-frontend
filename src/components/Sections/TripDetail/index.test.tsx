import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
    act,
} from '../../../test/renderWithProviders';

// TripDetail orchestrates ~20 heavy child sections + a dozen data hooks. We
// exercise only the page's own logic (lifecycle branches, callbacks, the
// header action cluster), so every heavy child is stubbed — `capture`d ones
// record their props so the test can drive their callbacks; `pass`/`captureRef`
// keep refs/children clean. `Menu`, `ModalButton`, `ButtonCustom` and the MUI
// `Dialog` are left REAL so the header menu / confirm / export flows are driven
// through the actual DOM. The data hooks + adapters are mocked so no request
// fires (MSW is `onUnhandledRequest: 'error'`).
const mockShared = vi.hoisted(() => {
    const mockCaptured: Record<string, any> = {};
    const pass = () => ({ default: (props: any) => props.children ?? null });
    const capture = (key: string) => ({
        default: (props: any) => {
            mockCaptured[key] = props;
            return null;
        },
    });
    const captureRefMock = (key: string) => async () => {
        const { forwardRef } = await import('react');
        return {
            default: forwardRef((props: any, _ref: any) => {
                mockCaptured[key] = props;
                return null;
            }),
        };
    };
    return { mockCaptured, pass, capture, captureRefMock };
});
const captured = mockShared.mockCaptured;

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('components/common/Layout/SubLayout', mockShared.pass);
vi.mock('components/common/PageLoader', () => ({
    default: (props: any) => props.label ?? null,
}));
vi.mock('components/BudgetSummary', mockShared.pass);
vi.mock('components/BasicTripInfo', mockShared.pass);
vi.mock('components/TripSuggestionsCard', mockShared.pass);
vi.mock('components/TripCheckupCard', mockShared.pass);
vi.mock('components/TripCompletionSummary', mockShared.pass);
vi.mock('components/TripAtlasConfirmation', mockShared.pass);
vi.mock('components/TripRecapCard', mockShared.pass);
vi.mock('components/TripNote', mockShared.pass);

vi.mock('components/DestinationDetail', () => mockShared.capture('dest'));
vi.mock('components/PlanningBox', () => mockShared.capture('planning'));
vi.mock('components/TripStatusBadge', () => mockShared.capture('statusBadge'));
vi.mock('components/AiFillItineraryBox', () => mockShared.capture('aiFill'));
vi.mock('components/NotifyParticipantsCheckbox', () =>
    mockShared.capture('notify')
);
vi.mock('components/TripOfflineButton', () => mockShared.capture('offlineBtn'));
vi.mock('components/TripDetailTour', () => ({
    TRIP_DETAIL_TOUR_STORAGE_KEY: 'trip-detail-tour-completed-v1',
    default: (props: any) => {
        captured.tour = props;
        return null;
    },
}));

vi.mock('components/EditBasicInfoModal', mockShared.captureRefMock('editBasic'));
vi.mock('components/ShiftDatesModal', mockShared.captureRefMock('shiftModal'));
vi.mock('components/DuplicateTripModal', mockShared.captureRefMock('dupModal'));
vi.mock(
    'components/TripNotificationPrefModal',
    mockShared.captureRefMock('notifyPref')
);

// ---- data hooks / context / adapters ------------------------------------
let mockItinerariesQuery: any;
let mockSaveItinerary: any;
let mockDeleteItinerary: any;
let mockEmailExport: any;
let mockTripStatuses: any[];
let mockCurrentUser: any;
let mockIsAdmin: boolean;
let mockIsOrganizer: boolean;
let mockOffline: any;
let mockIsOffline: boolean;
let mockApiTrip: any;
let mockTripState: any;
const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
const mockSaveInput = vi.fn(() => ({ id: 't1' }));

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => mockItinerariesQuery,
    useSaveItinerary: () => mockSaveItinerary,
    useDeleteItinerary: () => mockDeleteItinerary,
}));
vi.mock('api/hooks/useLookups', () => ({
    useTripStatuses: () => ({ data: mockTripStatuses }),
}));
vi.mock('api/hooks/useEmailTripExport', () => ({
    useEmailTripExport: () => mockEmailExport,
}));
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockCurrentUser, isAdmin: mockIsAdmin }),
}));
vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
    basicInfo: (payload: any) => ({ type: 'basicInfo', payload }),
    resetTrip: () => ({ type: 'resetTrip' }),
}));
vi.mock('hooks/useOfflineTrip', () => ({ useOfflineTrip: () => mockOffline }));
vi.mock('hooks/useIsOffline', () => ({ useIsOffline: () => mockIsOffline }));
vi.mock('hooks/useActivityStartReminders', () => ({
    useActivityStartReminders: (_a: any, opts: any) => {
        captured.actRem = opts;
    },
}));
vi.mock('hooks/useTripDayReminders', () => ({
    useTripDayReminders: (_t: any, opts: any) => {
        captured.dayRem = opts;
    },
}));
vi.mock('utils/itineraryAdapter', () => ({
    apiToTripState: () => mockTripState,
    isCurrentUserOrganizer: () => mockIsOrganizer,
    apiIsSingleTrip: () => true,
}));
vi.mock('utils/tripMapper', () => ({
    tripStateToSaveInput: (...args: any[]) => mockSaveInput(...args),
}));
vi.mock('utils/exportTripExcel', () => ({
    exportTripToExcel: vi.fn(),
    getTripExcelBlob: () => Promise.resolve(new Blob(['x'])),
}));
vi.mock('utils/exportTripPdf', () => ({
    exportTripToPdf: vi.fn(),
    getTripPdfBlob: () => Promise.resolve(new Blob(['x'])),
    printTripPdf: vi.fn(),
}));

import TripDetail from './index';
import { exportTripToExcel } from 'utils/exportTripExcel';
import { exportTripToPdf, printTripPdf } from 'utils/exportTripPdf';

// ---- fixtures ------------------------------------------------------------
const friend = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    label: `Friend ${id}`,
    name: `Friend ${id}`,
    userId: `u${id}`,
    ...over,
});

const activity = (over: Record<string, unknown> = {}) => ({
    id: 101,
    apiId: 'a-101',
    kind: 'place',
    name: 'Museum visit',
    cost: 20,
    status: { id: 's-planning', name: 'Planning' },
    ...over,
});

const makeTripState = (over: Record<string, unknown> = {}): any => ({
    apiId: 't1',
    name: 'Tokyo Adventure',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    status: { id: 's-planning', name: 'Planning' },
    type: {
        id: 1,
        name: 'Single Destination Trip',
        route: '/single',
        steps: { BASIC: 0, FRIEND: 1, FINISH: 2 },
    },
    budget: 1000,
    total: 1000,
    destinations: [
        {
            id: 501,
            country: { id: 1, name: 'Japan', code: 'JP' },
            startDate: '2026-08-01',
            endDate: '2026-08-05',
            itinerary: [
                { id: 601, date: '2026-08-01', activities: [activity()] },
            ],
        },
    ],
    friends: [],
    organizer: [friend(1)],
    ...over,
});

const makeApiTrip = (over: Record<string, unknown> = {}): any => ({
    id: 't1',
    status: { id: 's-planning', name: 'Planning' },
    interaryType: { id: 'it1', name: 'Single Destination Trip' },
    friends: [],
    organizers: [{ id: 'u1' }],
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    ...over,
});

const setStatus = (name: string) => {
    const id = mockTripStatuses.find((s) => s.name === name)?.id ?? `s-${name}`;
    mockApiTrip.status = { id, name };
    mockTripState.status = { id, name };
};

const renderTrip = () =>
    renderWithProviders(<TripDetail />, { route: '/trip-detail?id=t1' });

beforeEach(() => {
    Object.keys(captured).forEach((k) => delete captured[k]);
    mockNavigate.mockReset();
    mockDispatch.mockReset();
    mockSaveInput.mockClear();
    window.localStorage.clear();
    window.open = vi.fn();
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    mockApiTrip = makeApiTrip();
    mockTripState = makeTripState();
    // A second active trip so `otherTripRanges` (the duplicate-overlap warning)
    // has something to map.
    const otherTrip = {
        id: 't2',
        name: 'Osaka weekend',
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        status: { id: 's-planning', name: 'Planning' },
    };
    mockItinerariesQuery = {
        data: [mockApiTrip, otherTrip],
        isFetching: false,
        isError: false,
        isSuccess: true,
    };
    mockSaveItinerary = {
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
    };
    mockDeleteItinerary = {
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
    };
    mockEmailExport = {
        mutateAsync: vi.fn().mockResolvedValue({ recipients: 2 }),
    };
    mockTripStatuses = [
        { id: 's-planning', name: 'Planning' },
        { id: 's-confirmed', name: 'Confirmed' },
        { id: 's-completed', name: 'Completed' },
        { id: 's-cancelled', name: 'Cancelled' },
    ];
    mockCurrentUser = { id: 'u1', isPaidMember: true };
    mockIsAdmin = false;
    mockIsOrganizer = true;
    mockIsOffline = false;
    mockOffline = {
        status: 'not-downloaded',
        savedAt: null,
        isHydrated: true,
        offlineData: null,
        download: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
    };
});

describe('TripDetail — load states', () => {
    it('shows the branded loader while the itineraries query is still fetching', () => {
        mockItinerariesQuery = {
            data: [],
            isFetching: true,
            isError: false,
            isSuccess: false,
        };
        renderTrip();
        expect(screen.getByText('Loading trip…')).toBeInTheDocument();
    });

    it('shows "Trip not found" once the list settled with no matching trip', async () => {
        mockItinerariesQuery = {
            data: [],
            isFetching: false,
            isError: false,
            isSuccess: true,
        };
        renderTrip();
        expect(
            screen.getByRole('heading', { name: 'Trip not found' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Back to my trips' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/trips');
    });

    it('falls back to the offline snapshot when the live list has not loaded', () => {
        mockItinerariesQuery = {
            data: [],
            isFetching: false,
            isError: false,
            isSuccess: false,
        };
        mockOffline = { ...mockOffline, offlineData: mockApiTrip };
        renderTrip();
        expect(
            screen.getByRole('heading', { name: 'Tokyo Adventure' })
        ).toBeInTheDocument();
    });
});

describe('TripDetail — Planning render', () => {
    it('renders the trip name, day-list section, and the planning box', () => {
        renderTrip();
        expect(
            screen.getByRole('heading', { name: 'Tokyo Adventure' })
        ).toBeInTheDocument();
        expect(screen.getByText('End of trip')).toBeInTheDocument();
        expect(captured.planning).toBeTruthy();
        expect(captured.dest).toBeTruthy();
        // Trip has a real place activity → the "plan it for me" nudge is hidden.
        expect(captured.aiFill).toBeUndefined();
    });

    it('offers the AI-fill nudge only when the itinerary is still empty', () => {
        mockTripState.destinations[0].itinerary[0].activities = [
            activity({ id: 9, kind: 'flight', name: 'Flight' }),
        ];
        renderTrip();
        expect(captured.aiFill).toBeTruthy();
    });

    it('expands the collapsible "Trip details" overview and saves basic info', async () => {
        renderTrip();
        await userEvent.click(
            screen.getByRole('button', { name: /Trip details/i })
        );
        expect(captured.editBasic).toBeTruthy();
        await act(async () => {
            await captured.editBasic.onSave(mockTripState);
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
        expect(screen.getByText('Trip info saved.')).toBeInTheDocument();
    });
});

describe('TripDetail — status banners', () => {
    it('renders the completed banner + recap surfaces for a Completed trip', () => {
        setStatus('Completed');
        renderTrip();
        expect(screen.getByText('Trip completed')).toBeInTheDocument();
        // No planning box once complete.
        expect(captured.planning).toBeUndefined();
    });

    it('renders the cancelled banner for a Cancelled trip', () => {
        setStatus('Cancelled');
        renderTrip();
        expect(screen.getByText('Trip cancelled')).toBeInTheDocument();
    });

    it('shows the Mark-complete CTA + status badge for a Confirmed trip', () => {
        setStatus('Confirmed');
        renderTrip();
        expect(screen.getByText('Trip all wrapped up?')).toBeInTheDocument();
        expect(captured.statusBadge).toBeTruthy();
        // Offline download button is inline on desktop for Confirmed trips.
        expect(captured.offlineBtn).toBeTruthy();
    });
});

describe('TripDetail — itinerary callbacks (auto-save)', () => {
    it('adds an activity to an existing day and persists while Planning', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { name: 'Ramen', kind: 'place' },
                    destinationIndx: 0,
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('creates a new day on demand when adding to a date with no day', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-10',
                activity: {
                    type: 'add',
                    value: { name: 'Sushi', kind: 'place' },
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
    });

    it('edits an activity by id and by index', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: { value: { id: 101, name: 'Edited' } },
                    destinationIndx: 0,
                },
            });
        });
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: { index: 0, value: { name: 'IdxEdited' } },
                    destinationIndx: 0,
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalledTimes(2);
    });

    it('deletes an activity', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: { type: 'delete', value: 101, destinationIndx: 0 },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
    });

    it('persists a budget change while Planning', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangeBudget({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: {
                        activityId: 101,
                        value: [{ user: friend(1), budget: 50 }],
                    },
                    destinationIndx: 0,
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
    });

    it('adds / edits / deletes a destination while Planning', () => {
        renderTrip();
        act(() => {
            captured.dest.onChangeDestination({
                startDate: '2026-08-06',
                endDate: '2026-08-08',
                activity: {
                    type: 'add',
                    value: { country: { name: 'Peru' }, itinerary: [] },
                },
            });
        });
        act(() => {
            captured.dest.onChangeDestination({
                startDate: '2026-08-01',
                endDate: '2026-08-05',
                activity: {
                    type: 'edit',
                    value: { id: 501, country: { id: 1, name: 'Japan' } },
                    index: 0,
                },
            });
        });
        act(() => {
            captured.dest.onChangeDestination({
                startDate: '2026-08-01',
                endDate: '2026-08-05',
                activity: { type: 'delete', value: 501 },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalledTimes(3);
    });

    it('in Confirmed, only the Complete tick and paid edits auto-save', () => {
        setStatus('Confirmed');
        renderTrip();
        // A plain edit does NOT auto-save when Confirmed.
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: { value: { id: 101, name: 'Nope' } },
                    destinationIndx: 0,
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).not.toHaveBeenCalled();
        // Marking an activity Completed DOES auto-save.
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: {
                        value: {
                            id: 101,
                            status: { id: 's-completed', name: 'Completed' },
                        },
                    },
                    destinationIndx: 0,
                },
            });
        });
        // A paid attestation also auto-saves.
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: { value: { id: 101, paidAt: '2026-08-02' } },
                    destinationIndx: 0,
                },
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalledTimes(2);
    });

    it('surfaces a save error toast when the auto-save mutation rejects', async () => {
        mockSaveItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('boom'));
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { name: 'X', kind: 'place' },
                    destinationIndx: 0,
                },
            });
        });
        expect(await screen.findByText('boom')).toBeInTheDocument();
    });

    it('guards against a second save while one is in flight', () => {
        mockSaveItinerary.isPending = true;
        renderTrip();
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { name: 'X', kind: 'place' },
                    destinationIndx: 0,
                },
            });
        });
        expect(
            screen.getByText(
                'Still saving the previous change. Try again in a moment.'
            )
        ).toBeInTheDocument();
    });
});

describe('TripDetail — lifecycle transitions', () => {
    it('confirms a Planning trip: confetti, confirm toast, and auto-emailed itinerary', async () => {
        renderTrip();
        await act(async () => {
            await captured.planning.onStatusChange(
                { id: 's-confirmed', name: 'Confirmed' },
                { confirmAllActivities: true }
            );
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
        expect(vi.mocked(confetti)).toHaveBeenCalled();
        expect(
            screen.getByText('Yay! Your trip is confirmed and ready to go!')
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(
                screen.getByText('Itinerary emailed to 2 people.')
            ).toBeInTheDocument()
        );
    });

    it('completing a past-due Planning trip skips confetti and shows the quiet toast', async () => {
        mockTripState.endDate = '2020-01-05';
        renderTrip();
        await act(async () => {
            await captured.planning.onStatusChange({
                id: 's-confirmed',
                name: 'Confirmed',
            });
        });
        expect(vi.mocked(confetti)).not.toHaveBeenCalled();
        expect(
            screen.getByText(/Trip marked complete/i)
        ).toBeInTheDocument();
    });

    it('re-throws and shows an error toast when a status save fails', async () => {
        mockSaveItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('status-fail'));
        renderTrip();
        await act(async () => {
            await captured.planning
                .onStatusChange({ id: 's-confirmed', name: 'Confirmed' })
                .catch(() => {});
        });
        expect(await screen.findByText('status-fail')).toBeInTheDocument();
    });

    it('marks a Confirmed trip Completed via the status badge', async () => {
        setStatus('Confirmed');
        renderTrip();
        await act(async () => {
            await captured.statusBadge.onStatusChange({
                id: 's-completed',
                name: 'Completed',
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
        expect(vi.mocked(confetti)).not.toHaveBeenCalled();
    });

    it('shifts the trip dates and toasts the new start date', async () => {
        renderTrip();
        await act(async () => {
            await captured.planning.onShiftDates?.();
        });
        await act(async () => {
            await captured.shiftModal.onShift('2026-09-01');
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
        expect(screen.getByText(/Trip moved to/i)).toBeInTheDocument();
    });

    it('no-ops a shift to the same start date', async () => {
        renderTrip();
        await act(async () => {
            await captured.shiftModal.onShift('2026-08-01');
        });
        expect(mockSaveItinerary.mutateAsync).not.toHaveBeenCalled();
    });

    it('navigates into the stepper editor on "edit trip dates"', () => {
        renderTrip();
        act(() => {
            captured.planning.onEditTripDates();
        });
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('?id=t1')
        );
    });
});

describe('TripDetail — header menu actions', () => {
    const openMenu = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'More actions' })
        );
    };

    it('cancels the trip through the kebab menu + confirm dialog', async () => {
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Cancel trip' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel trip' })
        );
        await waitFor(() =>
            expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled()
        );
    });

    it('errors if the Cancelled status cannot be resolved', async () => {
        mockTripStatuses = mockTripStatuses.filter(
            (s) => s.name !== 'Cancelled'
        );
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Cancel trip' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel trip' })
        );
        expect(
            await screen.findByText(/Couldn't resolve the Cancelled status/i)
        ).toBeInTheDocument();
    });

    it('deletes the trip and navigates back to the trips list', async () => {
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Delete trip' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        await waitFor(() =>
            expect(mockDeleteItinerary.mutateAsync).toHaveBeenCalledWith({
                id: 't1',
                notifyParticipants: true,
            })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/trips');
    });

    it('starts the tour from the menu and completes it', async () => {
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Take the tour' })
        );
        expect(captured.tour.run).toBe(true);
        act(() => {
            captured.tour.onClose();
        });
        expect(
            window.localStorage.getItem('trip-detail-tour-completed-v1')
        ).toBe('1');
    });

    it('offers Duplicate on a Completed trip and seeds a copy into the stepper', async () => {
        setStatus('Completed');
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Duplicate trip' })
        );
        act(() => {
            captured.dupModal.onConfirm('2026-10-01');
        });
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalled();
    });
});

describe('TripDetail — export & share', () => {
    const openExport = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'Share or download trip' })
        );
    };

    it('downloads PDF, Excel, and prints from the export modal', async () => {
        renderTrip();
        await openExport();
        await userEvent.click(
            screen.getByRole('button', { name: /Download PDF/i })
        );
        await openExport();
        await userEvent.click(
            screen.getByRole('button', { name: /Download Excel/i })
        );
        await openExport();
        await userEvent.click(screen.getByRole('button', { name: /Print/i }));
        expect(vi.mocked(exportTripToPdf)).toHaveBeenCalled();
        expect(vi.mocked(exportTripToExcel)).toHaveBeenCalled();
        expect(vi.mocked(printTripPdf)).toHaveBeenCalled();
    });

    it('shares to WhatsApp and copies the trip link', async () => {
        renderTrip();
        await openExport();
        await userEvent.click(
            screen.getByRole('button', { name: /WhatsApp/i })
        );
        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining('https://wa.me/'),
            '_blank',
            'noopener,noreferrer'
        );
        await openExport();
        await userEvent.click(
            screen.getByRole('button', { name: /Copy link/i })
        );
        await waitFor(() =>
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('/trip-detail?id=t1')
            )
        );
    });
});

describe('TripDetail — view toggles & reminders', () => {
    it('toggles focus mode: hides the header and shows the exit pill', async () => {
        renderTrip();
        await userEvent.click(screen.getByRole('button', { name: /^Focus/ }));
        expect(document.body.classList.contains('trip-focus-mode')).toBe(true);
        const fab = screen.getByRole('button', { name: /Show trip overview/i });
        await userEvent.click(fab);
        expect(document.body.classList.contains('trip-focus-mode')).toBe(false);
    });

    it('toggles night view and text-only', async () => {
        renderTrip();
        await userEvent.click(screen.getByRole('button', { name: /^Night/ }));
        expect(document.body.classList.contains('trip-night-mode')).toBe(true);
        await userEvent.click(
            screen.getByRole('button', { name: /^Text only/ })
        );
        // Toggling text-only re-renders without crashing; the toggle flips to
        // "Show images".
        expect(
            screen.getByRole('button', { name: /Show images/ })
        ).toBeInTheDocument();
    });

    it('fires activity + trip-day reminder toasts', () => {
        renderTrip();
        act(() => captured.actRem.onReminder({ name: 'Museum' }, 10));
        expect(
            screen.getByText('Museum starts in 10 minutes')
        ).toBeInTheDocument();
        act(() => captured.actRem.onReminder({}, 5));
        expect(
            screen.getByText('Your next activity starts in 5 minutes')
        ).toBeInTheDocument();
        act(() =>
            captured.dayRem.onTripStart({ name: 'Tokyo Adventure' })
        );
        expect(
            screen.getByText(/Tokyo Adventure starts today/i)
        ).toBeInTheDocument();
        act(() =>
            captured.dayRem.onDayStart({}, '2026-08-01', {
                activityCount: 0,
                dayIndex: 1,
                totalDays: 5,
            })
        );
        act(() =>
            captured.dayRem.onDayStart({}, '2026-08-02', {
                activityCount: 3,
                dayIndex: 2,
                totalDays: 5,
            })
        );
        expect(screen.getByText(/Day 2 of 5/i)).toBeInTheDocument();
    });

    it('renders the notify bell for a multi-participant trip and toggles it', () => {
        mockApiTrip.friends = [{ id: 'u2' }, { id: 'u3' }];
        renderTrip();
        expect(captured.notify).toBeTruthy();
        act(() => captured.notify.onChange(false));
        // Re-render reflects the new value on the checkbox prop.
        expect(captured.notify.checked).toBe(false);
    });

    it('does not skip the tour auto-trigger when the completed flag is unset', () => {
        // Flag present → the auto-run effect returns early (covered branch).
        window.localStorage.setItem('trip-detail-tour-completed-v1', '1');
        renderTrip();
        expect(captured.tour.run).toBe(false);
    });

    it('drives the offline download / remove controls on a Confirmed trip', () => {
        setStatus('Confirmed');
        renderTrip();
        act(() => captured.offlineBtn.onDownload());
        act(() => captured.offlineBtn.onRemove());
        expect(mockOffline.download).toHaveBeenCalledWith(mockApiTrip);
        expect(mockOffline.remove).toHaveBeenCalled();
    });
});

const setMobile = () => {
    window.matchMedia = ((query: string) => ({
        matches: query.includes('720'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
};

describe('TripDetail — mobile header (kebab-hosted controls)', () => {
    const openMenu = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'More actions' })
        );
    };

    it('moves text-only + offline into the kebab on a narrow viewport', async () => {
        setMobile();
        setStatus('Confirmed');
        renderTrip();
        // Standalone desktop text-only button is gone on mobile.
        expect(
            screen.queryByRole('button', { name: /^Text only/ })
        ).not.toBeInTheDocument();
        await openMenu();
        // Hide-images override + Save-offline both live in the menu now.
        await userEvent.click(
            screen.getByRole('menuitem', { name: /Text only/i })
        );
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: /^Save offline/i })
        );
        expect(mockOffline.download).toHaveBeenCalled();
    });

    it('shows the "remove offline copy" menu item once a snapshot is saved', async () => {
        setMobile();
        setStatus('Confirmed');
        mockOffline = { ...mockOffline, status: 'saved' };
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: /Remove offline copy/i })
        );
        expect(mockOffline.remove).toHaveBeenCalled();
    });

    it('shows the "saving offline…" menu item while a snapshot syncs', async () => {
        setMobile();
        setStatus('Confirmed');
        mockOffline = { ...mockOffline, status: 'syncing' };
        renderTrip();
        await openMenu();
        expect(
            screen.getByRole('menuitem', { name: /Saving offline/i })
        ).toBeInTheDocument();
    });
});

describe('TripDetail — extra header actions', () => {
    const openMenu = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'More actions' })
        );
    };

    it('opens Share & download from the menu', async () => {
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Share & download' })
        );
        expect(
            screen.getByRole('button', { name: /Download PDF/i })
        ).toBeInTheDocument();
    });

    it('opens the per-trip notification preferences from the menu', async () => {
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Trip notifications' })
        );
        expect(captured.notifyPref).toBeTruthy();
    });

    it('opens the mail client when sharing by email', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { href: '', origin: 'http://localhost' },
        });
        renderTrip();
        await userEvent.click(
            screen.getByRole('button', { name: 'Share or download trip' })
        );
        await userEvent.click(screen.getByRole('button', { name: /Email/i }));
        expect(window.location.href).toContain('mailto:');
    });

    it('shows the ended-N-days-ago CTA copy on a past-due Confirmed trip', () => {
        setStatus('Confirmed');
        mockTripState.endDate = '2020-01-05';
        renderTrip();
        expect(screen.getByText(/Trip ended/i)).toBeInTheDocument();
    });
});

describe('TripDetail — error paths', () => {
    const openMenu = async () => {
        await userEvent.click(
            screen.getByRole('button', { name: 'More actions' })
        );
    };

    it('toasts when saving basic info fails', async () => {
        mockSaveItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('info-fail'));
        renderTrip();
        await userEvent.click(
            screen.getByRole('button', { name: /Trip details/i })
        );
        let ok = true;
        await act(async () => {
            ok = await captured.editBasic.onSave(mockTripState);
        });
        expect(ok).toBe(false);
        expect(await screen.findByText('info-fail')).toBeInTheDocument();
    });

    it('toasts when a shift fails', async () => {
        mockSaveItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('shift-fail'));
        renderTrip();
        await act(async () => {
            await captured.shiftModal.onShift('2026-09-01');
        });
        expect(await screen.findByText('shift-fail')).toBeInTheDocument();
    });

    it('toasts when deleting fails', async () => {
        mockDeleteItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('del-fail'));
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Delete trip' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(await screen.findByText('del-fail')).toBeInTheDocument();
    });

    it('toasts when cancelling fails', async () => {
        mockSaveItinerary.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('cancel-fail'));
        renderTrip();
        await openMenu();
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Cancel trip' })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel trip' })
        );
        expect(await screen.findByText('cancel-fail')).toBeInTheDocument();
    });

    it('warns when the auto-export email fails after confirming', async () => {
        mockEmailExport.mutateAsync = vi
            .fn()
            .mockRejectedValue(new Error('mail-down'));
        renderTrip();
        await act(async () => {
            await captured.planning.onStatusChange({
                id: 's-confirmed',
                name: 'Confirmed',
            });
        });
        await waitFor(() =>
            expect(
                screen.getByText(/Couldn't email the itinerary/i)
            ).toBeInTheDocument()
        );
    });
});

describe('TripDetail — misc branches', () => {
    it('lets a non-organizer friend rate a Completed trip', () => {
        setStatus('Completed');
        mockIsOrganizer = false;
        mockTripState.friends = [friend(1, { userId: 'u1' })];
        renderTrip();
        expect(screen.getByText('Trip completed')).toBeInTheDocument();
    });

    it('edits a destination by index and drops removed destinations', () => {
        mockTripState.destinations.push({
            id: 502,
            country: { id: 2, name: 'Peru' },
            startDate: '2026-08-06',
            endDate: '2026-08-08',
            itinerary: [],
        });
        renderTrip();
        act(() => {
            captured.dest.onChangeDestination({
                startDate: '2026-08-01',
                endDate: '2026-08-05',
                activity: {
                    type: 'edit',
                    value: { country: { id: 9, name: 'Chile' } },
                    index: 0,
                },
                removeIndexes: [502],
            });
        });
        expect(mockSaveItinerary.mutateAsync).toHaveBeenCalled();
    });

    it('expands Trip details on a Confirmed trip (budget folds into the collapse)', async () => {
        setStatus('Confirmed');
        renderTrip();
        await userEvent.click(
            screen.getByRole('button', { name: /Trip details/i })
        );
        // EditBasicInfoModal still mounts, but with editing disabled.
        expect(captured.editBasic).toBeTruthy();
        expect(captured.editBasic.data).toBeTruthy();
    });

    it('renders the AI-fill nudge for an empty trip with no country name', () => {
        mockTripState.destinations = [
            {
                id: 501,
                country: { id: 1, name: '  ' },
                itinerary: [
                    {
                        id: 601,
                        date: '2026-08-01',
                        activities: [
                            activity({ id: 9, kind: 'flight', name: 'Flight' }),
                        ],
                    },
                ],
            },
        ];
        renderTrip();
        expect(captured.aiFill).toBeTruthy();
        expect(captured.aiFill.place).toBeUndefined();
    });

    it('handles a Confirmed trip with no valid end date (no "ended" copy)', () => {
        setStatus('Confirmed');
        mockTripState.endDate = '';
        renderTrip();
        expect(screen.getByText('Trip all wrapped up?')).toBeInTheDocument();
    });

    it('offers "connect first" for offline save when the device is offline (mobile)', async () => {
        setMobile();
        setStatus('Confirmed');
        mockIsOffline = true;
        renderTrip();
        await userEvent.click(
            screen.getByRole('button', { name: 'More actions' })
        );
        expect(
            screen.getByRole('menuitem', { name: /connect first/i })
        ).toBeInTheDocument();
    });

    it('renders "Trip not found" when the URL carries no id', () => {
        renderWithProviders(<TripDetail />, { route: '/trip-detail' });
        expect(
            screen.getByRole('heading', { name: 'Trip not found' })
        ).toBeInTheDocument();
    });

    it('renders without a signed-in user (tour auto-run guard bails)', () => {
        mockCurrentUser = null;
        renderTrip();
        expect(
            screen.getByRole('heading', { name: 'Tokyo Adventure' })
        ).toBeInTheDocument();
    });

    it('skips confetti under prefers-reduced-motion', async () => {
        window.matchMedia = ((query: string) => ({
            matches: query.includes('reduce'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as unknown as typeof window.matchMedia;
        renderTrip();
        await act(async () => {
            await captured.planning.onStatusChange({
                id: 's-confirmed',
                name: 'Confirmed',
            });
        });
        expect(vi.mocked(confetti)).not.toHaveBeenCalled();
    });

    it('applies changes but never auto-saves for a non-organizer viewer', () => {
        mockIsOrganizer = false;
        renderTrip();
        expect(captured.dest.isViewMode).toBe(true);
        act(() => {
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { name: 'X', kind: 'place' },
                    destinationIndx: 0,
                },
            });
            captured.dest.onChangeBudget({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { activityId: 101, value: [] },
                    destinationIndx: 0,
                },
            });
            captured.dest.onChangeDestination({
                startDate: '2026-08-06',
                endDate: '2026-08-08',
                activity: { type: 'add', value: { country: { name: 'X' } } },
            });
        });
        expect(mockSaveItinerary.mutateAsync).not.toHaveBeenCalled();
    });

    it('safely no-ops on out-of-range / non-matching itinerary events', () => {
        renderTrip();
        act(() => {
            // Destination index out of range → early return.
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'add',
                    value: { name: 'X', kind: 'place' },
                    destinationIndx: 9,
                },
            });
            // Edit on a day that doesn't exist → no-op.
            captured.dest.onChangePlace({
                date: '2099-01-01',
                activity: {
                    type: 'edit',
                    value: { value: { id: 101, name: 'Y' } },
                    destinationIndx: 0,
                },
            });
            // Edit with neither id nor index → target undefined.
            captured.dest.onChangePlace({
                date: '2026-08-01',
                activity: {
                    type: 'edit',
                    value: { value: { name: 'Z' } },
                    destinationIndx: 0,
                },
            });
            // Non-add budget event → early return.
            captured.dest.onChangeBudget({
                date: '2026-08-01',
                activity: { type: 'edit', value: {}, destinationIndx: 0 },
            });
        });
        expect(
            screen.getByRole('heading', { name: 'Tokyo Adventure' })
        ).toBeInTheDocument();
    });
});
