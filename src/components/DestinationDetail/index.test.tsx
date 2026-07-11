import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { Destination, TripBasicType } from 'types';

// Capture DndContext's onDragEnd so handleDragEnd can be driven directly
// (simulating a full drag through the real sensors is impractical in jsdom).
let capturedDragEnd: any;
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragEnd }: any) => {
        capturedDragEnd = onDragEnd;
        return <div>{children}</div>;
    },
    MouseSensor: function MouseSensor() {},
    TouchSensor: function TouchSensor() {},
    KeyboardSensor: function KeyboardSensor() {},
    useSensor: () => ({}),
    useSensors: () => [],
    closestCenter: {},
}));
vi.mock('@dnd-kit/sortable', () => ({
    sortableKeyboardCoordinates: () => {},
}));

const mockDateBlockProps: any[] = [];
vi.mock('./DateBlock', () => ({
    default: (props: any) => {
        mockDateBlockProps.push(props);
        return <div data-testid="date-block" data-index={props.index} />;
    },
}));

let addDestProps: any;
vi.mock('components/common/AddDestination', () => ({
    default: (props: any) => {
        addDestProps = props;
        return (
            <button
                type="button"
                onClick={() =>
                    props.onChange({
                        startDate: '2026-08-10',
                        country: { name: 'Peru' },
                        itinerary: [],
                    })
                }
            >
                add-next
            </button>
        );
    },
}));

const mockDispatch = vi.fn();
vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
    movePlace: (payload: any) => ({ type: 'movePlace', payload }),
}));

import DestinationDetail from './index';

const SINGLE: TripBasicType = { id: 1 } as TripBasicType;
const MULTI: TripBasicType = { id: 2 } as TripBasicType;

const multiDests = (): Destination[] =>
    [
        {
            id: 1,
            country: { id: 1, name: 'Japan' },
            startDate: '2026-08-01',
            endDate: '2026-08-02',
            itinerary: [
                {
                    id: 10,
                    date: '2026-08-01',
                    activities: [{ id: 100, name: 'Shibuya', kind: ACTIVITY_KIND.PLACE }],
                },
            ],
        },
        {
            id: 2,
            country: { id: 2, name: 'Peru' },
            startDate: '2026-08-03',
            endDate: '2026-08-04',
            itinerary: [
                {
                    id: 20,
                    date: '2026-08-03',
                    activities: [{ id: 200, name: 'Machu Picchu', kind: ACTIVITY_KIND.PLACE }],
                },
            ],
        },
    ] as unknown as Destination[];

const baseProps = {
    onChangeBudget: vi.fn(),
    onChangePlace: vi.fn(),
    onChangeDestination: vi.fn(),
};

beforeEach(() => {
    mockDateBlockProps.length = 0;
    addDestProps = undefined;
    mockDispatch.mockReset();
    capturedDragEnd = undefined;
});

describe('DestinationDetail — timeline rendering', () => {
    it('renders one date block per calendar day of a single trip', () => {
        render(
            <DestinationDetail
                {...baseProps}
                type={SINGLE}
                startDate="2026-08-01"
                endDate="2026-08-02"
                destinations={[
                    {
                        id: 1,
                        country: { id: 1, name: 'Japan' },
                        itinerary: [],
                    } as unknown as Destination,
                ]}
            />
        );
        expect(screen.getAllByTestId('date-block')).toHaveLength(2);
        // Single trips never expose the "add next destination" affordance.
        expect(
            screen.queryByRole('button', { name: 'add-next' })
        ).not.toBeInTheDocument();
    });

    it('renders one block per destination on a multi trip and the add-next button', () => {
        render(
            <DestinationDetail
                {...baseProps}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        expect(screen.getAllByTestId('date-block')).toHaveLength(2);
        expect(
            screen.getByRole('button', { name: 'add-next' })
        ).toBeInTheDocument();
    });

    it('hides the add-next button in view mode', () => {
        render(
            <DestinationDetail
                {...baseProps}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
                isViewMode
            />
        );
        expect(
            screen.queryByRole('button', { name: 'add-next' })
        ).not.toBeInTheDocument();
    });

    it('seeds the add-next default date + last arrival airport from the last destination', () => {
        const dests = multiDests();
        dests[1].flightInfo = {
            segments: [{ arrivalAirport: 'LIM' }],
        } as any;
        render(
            <DestinationDetail
                {...baseProps}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={dests}
            />
        );
        expect(addDestProps.lastArrivalAirport).toBe('LIM');
        expect(addDestProps.defaultDate).toBeTruthy();
    });
});

describe('DestinationDetail — place/budget/destination forwarding', () => {
    it('forwards an explicit destination index straight through on place change', () => {
        const onChangePlace = vi.fn();
        render(
            <DestinationDetail
                {...baseProps}
                onChangePlace={onChangePlace}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        mockDateBlockProps[0].onChangePlace('add', { name: 'Ramen' }, 1, '2026-08-03');
        expect(onChangePlace).toHaveBeenCalledWith(
            expect.objectContaining({
                activity: expect.objectContaining({
                    type: 'add',
                    destinationIndx: 1,
                }),
                date: '2026-08-03',
            })
        );
    });

    it('resolves the destination index by matching the block date when none is given', () => {
        const onChangePlace = vi.fn();
        render(
            <DestinationDetail
                {...baseProps}
                onChangePlace={onChangePlace}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        // Second block's date matches the Peru destination (index 1).
        mockDateBlockProps[1].onChangePlace('add', { name: 'Cusco' }, undefined);
        expect(onChangePlace).toHaveBeenCalledWith(
            expect.objectContaining({
                activity: expect.objectContaining({ destinationIndx: 1 }),
            })
        );
    });

    it('forwards a budget change with the block index', () => {
        const onChangeBudget = vi.fn();
        render(
            <DestinationDetail
                {...baseProps}
                onChangeBudget={onChangeBudget}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        mockDateBlockProps[0].onChangeBudget('add', { activityId: 100 }, 0);
        expect(onChangeBudget).toHaveBeenCalledWith(
            expect.objectContaining({
                activity: expect.objectContaining({ type: 'add', destinationIndx: 0 }),
            })
        );
    });

    it('computes removeIndexes for an edited destination and forwards it', () => {
        const onChangeDestination = vi.fn();
        render(
            <DestinationDetail
                {...baseProps}
                onChangeDestination={onChangeDestination}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        // Edit the first destination to span the whole trip → absorbs Peru (id 2).
        mockDateBlockProps[0].onChangeDestination('edit', {
            id: 1,
            country: { id: 1, name: 'Japan' },
            startDate: '2026-08-01',
        });
        expect(onChangeDestination).toHaveBeenCalledWith(
            expect.objectContaining({ removeIndexes: expect.any(Array) })
        );
    });

    it('adds the next destination through the trailing button', async () => {
        const onChangeDestination = vi.fn();
        render(
            <DestinationDetail
                {...baseProps}
                onChangeDestination={onChangeDestination}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'add-next' }));
        expect(onChangeDestination).toHaveBeenCalledWith(
            expect.objectContaining({
                activity: expect.objectContaining({ type: 'add' }),
            })
        );
    });
});

describe('DestinationDetail — drag and drop', () => {
    const renderMulti = () =>
        render(
            <DestinationDetail
                {...baseProps}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
                isViewMode={false}
            />
        );

    const drag = (active: any, over: any) =>
        act(() => capturedDragEnd({ active: { data: { current: active } }, over: over && { data: { current: over } } }));

    it('dispatches movePlace when an activity is dropped on a valid day in range', () => {
        renderMulti();
        drag(
            { type: 'activity', activityId: '100' },
            { type: 'day', destIdx: '0', date: '2026-08-02' }
        );
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'movePlace' })
        );
    });

    it('snaps back with a toast when dropping onto a day the target destination does not cover', () => {
        renderMulti();
        drag(
            { type: 'activity', activityId: '100' },
            { type: 'activity', destIdx: '1', date: '2026-08-10' }
        );
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(
            screen.getByText("Peru doesn't cover Aug 10.")
        ).toBeInTheDocument();
    });

    it('no-ops when the activity is dropped back on its own day', () => {
        renderMulti();
        drag(
            { type: 'activity', activityId: '100' },
            { type: 'day', destIdx: '0', date: '2026-08-01' }
        );
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('ignores the drop entirely in view mode', () => {
        render(
            <DestinationDetail
                {...baseProps}
                type={MULTI}
                startDate="2026-08-01"
                endDate="2026-08-04"
                destinations={multiDests()}
                isViewMode
            />
        );
        drag(
            { type: 'activity', activityId: '100' },
            { type: 'day', destIdx: '0', date: '2026-08-02' }
        );
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('ignores a drop with no droppable target, a non-activity payload, or a bad id', () => {
        renderMulti();
        drag({ type: 'activity', activityId: '100' }, null);
        drag({ type: 'container' }, { type: 'day', destIdx: '0', date: '2026-08-02' });
        drag(
            { type: 'activity', activityId: 'not-a-number' },
            { type: 'day', destIdx: '0', date: '2026-08-02' }
        );
        drag({ type: 'activity', activityId: '100' }, { type: 'other' });
        expect(mockDispatch).not.toHaveBeenCalled();
    });
});
