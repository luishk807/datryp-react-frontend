import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';
import { TripProvider } from 'context/TripContext';
import type { TripState } from 'types';

// ---- mutable mock state (reset in beforeEach) ----
let mockUser: { id: string; name: string } | null = null;
let mockItineraries: { id: string }[] = [];
const mockPrefetch = vi.fn();

// `sample` is a baseUrl bare specifier the app resolves but the Vitest alias
// allowlist omits; a factory mock both supplies the Planning status the module
// seeds with AND lets the runner resolve the import.
vi.mock('sample', () => ({
    status: [
        { id: 'ts-plan', name: 'Planning' },
        { id: 'ts-confirm', name: 'Confirmed' },
    ],
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => ({ data: mockItineraries }),
}));

vi.mock('api/suggestionsPrefetch', () => ({
    prefetchActivitySuggestions: (...args: unknown[]) => mockPrefetch(...args),
}));

// Hydration adapter — return a tiny, observable patch so the edit-mode
// hydration effect can be asserted without a full API itinerary shape.
vi.mock('utils/itineraryAdapter', () => ({
    apiToTripState: (trip: { id: string }) => ({
        apiId: trip.id,
        name: 'Edited Trip',
    }),
}));

// The wizard shell is exercised in its own suite; here we stub it to a
// readout of the props TripSteps feeds it (step labels + seeded trip data)
// plus buttons that drive its callbacks. Rendering labels (not the step
// `comp`s) keeps each step child from mounting its own hooks.
interface StepperStubProps {
    steps: { label: string }[];
    data?: TripState;
    onActiveStepChange?: (step: number) => void;
    onSavingChange?: (saving: boolean) => void;
}
vi.mock('components/common/StepperComp', () => ({
    default: ({
        steps,
        data,
        onActiveStepChange,
        onSavingChange,
    }: StepperStubProps) => (
        <div data-testid="stepper">
            <ul>
                {steps.map((s, i) => (
                    <li key={i}>{s.label}</li>
                ))}
            </ul>
            <span data-testid="trip-name">{data?.name ?? ''}</span>
            <span data-testid="organizer-ids">
                {(data?.organizer ?? []).map((o) => o.userId).join(',')}
            </span>
            <span data-testid="friend-ids">
                {(data?.friends ?? []).map((f) => f.userId).join(',')}
            </span>
            <button type="button" onClick={() => onSavingChange?.(true)}>
                set-saving
            </button>
            <button type="button" onClick={() => onActiveStepChange?.(0)}>
                set-step
            </button>
        </div>
    ),
    useStepperAdvance: () => ({ onAdvance: () => {} }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({
        title,
        titleAction,
        children,
    }: {
        title?: string;
        titleAction?: ReactNode;
        children: ReactNode;
    }) => (
        <div>
            {title ? <h1>{title}</h1> : null}
            <div data-testid="title-action">{titleAction}</div>
            {children}
        </div>
    ),
}));

vi.mock('components/DestinationDetail', () => ({
    default: () => <div data-testid="destination-detail" />,
}));
vi.mock('components/DestinationDetail/BasicInfo', () => ({
    default: () => <div data-testid="basic-info" />,
}));
vi.mock('components/TripTour', () => ({
    default: () => <div data-testid="trip-tour" />,
    TRIP_TOUR_STORAGE_KEY: 'trip-tour-completed-v1',
}));

import TripSteps from './index';

type StepsProps = Partial<React.ComponentProps<typeof TripSteps>>;

const renderTripSteps = (props: StepsProps = {}, route = '/single') =>
    renderWithProviders(
        <TripProvider>
            <TripSteps
                title="Plan your trip"
                currentType="single"
                onBasicChange={vi.fn()}
                onChangePlace={vi.fn()}
                onChangeBudget={vi.fn()}
                {...props}
            />
        </TripProvider>,
        { route }
    );

beforeEach(() => {
    localStorage.clear();
    // Suppress the first-visit tour auto-run timer — it isn't under test here.
    localStorage.setItem('trip-tour-completed-v1', '1');
    mockUser = { id: 'u1', name: 'Ana' };
    mockItineraries = [];
    mockPrefetch.mockReset();
});

describe('TripSteps — create flow', () => {
    it('renders the page title and the one-question-per-screen steps', async () => {
        renderTripSteps();
        expect(
            screen.getByRole('heading', { name: 'Plan your trip' })
        ).toBeInTheDocument();
        // Single mode with no preset country reveals the Destination step.
        expect(await screen.findByText('Trip type')).toBeInTheDocument();
        expect(screen.getByText('Destination')).toBeInTheDocument();
        expect(screen.getByText('Dates')).toBeInTheDocument();
        expect(screen.getByText('Itinerary')).toBeInTheDocument();
    });

    it('shows the tour help affordance only in create mode', () => {
        renderTripSteps();
        expect(
            screen.getByRole('button', {
                name: /show me how to plan a trip/i,
            })
        ).toBeInTheDocument();
    });

    it('omits the Destination step for a multi-destination trip', async () => {
        renderTripSteps({ currentType: 'multiple' });
        expect(await screen.findByText('Trip type')).toBeInTheDocument();
        expect(screen.queryByText('Destination')).not.toBeInTheDocument();
    });

    it('seeds the current user as an organizer and a participant', async () => {
        renderTripSteps();
        await waitFor(() =>
            expect(screen.getByTestId('organizer-ids')).toHaveTextContent('u1')
        );
        expect(screen.getByTestId('friend-ids')).toHaveTextContent('u1');
    });

    it('hides the tour affordance once a save is in flight', async () => {
        renderTripSteps();
        await userEvent.click(
            screen.getByRole('button', { name: 'set-saving' })
        );
        await waitFor(() =>
            expect(
                screen.queryByRole('button', {
                    name: /show me how to plan a trip/i,
                })
            ).not.toBeInTheDocument()
        );
    });

    it('handles an active-step change without crashing', async () => {
        renderTripSteps();
        await userEvent.click(
            screen.getByRole('button', { name: 'set-step' })
        );
        expect(screen.getByTestId('stepper')).toBeInTheDocument();
    });

    it('re-runs the tour when the help affordance is pressed', async () => {
        renderTripSteps();
        await userEvent.click(
            screen.getByRole('button', {
                name: /show me how to plan a trip/i,
            })
        );
        expect(screen.getByTestId('trip-tour')).toBeInTheDocument();
    });
});

describe('TripSteps — edit mode', () => {
    it('hydrates from the API trip and renders the flat edit steps', async () => {
        mockItineraries = [{ id: 'abc' }];
        renderTripSteps({}, '/single?id=abc');

        expect(
            await screen.findByText('Describe Your Trip!')
        ).toBeInTheDocument();
        expect(screen.getByText('Activities')).toBeInTheDocument();
        expect(screen.queryByText('Trip type')).not.toBeInTheDocument();
        // Hydration adapter drove the trip name into context.
        await waitFor(() =>
            expect(screen.getByTestId('trip-name')).toHaveTextContent(
                'Edited Trip'
            )
        );
    });

    it('suppresses the page title and the tour affordance in edit mode', () => {
        mockItineraries = [{ id: 'abc' }];
        renderTripSteps({}, '/single?id=abc');
        expect(
            screen.queryByRole('heading', { name: 'Plan your trip' })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: /show me how to plan a trip/i,
            })
        ).not.toBeInTheDocument();
    });
});
