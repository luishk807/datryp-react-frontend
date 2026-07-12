import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import { TripProvider } from 'context/TripContext';
import { TripCapReachedError } from 'api/paywallError';
import type { TripState } from 'types';
import StepperComp, {
    type StepperStep,
    useStepperAdvance,
} from './index';

// ---- mutable mock state (reset in beforeEach) ----
// useUser throws outside a UserProvider; the lookup + itinerary queries would
// hit the network. All are mocked so the wizard renders offline. TripProvider
// stays the real (network-free) reducer context so useTripDispatch resolves.
let mockUser: { isPaidMember?: boolean } | null = null;
let mockIsAdmin = false;
let mockItineraryTypes: { id: string; name: string }[] = [];
let mockTripStatuses: { id: string; name: string }[] = [];
let mockSaveIsPending = false;
let mockDeleteIsPending = false;
const mockSaveMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockNavigate = vi.fn();
const mockCompleteTripWithAi = vi.fn();

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

vi.mock('api/hooks/useLookups', () => ({
    useItineraryTypes: () => ({ data: mockItineraryTypes }),
    useTripStatuses: () => ({ data: mockTripStatuses }),
}));

vi.mock('api/hooks/useItineraries', () => ({
    useSaveItinerary: () => ({
        mutateAsync: mockSaveMutateAsync,
        isPending: mockSaveIsPending,
    }),
    useDeleteItinerary: () => ({
        mutateAsync: mockDeleteMutateAsync,
        isPending: mockDeleteIsPending,
    }),
}));

vi.mock('api/aiFillItineraryApi', () => ({
    completeTripWithAi: (...args: unknown[]) => mockCompleteTripWithAi(...args),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

// Feature-level children pull in their own hooks / heavy layout; stub them so
// each StepperComp render path is exercised without their internals. Mocking
// children does NOT lower StepperComp's own line coverage (the JSX that mounts
// them still runs).
vi.mock('components/BasicTripInfo', () => ({
    default: (props: { onEditBasicInfo?: () => void }) => (
        <div data-testid="basic-trip-info">
            <button type="button" onClick={() => props.onEditBasicInfo?.()}>
                edit-basic-info
            </button>
        </div>
    ),
}));
vi.mock('components/BudgetSummary', () => ({
    default: () => <div data-testid="budget-summary" />,
}));
vi.mock('components/TripSteps/TripDestinationChip', () => ({
    default: () => <div data-testid="trip-destination-chip" />,
}));
vi.mock('components/TripStatusBadge', () => ({
    default: () => <div data-testid="trip-status-badge" />,
}));
vi.mock('components/NotifyParticipantsCheckbox', () => ({
    default: (props: { checked: boolean; onChange: (v: boolean) => void }) => (
        <label>
            notify participants
            <input
                type="checkbox"
                checked={props.checked}
                onChange={(e) => props.onChange(e.target.checked)}
            />
        </label>
    ),
}));
vi.mock('components/DestinationDetail/Completed', () => ({
    default: (props: { onReset: () => void }) => (
        <div data-testid="trip-complete">
            <button type="button" onClick={() => props.onReset()}>
                plan another
            </button>
        </div>
    ),
}));
vi.mock('components/PaywallModal', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    return {
        default: forwardRef(
            (props: { currentCount: number; cap: number }, ref) => {
                useImperativeHandle(ref, () => ({
                    openModel: () => {},
                    closeModal: () => {},
                }));
                return (
                    <div data-testid="paywall-modal">
                        paywall {props.currentCount}/{props.cap}
                    </div>
                );
            }
        ),
    };
});

// ---- fixtures / helpers ----
const SINGLE_TYPE = {
    id: 1,
    name: 'Single',
    route: '/single',
    steps: { BASIC: 0, FRIEND: 1, FINISH: 2 },
};

const bodyStep = (label: string): StepperStep => ({
    label,
    comp: <div>{label} body</div>,
});

const steps: StepperStep[] = [
    { label: 'First', comp: <div>Step one body</div> },
    { label: 'Second', comp: <div>Step two body</div> },
];

const renderStepper = (props: Record<string, unknown> = {}) =>
    renderWithProviders(
        <TripProvider>
            <StepperComp steps={steps} {...props} />
        </TripProvider>
    );

const renderStepperWith = (
    stepList: StepperStep[],
    data?: TripState,
    props: Record<string, unknown> = {}
) =>
    renderWithProviders(
        <TripProvider>
            <StepperComp steps={stepList} data={data} {...props} />
        </TripProvider>
    );

const completeTrip = (overrides: Partial<TripState> = {}): TripState => ({
    name: 'Japan Adventure',
    type: SINGLE_TYPE,
    budget: 1000,
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    organizer: [{ id: 1, userId: 'u1' } as never],
    friends: [{ id: 1, userId: 'u1' } as never],
    destinations: [
        { id: 1, country: { id: 1, name: 'Japan' }, itinerary: [] } as never,
    ],
    ...overrides,
});

const seedLookups = () => {
    mockItineraryTypes = [
        { id: 'it-single', name: 'Single Destination Trip' },
        { id: 'it-multi', name: 'Multi Destination Trip' },
    ];
    mockTripStatuses = [
        { id: 'ts-plan', name: 'Planning' },
        { id: 'ts-confirm', name: 'Confirmed' },
        { id: 'ts-cancel', name: 'Cancelled' },
    ];
};

beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
    mockItineraryTypes = [];
    mockTripStatuses = [];
    mockSaveIsPending = false;
    mockDeleteIsPending = false;
    mockSaveMutateAsync.mockReset();
    mockSaveMutateAsync.mockResolvedValue({ id: 'srv-new-1' });
    mockDeleteMutateAsync.mockReset();
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockNavigate.mockReset();
    mockCompleteTripWithAi.mockReset();
    mockCompleteTripWithAi.mockResolvedValue(undefined);
    localStorage.clear();
});

describe('StepperComp — basic navigation', () => {
    it('renders the first step with a Next action and no Back', () => {
        renderStepper();
        expect(screen.getByText('Step one body')).toBeInTheDocument();
        expect(screen.queryByText('Step two body')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /next/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /back/i })
        ).not.toBeInTheDocument();
    });

    it('advances to the next step and reveals a Back button', async () => {
        renderStepper();
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        expect(screen.getByText('Step two body')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /back/i })
        ).toBeInTheDocument();
    });

    it('returns to the previous step when Back is clicked', async () => {
        renderStepper();
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        await userEvent.click(screen.getByRole('button', { name: /back/i }));
        expect(screen.getByText('Step one body')).toBeInTheDocument();
        expect(screen.queryByText('Step two body')).not.toBeInTheDocument();
    });

    it('moves focus to the new step heading when advancing', async () => {
        // Screen-reader + keyboard users must land on the new question when the
        // wizard advances, not stay on the now-replaced Next button.
        const focusSteps: StepperStep[] = [
            {
                label: 'First',
                comp: <h2 className="trip-step-headline">Where to?</h2>,
            },
            {
                label: 'Second',
                comp: (
                    <h2 className="trip-step-headline">When are you going?</h2>
                ),
            },
        ];
        renderStepperWith(focusSteps);
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        const heading = screen.getByRole('heading', {
            name: 'When are you going?',
        });
        await waitFor(() => expect(heading).toHaveFocus());
    });

    it('notifies the parent when the active step changes', async () => {
        const onActiveStepChange = vi.fn();
        renderStepper({ onActiveStepChange });
        expect(onActiveStepChange).toHaveBeenCalledWith(0);
        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        expect(onActiveStepChange).toHaveBeenCalledWith(1);
    });
});

describe('StepperComp — mode step (Trip type)', () => {
    it('hides the Next button on the mode step (it auto-advances)', () => {
        renderStepperWith(
            [bodyStep('Trip type'), bodyStep('Finish')],
            completeTrip({ type: SINGLE_TYPE })
        );
        expect(screen.getByText('Trip type body')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /next/i })
        ).not.toBeInTheDocument();
    });

    it('lets a step advance imperatively via useStepperAdvance', async () => {
        const AutoAdvance = () => {
            const { onAdvance } = useStepperAdvance();
            return (
                <button type="button" onClick={onAdvance}>
                    pick-mode
                </button>
            );
        };
        renderStepperWith(
            [
                { label: 'Trip type', comp: <AutoAdvance /> },
                bodyStep('Destination'),
            ],
            completeTrip()
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'pick-mode' })
        );
        expect(screen.getByText('Destination body')).toBeInTheDocument();
    });
});

describe('StepperComp — per-step validation gating', () => {
    // Each case puts the step-under-test at index 0 of a 2-step array so only
    // that step's required-field checks run (isLastStep stays false).
    it('blocks Next and shows the destination-country message', () => {
        renderStepperWith(
            [bodyStep('Destination'), bodyStep('Finish')],
            completeTrip({
                destinations: [
                    { id: 1, country: { id: 0, name: '' }, itinerary: [] } as never,
                ],
            })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        expect(
            screen.getByText(/add .*a destination country.* to continue/i)
        ).toBeInTheDocument();
    });

    it('enables Next once the destination country is present', () => {
        renderStepperWith(
            [bodyStep('Destination'), bodyStep('Finish')],
            completeTrip()
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    it('blocks Next when the start/end dates are missing', () => {
        renderStepperWith(
            [bodyStep('Dates'), bodyStep('Finish')],
            completeTrip({ startDate: undefined, endDate: undefined })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        const alert = screen.getByText(/add .* to continue/i);
        expect(alert.textContent).toMatch(/start date/i);
        expect(alert.textContent).toMatch(/end date/i);
    });

    it('flags a backwards date range as invalid', () => {
        renderStepperWith(
            [bodyStep('Dates'), bodyStep('Finish')],
            completeTrip({ startDate: '2026-08-10', endDate: '2026-08-01' })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        expect(
            screen.getByText(/end date can't be before the start date/i)
        ).toBeInTheDocument();
    });

    it('blocks Next when the budget is empty/non-numeric', () => {
        renderStepperWith(
            [bodyStep('Budget'), bodyStep('Finish')],
            completeTrip({ budget: '' })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        expect(
            screen.getByText(/add .*a budget.* to continue/i)
        ).toBeInTheDocument();
    });

    it('accepts a budget of 0 (flexible)', () => {
        renderStepperWith(
            [bodyStep('Budget'), bodyStep('Finish')],
            completeTrip({ budget: 0 })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    it('blocks Next when there is no organizer', () => {
        renderStepperWith(
            [bodyStep('Organizers'), bodyStep('Finish')],
            completeTrip({ organizer: [] })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        expect(
            screen.getByText(/add .*at least one organizer.* to continue/i)
        ).toBeInTheDocument();
    });

    it('blocks Next when every participant was deselected', () => {
        renderStepperWith(
            [bodyStep('Participants'), bodyStep('Finish')],
            completeTrip({ friends: [] })
        );
        expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
        expect(
            screen.getByText(/add .*at least one participant.* to continue/i)
        ).toBeInTheDocument();
    });
});

describe('StepperComp — last (Finish) step', () => {
    it('shows the trip name title and the AI-plan nudge', () => {
        renderStepperWith(
            [bodyStep('Dates'), bodyStep('Finish')],
            completeTrip()
        );
        // Advance to the last step.
        return userEvent
            .click(screen.getByRole('button', { name: /next/i }))
            .then(() => {
                expect(
                    screen.getByRole('heading', { name: 'Japan Adventure' })
                ).toBeInTheDocument();
                expect(
                    screen.getByText(/can't decide\? let us plan it for you/i)
                ).toBeInTheDocument();
                expect(
                    screen.getByRole('button', { name: /plan it for me/i })
                ).toBeInTheDocument();
            });
    });

    it('shows a Finish button whose validation blocks an incomplete trip', () => {
        renderStepperWith(
            [bodyStep('Finish')],
            completeTrip({ name: '' })
        );
        const finish = screen.getByRole('button', { name: /finish/i });
        expect(finish).toBeDisabled();
        expect(
            screen.getByText(/add .*trip name.* to continue/i)
        ).toBeInTheDocument();
    });

    it('falls back to a generic title when the trip name is blank', () => {
        renderStepperWith([bodyStep('Finish')], completeTrip({ name: '   ' }));
        expect(
            screen.getByRole('heading', { name: /your trip/i })
        ).toBeInTheDocument();
    });
});

describe('StepperComp — Finish save path (create)', () => {
    it('saves the draft and lands on the completion screen', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));

        await waitFor(() =>
            expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1)
        );
        const input = mockSaveMutateAsync.mock.calls[0][0];
        expect(input.name).toBe('Japan Adventure');
        expect(input.interaryTypeId).toBe('it-single');
        expect(input.tripStatusId).toBe('ts-plan');
        expect(input.organizerIds).toContain('u1');

        expect(await screen.findByTestId('trip-complete')).toBeInTheDocument();
    });

    it('routes home when "plan another" is clicked on the completion screen', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));
        const reset = await screen.findByRole('button', {
            name: /plan another/i,
        });
        await userEvent.click(reset);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows a login error when saving without a user', async () => {
        mockUser = null;
        seedLookups();
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));
        expect(
            await screen.findByText(/please log in to save your trip/i)
        ).toBeInTheDocument();
        expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    });

    it('errors when the trip type cannot be resolved (empty lookup)', async () => {
        mockUser = { isPaidMember: true };
        // itineraryTypes intentionally left empty → resolve returns null.
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));
        expect(
            await screen.findByText(/could not resolve trip type/i)
        ).toBeInTheDocument();
        expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    });

    it('surfaces a generic save error inline', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        mockSaveMutateAsync.mockRejectedValueOnce(new Error('server exploded'));
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('server exploded');
    });

    it('opens the paywall modal on a trip-cap-reached error', async () => {
        mockUser = { isPaidMember: false };
        seedLookups();
        mockSaveMutateAsync.mockRejectedValueOnce(
            new TripCapReachedError({ currentCount: 3, cap: 3 })
        );
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(screen.getByRole('button', { name: /finish/i }));
        const modal = await screen.findByTestId('paywall-modal');
        expect(modal).toHaveTextContent('3/3');
    });
});

describe('StepperComp — "plan it for me" (AI)', () => {
    it('routes non-Pro users to the membership upsell', async () => {
        mockUser = { isPaidMember: false };
        seedLookups();
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /plan it for me/i })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/membership');
        expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    });

    it('saves + AI-fills + routes to the new trip for Pro users', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /plan it for me/i })
        );
        await waitFor(() =>
            expect(mockCompleteTripWithAi).toHaveBeenCalledWith(
                'srv-new-1',
                expect.any(String)
            )
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            '/trip-detail?id=srv-new-1'
        );
    });

    it('uses the generic (place-less) nudge copy when no country is set', () => {
        renderStepperWith(
            [bodyStep('Finish')],
            completeTrip({
                destinations: [
                    { id: 1, country: { id: 0, name: '' }, itinerary: [] } as never,
                ],
            })
        );
        expect(
            screen.getByText(
                (c) =>
                    c.startsWith("We'll fill your itinerary") &&
                    !c.includes(' for ')
            )
        ).toBeInTheDocument();
    });

    it('opens the paywall when the AI save hits the trip cap', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        mockSaveMutateAsync.mockRejectedValueOnce(
            new TripCapReachedError({ currentCount: 5, cap: 5 })
        );
        renderStepperWith([bodyStep('Finish')], completeTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /plan it for me/i })
        );
        expect(await screen.findByTestId('paywall-modal')).toHaveTextContent(
            '5/5'
        );
        expect(mockCompleteTripWithAi).not.toHaveBeenCalled();
    });
});

describe('StepperComp — saving spinner', () => {
    it('shows a busy status while a create save is in flight', () => {
        mockSaveIsPending = true;
        renderStepperWith([bodyStep('Finish')], completeTrip());
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent(/saving your trip/i);
    });
});

describe('StepperComp — edit mode', () => {
    const editSteps = [
        bodyStep('Basic info'),
        bodyStep('Participants'),
        bodyStep('Activities'),
    ];
    const editTrip = (overrides: Partial<TripState> = {}) =>
        completeTrip({
            apiId: 'trip-uuid-9',
            status: { id: 'ts-plan', name: 'Planning' },
            ...overrides,
        });

    it('renders the flat edit layout with header actions and inline sections', () => {
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        expect(
            screen.getByRole('heading', { name: 'Japan Adventure' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /save changes/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /cancel/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /more actions/i })
        ).toBeInTheDocument();
        expect(screen.getByTestId('basic-trip-info')).toBeInTheDocument();
        expect(screen.getByTestId('budget-summary')).toBeInTheDocument();
        // steps.slice(2) — only the Activities section renders inline.
        expect(screen.getByText('Activities body')).toBeInTheDocument();
        expect(screen.queryByText('Basic info body')).not.toBeInTheDocument();
    });

    it('opens the trip-info modal from the BasicTripInfo edit affordance', async () => {
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: 'edit-basic-info' })
        );
        // Modal now shows steps[0] + steps[1] bodies.
        expect(await screen.findByText('Basic info body')).toBeInTheDocument();
        expect(screen.getByText('Participants body')).toBeInTheDocument();
    });

    it('saves changes and returns to the trip detail view', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /save changes/i })
        );
        await waitFor(() =>
            expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1)
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            '/trip-detail?id=trip-uuid-9'
        );
    });

    it('cancels editing back to the trip detail view', async () => {
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockNavigate).toHaveBeenCalledWith(
            '/trip-detail?id=trip-uuid-9'
        );
    });

    it('blocks Save and warns when a required field is missing', () => {
        seedLookups();
        renderStepperWith(editSteps, editTrip({ name: '' }));
        expect(
            screen.getByRole('button', { name: /save changes/i })
        ).toBeDisabled();
        expect(
            screen.getByText(/add .*trip name.* to continue/i)
        ).toBeInTheDocument();
    });

    it('flags a backwards date range in edit mode', () => {
        seedLookups();
        renderStepperWith(
            editSteps,
            editTrip({ startDate: '2026-09-10', endDate: '2026-09-01' })
        );
        expect(
            screen.getByText(/end date can't be before the start date/i)
        ).toBeInTheDocument();
    });

    it('confirms + performs "Cancel trip" from the kebab menu', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /more actions/i })
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: /cancel trip/i })
        );
        // Confirm dialog.
        const dialog = await screen.findByRole('dialog');
        expect(
            within(dialog).getByText(/cancel this trip\?/i)
        ).toBeInTheDocument();
        await userEvent.click(
            within(dialog).getByRole('button', { name: /^cancel trip$/i })
        );
        await waitFor(() =>
            expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1)
        );
        const input = mockSaveMutateAsync.mock.calls[0][0];
        expect(input.tripStatusId).toBe('ts-cancel');
        expect(mockNavigate).toHaveBeenCalledWith(
            '/trip-detail?id=trip-uuid-9'
        );
    });

    it('confirms + performs "Delete trip" from the kebab menu', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /more actions/i })
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: /delete trip/i })
        );
        const dialog = await screen.findByRole('dialog');
        expect(
            within(dialog).getByText(/delete this trip\?/i)
        ).toBeInTheDocument();
        await userEvent.click(
            within(dialog).getByRole('button', { name: /^delete$/i })
        );
        await waitFor(() =>
            expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
                id: 'trip-uuid-9',
                notifyParticipants: true,
            })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/trips');
    });

    it('dismisses the confirm dialog with "Keep trip"', async () => {
        seedLookups();
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /more actions/i })
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: /delete trip/i })
        );
        await screen.findByRole('dialog');
        await userEvent.click(
            screen.getByRole('button', { name: /keep trip/i })
        );
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
        expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    });

    it('shows the notify-participants toggle when others are on the trip', async () => {
        seedLookups();
        renderStepperWith(
            editSteps,
            editTrip({
                organizer: [{ id: 1, userId: 'u1' } as never],
                friends: [
                    { id: 1, userId: 'u1' } as never,
                    { id: 2, userId: 'u2' } as never,
                ],
            })
        );
        const toggle = screen.getByRole('checkbox');
        expect(toggle).toBeChecked();
        await userEvent.click(toggle);
        expect(toggle).not.toBeChecked();
    });

    it('opens the paywall when an edit save hits the trip cap', async () => {
        mockUser = { isPaidMember: false };
        seedLookups();
        mockSaveMutateAsync.mockRejectedValueOnce(
            new TripCapReachedError({ currentCount: 2, cap: 2 })
        );
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /save changes/i })
        );
        expect(await screen.findByTestId('paywall-modal')).toHaveTextContent(
            '2/2'
        );
    });

    it('surfaces a delete failure inline', async () => {
        mockUser = { isPaidMember: true };
        seedLookups();
        mockDeleteMutateAsync.mockRejectedValueOnce(new Error('delete boom'));
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /more actions/i })
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: /delete trip/i })
        );
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: /^delete$/i })
        );
        expect(
            await screen.findByText('delete boom')
        ).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalledWith('/trips');
    });

    it('errors when cancelling a trip cannot resolve the trip type', async () => {
        mockUser = { isPaidMember: true };
        // No lookups seeded → resolveInteraryTypeId returns null.
        renderStepperWith(editSteps, editTrip());

        await userEvent.click(
            screen.getByRole('button', { name: /more actions/i })
        );
        await userEvent.click(
            await screen.findByRole('menuitem', { name: /cancel trip/i })
        );
        const dialog = await screen.findByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: /^cancel trip$/i })
        );
        expect(
            await screen.findByText(/could not resolve trip type/i)
        ).toBeInTheDocument();
        expect(mockSaveMutateAsync).not.toHaveBeenCalled();
    });

    it('shows a busy status while an edit save is in flight', () => {
        mockSaveIsPending = true;
        seedLookups();
        renderStepperWith(editSteps, editTrip());
        expect(screen.getByRole('status')).toHaveTextContent(
            /saving changes/i
        );
    });
});
