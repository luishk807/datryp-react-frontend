import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { Destination } from 'types';

const mockActivitiesProps: any[] = [];
vi.mock('components/DestinationDetail/Activities', () => ({
    default: (props: any) => {
        mockActivitiesProps.push(props);
        return <div data-testid="activities" />;
    },
}));

const mockAddDestProps: any[] = [];
vi.mock('components/common/AddDestination', () => ({
    default: (props: any) => {
        mockAddDestProps.push(props);
        return (
            <button
                type="button"
                onClick={() => props.onChange({ country: { name: 'Edited' } })}
            >
                {props.type === 'edit' ? 'edit-dest' : 'add-dest'}
            </button>
        );
    },
}));

vi.mock('components/common/AirlineLogo', () => ({
    default: (props: any) => <span data-testid="airline">{props.label}</span>,
}));

const mockTransportProps: any[] = [];
vi.mock('components/DestinationDetail/Multiple/TransportHeader', () => ({
    default: (props: any) => {
        mockTransportProps.push(props);
        return (
            <div data-testid="transport-header">
                <button
                    type="button"
                    onClick={() =>
                        props.onBudgetSubmit?.([
                            {
                                user: { id: 1, userId: 'u1', name: 'Ana' },
                                budget: '40',
                            },
                        ])
                    }
                >
                    th-budget
                </button>
            </div>
        );
    },
}));

vi.mock('components/common/FormFields/DialogBox', () => ({
    default: (props: any) =>
        props.isViewMode ? null : (
            <button type="button" onClick={props.onConfirm}>
                {props.buttonLabel}
            </button>
        ),
}));

import Multiple from './index';

const dest = (over: Partial<Destination> = {}): Destination =>
    ({
        id: 1,
        country: { id: 1, name: 'Japan' },
        startDate: '2026-08-01',
        endDate: '2026-08-01',
        itinerary: [
            {
                id: 10,
                date: '2026-08-01',
                activities: [{ id: 100, name: 'Shibuya', kind: ACTIVITY_KIND.PLACE }],
            },
        ],
        ...over,
    }) as unknown as Destination;

const baseProps = {
    onChangeDestination: vi.fn(),
    onChangeBudget: vi.fn(),
    onChangePlace: vi.fn(),
};

beforeEach(() => {
    mockActivitiesProps.length = 0;
    mockAddDestProps.length = 0;
    mockTransportProps.length = 0;
});

describe('Multiple — destination rendering', () => {
    it('renders the country name, single-day range, and the day\'s activities', () => {
        const d = dest();
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[d]} />);
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByTestId('activities')).toBeInTheDocument();
        // No transport → no header band.
        expect(screen.queryByTestId('transport-header')).not.toBeInTheDocument();
    });

    it('falls back to "Destination not set" when the country has no name', () => {
        const d = dest({ country: { id: 0, name: '' } as any });
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[d]} />);
        expect(screen.getByText('Destination not set')).toBeInTheDocument();
    });

    it('spans a multi-day destination into one dated section per day', () => {
        const d = dest({ startDate: '2026-08-01', endDate: '2026-08-03' });
        const { container } = render(
            <Multiple {...baseProps} trips={[d]} allDestinations={[d]} />
        );
        // 3 days → 3 day labels + 3 Activities instances.
        expect(container.querySelectorAll('.destination-day-label').length).toBe(3);
        expect(mockActivitiesProps.length).toBe(3);
    });

    it('renders nothing when there are no trips', () => {
        const { container } = render(
            <Multiple {...baseProps} trips={null} allDestinations={[]} />
        );
        expect(container.querySelector('.multrip-content-item')).toBeNull();
    });

    it('shows the same-day flight-boundary marker', () => {
        const d = dest();
        render(
            <Multiple
                {...baseProps}
                trips={[d]}
                allDestinations={[d]}
                sameDayFromCountry="Spain"
            />
        );
        expect(screen.getByText('Same day — after Spain')).toBeInTheDocument();
    });
});

describe('Multiple — transport header', () => {
    it('shows the flight header band + single flight number with airline logo', () => {
        const d = dest({
            flightInfo: {
                mode: ACTIVITY_KIND.FLIGHT,
                segments: [
                    {
                        flightNumber: 'UA1',
                        departAirport: 'JFK',
                        arrivalAirport: 'HND',
                    },
                ],
            } as any,
        });
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[d]} />);
        expect(screen.getByTestId('transport-header')).toBeInTheDocument();
        expect(screen.getByTestId('airline')).toBeInTheDocument();
        expect(mockTransportProps[0].mode).toBe(ACTIVITY_KIND.FLIGHT);
    });

    it('shows a ground-transit headline (operator + number, no logo)', () => {
        const d = dest({
            flightInfo: {
                mode: ACTIVITY_KIND.TRAIN,
                segments: [
                    {
                        carrier: 'JR',
                        flightNumber: '500',
                        departAirport: 'Tokyo',
                        arrivalAirport: 'Kyoto',
                    },
                ],
            } as any,
        });
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[d]} />);
        expect(screen.getByText('JR 500')).toBeInTheDocument();
        expect(screen.queryByTestId('airline')).not.toBeInTheDocument();
    });

    it('drops the legacy first flight ACTIVITY from the card list (header owns it)', () => {
        const d = dest({
            // Bare stub flightInfo → header sources from the flight activity.
            flightInfo: {} as any,
            itinerary: [
                {
                    id: 10,
                    date: '2026-08-01',
                    activities: [
                        {
                            id: 200,
                            name: 'Flight',
                            kind: ACTIVITY_KIND.FLIGHT,
                            flightSegments: [
                                { flightNumber: 'UA1', departAirport: 'JFK', arrivalAirport: 'HND' },
                            ],
                        },
                        { id: 201, name: 'Museum', kind: ACTIVITY_KIND.PLACE },
                    ],
                },
            ] as any,
        });
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[d]} />);
        expect(screen.getByTestId('transport-header')).toBeInTheDocument();
        const forwarded = mockActivitiesProps[0].activities;
        // The header-owned flight is filtered out; the place survives.
        expect(forwarded.some((a: any) => a.kind === ACTIVITY_KIND.FLIGHT)).toBe(
            false
        );
        expect(forwarded.some((a: any) => a.id === 201)).toBe(true);
    });

    it('forwards a header budget split back as a destination edit with derived paidBy', async () => {
        const onChangeDestination = vi.fn();
        const d = dest({
            flightInfo: {
                mode: ACTIVITY_KIND.FLIGHT,
                segments: [{ flightNumber: 'UA1', departAirport: 'JFK', arrivalAirport: 'HND' }],
            } as any,
        });
        render(
            <Multiple
                {...baseProps}
                onChangeDestination={onChangeDestination}
                trips={[d]}
                allDestinations={[d]}
                participants={[{ id: 1, userId: 'u1', name: 'Ana' } as any]}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'th-budget' }));
        expect(onChangeDestination).toHaveBeenCalledWith(
            'edit',
            expect.objectContaining({
                flightInfo: expect.objectContaining({
                    budgets: [expect.objectContaining({ budget: '40' })],
                    paidBy: expect.objectContaining({ id: 'u1', name: 'Ana' }),
                }),
            })
        );
    });
});

describe('Multiple — destination actions', () => {
    it('edits a destination through AddDestinationBtn', async () => {
        const onChangeDestination = vi.fn();
        const d = dest();
        render(
            <Multiple
                {...baseProps}
                onChangeDestination={onChangeDestination}
                trips={[d]}
                allDestinations={[d]}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'edit-dest' }));
        expect(onChangeDestination).toHaveBeenCalledWith('edit', {
            country: { name: 'Edited' },
        });
    });

    it('deletes a destination through the confirm dialog', async () => {
        const onChangeDestination = vi.fn();
        const d = dest({ id: 77 });
        render(
            <Multiple
                {...baseProps}
                onChangeDestination={onChangeDestination}
                trips={[d]}
                allDestinations={[d]}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onChangeDestination).toHaveBeenCalledWith('delete', 77);
    });

    it('hides the edit/delete actions in view mode', () => {
        const d = dest();
        render(
            <Multiple {...baseProps} trips={[d]} allDestinations={[d]} isViewMode />
        );
        expect(
            screen.queryByRole('button', { name: 'edit-dest' })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Delete' })
        ).not.toBeInTheDocument();
    });
});

describe('Multiple — index resolution + forwarding', () => {
    it('forwards place/budget changes with the destination\'s real index and day date', () => {
        const onChangePlace = vi.fn();
        const onChangeBudget = vi.fn();
        const other = dest({ id: 5 });
        const target = dest({ id: 9 });
        render(
            <Multiple
                {...baseProps}
                onChangePlace={onChangePlace}
                onChangeBudget={onChangeBudget}
                trips={[target]}
                allDestinations={[other, target]}
            />
        );
        // target sits at index 1 in allDestinations (matched by reference).
        mockActivitiesProps[0].onChangePlace('add', { name: 'Ramen' });
        expect(onChangePlace).toHaveBeenCalledWith(
            'add',
            { name: 'Ramen' },
            1,
            '2026-08-01'
        );
        mockActivitiesProps[0].onChangeBudget('add', { activityId: 1 });
        expect(onChangeBudget).toHaveBeenCalledWith('add', { activityId: 1 }, 1);
    });

    it('falls back to matching by id when the reference is not in allDestinations', () => {
        const d = dest({ id: 42 });
        const clone = { ...d };
        render(
            <Multiple {...baseProps} trips={[d]} allDestinations={[clone as any]} />
        );
        expect(mockActivitiesProps[0].destIdx).toBe(0);
    });

    it('falls back to the loop index when no destination matches', () => {
        const d = dest({ id: 42 });
        render(<Multiple {...baseProps} trips={[d]} allDestinations={[]} />);
        expect(mockActivitiesProps[0].destIdx).toBe(0);
    });
});
