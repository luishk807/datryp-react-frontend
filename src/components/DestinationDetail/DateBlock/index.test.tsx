import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/renderWithProviders';
import { TRIP_BASIC } from 'constants';
import type { Destination } from 'types';

let mockSingleProps: any;
let mockMultipleProps: any;
vi.mock('components/DestinationDetail/Single', () => ({
    default: (props: any) => {
        mockSingleProps = props;
        return <div data-testid="single" />;
    },
}));
vi.mock('components/DestinationDetail/Multiple', () => ({
    default: (props: any) => {
        mockMultipleProps = props;
        return <div data-testid="multiple" />;
    },
}));

import DateBlock from './index';

const singleDest = (): Destination =>
    ({
        id: 1,
        country: { id: 1, name: 'France' },
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        itinerary: [
            {
                id: 10,
                date: '2026-08-01',
                activities: [{ id: 100, name: 'Louvre', kind: 'place' }],
            },
        ],
    }) as unknown as Destination;

beforeEach(() => {
    mockSingleProps = undefined;
    mockMultipleProps = undefined;
});

describe('DateBlock — single trip', () => {
    it('renders the dark date header and the day\'s activities via SingleTrips', () => {
        render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-08-01"
                endDate="2026-08-01"
                destinations={[singleDest()]}
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(screen.getByTestId('single')).toBeInTheDocument();
        // The matching day's activities are forwarded.
        expect(mockSingleProps.trips).toHaveLength(1);
        expect(mockSingleProps.country).toBe('France');
    });

    it('shows a start–end range in the header when the block spans multiple days', () => {
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-08-01"
                endDate="2026-08-03"
                destinations={[singleDest()]}
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        // Two title spans render for a spanning block (start + end).
        expect(container.querySelectorAll('.header span.title').length).toBe(2);
    });

    it('passes null trips when no itinerary day matches the block date', () => {
        render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-09-09"
                endDate="2026-09-09"
                destinations={[singleDest()]}
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(mockSingleProps.trips).toBeNull();
    });
});

describe('DateBlock — multi trip', () => {
    it('renders MultipleTrips (no date header) and forwards the explicit destination', () => {
        const dest = singleDest();
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.MULTIPLE.id}
                startDate="2026-08-01"
                endDate="2026-08-03"
                destination={dest}
                destinations={[dest]}
                sameDayFromCountry="Spain"
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(screen.getByTestId('multiple')).toBeInTheDocument();
        // Destination-first: the date header is suppressed.
        expect(container.querySelector('.header')).toBeNull();
        expect(mockMultipleProps.trips).toEqual([dest]);
        expect(mockMultipleProps.sameDayFromCountry).toBe('Spain');
    });
});

describe('DateBlock — empty-day trimming', () => {
    it('hides an empty single-trip day in view mode (returns null)', () => {
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-09-09"
                endDate="2026-09-09"
                destinations={[singleDest()]}
                isViewMode
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('hides an empty day once the trip is Confirmed', () => {
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-09-09"
                endDate="2026-09-09"
                destinations={[singleDest()]}
                tripStatusName="Confirmed"
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('keeps a populated day visible even in view mode', () => {
        render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-08-01"
                endDate="2026-08-01"
                destinations={[singleDest()]}
                isViewMode
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(screen.getByTestId('single')).toBeInTheDocument();
    });
});

describe('DateBlock — status theme', () => {
    it.each([
        ['Planning', 'status-planning'],
        ['Confirmed', 'status-confirmed'],
        ['Completed', 'status-completed'],
        ['Cancelled', 'status-cancelled'],
    ])('applies the %s theme class', (status, cls) => {
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-08-01"
                endDate="2026-08-01"
                destinations={[singleDest()]}
                tripStatusName={status}
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(container.querySelector(`.date-block.${cls}`)).toBeInTheDocument();
    });

    it('defaults to the confirmed theme when the status is unknown', () => {
        const { container } = render(
            <DateBlock
                typeId={TRIP_BASIC.SINGLE.id}
                startDate="2026-08-01"
                endDate="2026-08-01"
                destinations={[singleDest()]}
                tripStatusName="Whatever"
                onChangeBudget={vi.fn()}
                onChangePlace={vi.fn()}
            />
        );
        expect(
            container.querySelector('.date-block.status-confirmed')
        ).toBeInTheDocument();
    });
});
