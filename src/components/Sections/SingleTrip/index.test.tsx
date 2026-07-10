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

import SingleTrip from './index';

beforeEach(() => {
    mockDispatch.mockReset();
});

describe('SingleTrip', () => {
    it('mounts the shared trip stepper in single mode', () => {
        renderWithProviders(<SingleTrip />);
        const steps = screen.getByTestId('trip-steps');
        expect(steps).toHaveAttribute('data-mode', 'single');
        expect(steps).toHaveTextContent('Plan your trip');
        expect(mockTripStepsProps.containerClassName).toBe('singleTrip');
    });

    it('dispatches basicInfo when a basic field changes', () => {
        renderWithProviders(<SingleTrip />);
        mockTripStepsProps.onBasicChange('tripName', {
            target: { value: 'Peru trek' },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'basicInfo',
            p: { tripName: 'Peru trek' },
        });
    });

    it('dispatches editPlace on an "edit" place event', () => {
        renderWithProviders(<SingleTrip />);
        mockTripStepsProps.onChangePlace({
            activity: {
                type: 'edit',
                index: 0,
                value: { value: { name: 'Machu Picchu' }, index: 4 },
                destinationIndx: 1,
            },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'editPlace',
            p: {
                value: { name: 'Machu Picchu' },
                itineraryIndex: 0,
                activityIndex: 4,
                destinationIndx: 1,
            },
        });
    });

    it('dispatches addBudget on an "add" budget event', () => {
        renderWithProviders(<SingleTrip />);
        mockTripStepsProps.onChangeBudget({
            activity: {
                type: 'add',
                value: { value: 80, activityId: 'a9' },
                destinationIndx: 0,
            },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'addBudget',
            p: { value: 80, activityId: 'a9', destinationIndx: 0 },
        });
    });

    it('dispatches addDestination and deleteDestination on destination events', () => {
        renderWithProviders(<SingleTrip />);
        const value = { city: 'Cusco' };
        mockTripStepsProps.onChangeDestination({
            startDate: '2026-02-01',
            endDate: '2026-02-04',
            activity: { type: 'add', value, index: 0 },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'addDestination',
            p: {
                startDate: '2026-02-01',
                endDate: '2026-02-04',
                value,
                index: 0,
            },
        });

        mockTripStepsProps.onChangeDestination({
            activity: { type: 'delete', value: 3 },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
            action: 'deleteDestination',
            p: { index: 3 },
        });
    });
});
