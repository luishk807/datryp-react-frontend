import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

interface TripStepsProps {
    title: string;
    containerClassName: string;
    currentType: string;
    onBasicChange: (id: string, e: { target: { value: string } }) => void;
    onChangePlace: (e: {
        date?: string;
        activity: Record<string, unknown>;
    }) => void;
    onChangeBudget: (e: { activity: Record<string, unknown> }) => void;
    onChangeDestination: (e: Record<string, unknown>) => void;
}

const { mockDispatch } = vi.hoisted(() => ({ mockDispatch: vi.fn() }));

// Capture the props MultiTrip hands to TripSteps so we can drive its change
// handlers directly and assert the resulting dispatched actions.
let mockTripStepsProps: TripStepsProps;
vi.mock('components/TripSteps', () => ({
    default: (props: TripStepsProps) => {
        mockTripStepsProps = props;
        return (
            <div data-testid="trip-steps" data-mode={props.currentType}>
                {props.title}
            </div>
        );
    },
}));

// Action creators return identifiable objects so we can assert the exact
// payload MultiTrip maps each event into.
vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
    basicInfo: (p: unknown) => ({ action: 'basicInfo', p }),
    addPlace: (p: unknown) => ({ action: 'addPlace', p }),
    editPlace: (p: unknown) => ({ action: 'editPlace', p }),
    deletePlace: (p: unknown) => ({ action: 'deletePlace', p }),
    addBudget: (p: unknown) => ({ action: 'addBudget', p }),
    addDestination: (p: unknown) => ({ action: 'addDestination', p }),
    editDestination: (p: unknown) => ({ action: 'editDestination', p }),
    deleteDestination: (p: unknown) => ({ action: 'deleteDestination', p }),
}));

import MultiTrip from './index';

beforeEach(() => {
    mockDispatch.mockReset();
});

describe('MultipleTrip', () => {
    it('mounts the shared trip stepper in multiple mode', () => {
        renderWithProviders(<MultiTrip />);
        const steps = screen.getByTestId('trip-steps');
        expect(steps).toHaveAttribute('data-mode', 'multiple');
        expect(steps).toHaveTextContent('Plan your trip');
        expect(mockTripStepsProps.containerClassName).toBe('multriTrip');
    });

    it('dispatches basicInfo when a basic field changes', () => {
        renderWithProviders(<MultiTrip />);
        mockTripStepsProps.onBasicChange('tripName', {
            target: { value: 'Japan 2026' },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'basicInfo',
            p: { tripName: 'Japan 2026' },
        });
    });

    it('dispatches addPlace on an "add" place event', () => {
        renderWithProviders(<MultiTrip />);
        const value = { name: 'Sensoji' };
        mockTripStepsProps.onChangePlace({
            date: '2026-01-01',
            activity: { type: 'add', index: 2, value, destinationIndx: 1 },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'addPlace',
            p: { date: '2026-01-01', value, index: 2, destinationIndx: 1 },
        });
    });

    it('dispatches addBudget on an "add" budget event', () => {
        renderWithProviders(<MultiTrip />);
        mockTripStepsProps.onChangeBudget({
            activity: {
                type: 'add',
                value: { value: 120, activityId: 'a1' },
                destinationIndx: 3,
            },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'addBudget',
            p: { value: 120, activityId: 'a1', destinationIndx: 3 },
        });
    });

    it('dispatches editDestination and deleteDestination on destination events', () => {
        renderWithProviders(<MultiTrip />);
        const value = { city: 'Kyoto' };
        mockTripStepsProps.onChangeDestination({
            startDate: '2026-01-02',
            endDate: '2026-01-05',
            activity: { type: 'edit', value, index: 1 },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'editDestination',
            p: {
                startDate: '2026-01-02',
                endDate: '2026-01-05',
                removeIndexes: [],
                value,
                index: 1,
            },
        });

        mockTripStepsProps.onChangeDestination({
            activity: { type: 'delete', value: 2 },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'deleteDestination',
            p: { index: 2 },
        });
    });
});
