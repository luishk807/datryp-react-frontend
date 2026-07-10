import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { FlightInfo, TransitInfo } from 'types';
import type { TransportDraft } from '../types';
import DescribeStep, { type DescribeStepProps } from './index';

// FlightFields / TransitFields are separately tested; stub them to thin
// harnesses that expose DescribeStep's setter callbacks as buttons + echo the
// segment counts, so we drive DescribeStep's own reducer logic deterministically.
vi.mock('components/common/TransportFields/FlightFields', () => ({
    default: ({
        segments,
        onField,
        onAddLeg,
        onRemoveLeg,
    }: {
        segments: FlightInfo[];
        onField: (idx: number, name: keyof FlightInfo, value: string) => void;
        onAddLeg: () => void;
        onRemoveLeg: (idx: number) => void;
    }) => (
        <div data-testid="flight-fields">
            <span data-testid="flight-count">{segments.length}</span>
            <button
                type="button"
                onClick={() => onField(0, 'flightNumber', 'UA900')}
            >
                set-flight-number
            </button>
            <button
                type="button"
                onClick={() => onField(0, 'departDate', '2026-09-01')}
            >
                set-depart-date
            </button>
            <button type="button" onClick={onAddLeg}>
                add-leg
            </button>
            <button type="button" onClick={() => onRemoveLeg(1)}>
                remove-leg
            </button>
        </div>
    ),
}));

vi.mock('components/common/TransportFields/TransitFields', () => ({
    default: ({
        segments,
        isRental,
        onField,
    }: {
        segments: TransitInfo[];
        isRental: boolean;
        onField: (idx: number, name: keyof TransitInfo, value: string) => void;
    }) => (
        <div data-testid="transit-fields">
            <span data-testid="transit-rental">{String(isRental)}</span>
            <span data-testid="transit-count">{segments.length}</span>
            <button
                type="button"
                onClick={() => onField(0, 'operator', 'Renfe')}
            >
                set-operator
            </button>
        </div>
    ),
}));

const seg = (date: string): FlightInfo & TransitInfo => ({
    departDate: date,
    arrivalDate: date,
});

const baseDraft = (over: Partial<TransportDraft> = {}): TransportDraft => ({
    kind: ACTIVITY_KIND.FLIGHT,
    smartText: '',
    flightSegments: [],
    transitSegments: [],
    cost: '',
    ...over,
});

const Harness = ({
    initial,
    ...rest
}: { initial: TransportDraft } & Partial<DescribeStepProps>) => {
    const [transport, setTransport] = useState<TransportDraft>(initial);
    return (
        <>
            <DescribeStep
                mode="add"
                transport={transport}
                setTransport={setTransport}
                isoDefaultDate="2026-06-06"
                emptyFlightSegment={seg}
                emptyTransitSegment={seg}
                lookupNotFound={{}}
                method={ADD_METHOD.SMART}
                {...rest}
            />
            <pre data-testid="dump">{JSON.stringify(transport)}</pre>
        </>
    );
};

const dump = () =>
    JSON.parse(screen.getByTestId('dump').textContent || '{}') as TransportDraft;

describe('AddDestination/DescribeStep', () => {
    it('renders the destination-only entry for the "add later" (no kind) path', async () => {
        const onChangeType = vi.fn();
        renderWithProviders(
            <Harness
                initial={baseDraft({ kind: null })}
                onChangeType={onChangeType}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Where are you going?' })
        ).toBeInTheDocument();
        expect(screen.getByText('No transport')).toBeInTheDocument();

        await userEvent.type(screen.getByRole('textbox'), 'Panama');
        expect(dump().smartText).toBe('Panama');

        await userEvent.click(screen.getByRole('button', { name: 'Change' }));
        expect(onChangeType).toHaveBeenCalledTimes(1);
    });

    it('shows the smart box + Edit-details toggle for a flight in SMART mode', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [{}] })}
                onChangeType={vi.fn()}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Describe your Flight' })
        ).toBeInTheDocument();
        // Change-type row reflects the active mode.
        expect(
            screen.getByRole('button', { name: 'Change' })
        ).toBeInTheDocument();
        // Empty draft → free-text smart box shown, fields collapsed.
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.queryByTestId('flight-fields')).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit details' })
        );
        expect(screen.getByTestId('flight-fields')).toBeInTheDocument();
    });

    it('auto-parses seeded smart text into the flight segments', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    smartText: 'UA123',
                    flightSegments: [{}],
                })}
            />
        );
        await waitFor(() =>
            expect(dump().flightSegments[0].flightNumber).toBe('UA123')
        );
        expect(dump().smartText).toBe('UA123');
    });

    it('opens the fields immediately and hides the smart box in CUSTOM mode', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByTestId('flight-fields')).toBeInTheDocument();
        // CUSTOM suppresses the smart box → no free-text entry.
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('updates a flight field via the fields callback', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'set-flight-number' })
        );
        expect(dump().flightSegments[0].flightNumber).toBe('UA900');
    });

    it('mirrors a new depart date onto an unset arrival date', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [{}] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'set-depart-date' })
        );
        expect(dump().flightSegments[0].departDate).toBe('2026-09-01');
        expect(dump().flightSegments[0].arrivalDate).toBe('2026-09-01');
    });

    it('adds and removes stopover legs', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByTestId('flight-count')).toHaveTextContent('1');
        await userEvent.click(screen.getByRole('button', { name: 'add-leg' }));
        expect(screen.getByTestId('flight-count')).toHaveTextContent('2');
        await userEvent.click(
            screen.getByRole('button', { name: 'remove-leg' })
        );
        expect(screen.getByTestId('flight-count')).toHaveTextContent('1');
    });

    it('edits the transport cost', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.type(screen.getByRole('spinbutton'), '250');
        expect(dump().cost).toBe('250');
    });

    it('renders transit fields for a train (non-rental) and updates a field', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [seg('2026-06-06')],
                })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByTestId('transit-fields')).toBeInTheDocument();
        expect(screen.getByTestId('transit-rental')).toHaveTextContent('false');
        await userEvent.click(
            screen.getByRole('button', { name: 'set-operator' })
        );
        expect(dump().transitSegments[0].operator).toBe('Renfe');
    });

    it('flags a rental car as rental in the transit fields', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.RENTAL_CAR,
                    transitSegments: [seg('2026-06-06')],
                })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByTestId('transit-rental')).toHaveTextContent('true');
    });

    it('uses the kind-specific smart placeholder (rental)', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.RENTAL_CAR,
                    transitSegments: [{}],
                })}
            />
        );
        expect(
            screen.getByPlaceholderText('Hertz pickup PTY June 6 10am $50')
        ).toBeInTheDocument();
    });

    it('warns about a half-resolved flight route', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    flightSegments: [{ departAirport: 'BKK' }],
                })}
            />
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(
            "We couldn't find an airport for part of your route"
        );
        // Details collapsed → the "open Edit details" hint variant.
        expect(alert).toHaveTextContent('Open Edit details');
    });

    it('surfaces a per-segment lookup-not-found hint', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                lookupNotFound={{ 0: 'UA999' }}
            />
        );
        expect(screen.getByText(/Couldn't find UA999/)).toBeInTheDocument();
    });

    it('collapses a seeded flight into a chip and re-reveals the input', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    flightSegments: [
                        {
                            flightNumber: 'CM100',
                            departAirport: 'PTY',
                            arrivalAirport: 'BOG',
                            departDate: '2026-06-06',
                        },
                    ],
                })}
                onChangeType={vi.fn()}
            />
        );
        // Chip form: no smart textbox until "Edit description" is pressed.
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit description' })
        );
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('auto-parses seeded transit smart text (operator, number, cost)', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.TRAIN,
                    smartText: 'Renfe 3152 Madrid to Barcelona $30',
                    transitSegments: [{}],
                })}
            />
        );
        await waitFor(() =>
            expect(dump().transitSegments[0].operator).toBe('Renfe')
        );
        expect(dump().transitSegments[0].number).toBe('3152');
        expect(dump().cost).toBe('30');
    });

    it('updates a transit field even when the segment list starts empty', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [],
                })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'set-operator' })
        );
        expect(dump().transitSegments[0].operator).toBe('Renfe');
    });

    it('updates a flight field even when the segment list starts empty', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'set-flight-number' })
        );
        expect(dump().flightSegments[0].flightNumber).toBe('UA900');
    });

    it('mirrors a new depart date when arrival equals the old depart date', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'set-depart-date' })
        );
        expect(dump().flightSegments[0].arrivalDate).toBe('2026-09-01');
    });

    it('appends a stopover from a leg with no prior arrival date', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [{}] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'add-leg' }));
        expect(screen.getByTestId('flight-count')).toHaveTextContent('2');
    });

    it('shows the open-details variant of the unresolved-airport warning', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    flightSegments: [{ departAirport: 'BKK' }],
                })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Pick the nearest airport in the fields below'
        );
    });

    it('ignores a remove request when only one leg remains', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                method={ADD_METHOD.CUSTOM}
            />
        );
        expect(screen.getByTestId('flight-count')).toHaveTextContent('1');
        await userEvent.click(
            screen.getByRole('button', { name: 'remove-leg' })
        );
        expect(screen.getByTestId('flight-count')).toHaveTextContent('1');
    });

    it('in edit mode opens the fields with no change-type row', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [seg('2026-06-06')] })}
                mode="edit"
                method={undefined}
            />
        );
        expect(screen.getByTestId('flight-fields')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Change' })
        ).not.toBeInTheDocument();
    });
});
