import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ADD_METHOD } from 'constants';
import type { FlightInfo } from 'types';
import type { FormController, FormMode, PlaceDraft } from '../../types';
import FlightForm from './index';

// The per-segment lookup watcher fires real network hooks; capture its props
// instead so tests can drive the callbacks the form wires into it.
const mockFlightWatchers: Record<string, any>[] = [];
vi.mock('../../FlightSegmentLookupWatcher', () => ({
    default: (props: Record<string, any>) => {
        mockFlightWatchers.push(props);
        return null;
    },
}));

const flightSeg = (over: Partial<FlightInfo> = {}): FlightInfo => ({
    flightNumber: 'UA123',
    departAirport: 'JFK',
    arrivalAirport: 'LAX',
    departDate: '2026-06-15',
    departTime: '10:30',
    arrivalTime: '15:20',
    ...over,
});

const makeController = (
    place: PlaceDraft = {},
    over: Partial<FormController> = {},
): FormController =>
    ({
        place,
        smartEntry: '',
        handleSmartEntry: vi.fn(),
        handleOnChange: vi.fn(),
        emptySegment: () => flightSeg({ flightNumber: '' }),
        isoDefaultDate: '2026-06-15',
        handleRemoveSegment: vi.fn(),
        applyFlightLookup: vi.fn(),
        setLookupNotFound: vi.fn(),
        handleLookupLoadingChange: vi.fn(),
        lookupLoading: new Set<number>(),
        lookupNotFound: {},
        handleSegmentField: vi.fn(),
        setArrivalCity: vi.fn(),
        handleAddSegment: vi.fn(),
        tripMinDate: undefined,
        tripMaxDate: undefined,
        ...over,
    }) as unknown as FormController;

const SMART: FormMode = { method: ADD_METHOD.SMART };
const CUSTOM: FormMode = { method: ADD_METHOD.CUSTOM };
const EDIT: FormMode = 'edit';

const SMART_PLACEHOLDER =
    'Try: "UA123 tomorrow" or "UA123 today stopover BA245"';

const expandFirstSegment = async () => {
    await userEvent.click(
        screen.getAllByRole('button', { expanded: false })[0],
    );
};

describe('FlightForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFlightWatchers.length = 0;
    });

    it('custom mode: renders the segment cards + cost field, no smart box', () => {
        renderWithProviders(
            <FlightForm
                controller={makeController({ flightSegments: [flightSeg()] })}
                mode={CUSTOM}
            />,
        );
        expect(screen.getByText('JFK → LAX')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add stopover' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(SMART_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('custom mode: typing the cost fires handleOnChange with the cost field', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <FlightForm
                controller={makeController(
                    { flightSegments: [flightSeg()] },
                    { handleOnChange },
                )}
                mode={CUSTOM}
            />,
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
            '5',
        );
        expect(handleOnChange).toHaveBeenCalledWith('cost', '5');
    });

    it('custom mode: falls back to an empty segment when the draft has none', () => {
        const emptySegment = vi.fn(() => flightSeg({ flightNumber: '' }));
        renderWithProviders(
            <FlightForm controller={makeController({}, { emptySegment })} mode={CUSTOM} />,
        );
        expect(emptySegment).toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Add stopover' }),
        ).toBeInTheDocument();
    });

    it('custom mode: expanding a segment reveals the idle lookup hint', async () => {
        renderWithProviders(
            <FlightForm
                controller={makeController({
                    flightSegments: [
                        flightSeg({
                            flightNumber: '',
                            departAirport: '',
                            arrivalAirport: '',
                        }),
                    ],
                })}
                mode={CUSTOM}
            />,
        );
        await expandFirstSegment();
        expect(
            screen.getByText(
                /auto-fill the airport, date, and time once you enter a flight number/,
            ),
        ).toBeInTheDocument();
    });

    it('custom mode: an expanded segment shows the looking-up spinner while a lookup runs', async () => {
        renderWithProviders(
            <FlightForm
                controller={makeController(
                    {
                        flightSegments: [
                            flightSeg({ departAirport: '', arrivalAirport: '' }),
                        ],
                    },
                    { lookupLoading: new Set<number>([0]) },
                )}
                mode={CUSTOM}
            />,
        );
        await expandFirstSegment();
        expect(
            screen.getByText(/Looking up flight details/),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    });

    it('custom mode: an expanded segment shows the not-found hint when the lookup missed', async () => {
        renderWithProviders(
            <FlightForm
                controller={makeController(
                    {
                        flightSegments: [
                            flightSeg({ departAirport: '', arrivalAirport: '' }),
                        ],
                    },
                    { lookupNotFound: { 0: 'UA999' } },
                )}
                mode={CUSTOM}
            />,
        );
        await expandFirstSegment();
        expect(
            screen.getByText(
                /find flight UA999\. Fill in the airport, date, and time below manually/,
            ),
        ).toBeInTheDocument();
    });

    it('smart mode: shows the smart-entry box + hint, hides the segment cards and cost', () => {
        renderWithProviders(
            <FlightForm
                controller={makeController({ flightSegments: [flightSeg()] })}
                mode={SMART}
            />,
        );
        expect(
            screen.getByPlaceholderText(SMART_PLACEHOLDER),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Add stopover' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Cost (optional)' }),
        ).not.toBeInTheDocument();
    });

    it('smart mode: typing the smart entry fires handleSmartEntry', async () => {
        const handleSmartEntry = vi.fn();
        renderWithProviders(
            <FlightForm
                controller={makeController(
                    { flightSegments: [flightSeg()] },
                    { handleSmartEntry },
                )}
                mode={SMART}
            />,
        );
        await userEvent.type(
            screen.getByPlaceholderText(SMART_PLACEHOLDER),
            'U',
        );
        expect(handleSmartEntry).toHaveBeenCalledWith('U');
    });

    it('smart mode: the hidden per-segment watcher forwards lookup results and misses', () => {
        // setLookupNotFound is called with an updater — run it with both a
        // matching and non-matching prev so both branches are exercised.
        const setLookupNotFound = vi.fn((fn: any) => {
            if (typeof fn === 'function') {
                fn({ 0: 'x' });
                fn({});
            }
        });
        const applyFlightLookup = vi.fn();
        const handleLookupLoadingChange = vi.fn();
        renderWithProviders(
            <FlightForm
                controller={makeController(
                    { flightSegments: [flightSeg()] },
                    {
                        setLookupNotFound,
                        applyFlightLookup,
                        handleLookupLoadingChange,
                    },
                )}
                mode={SMART}
            />,
        );
        const watcher = mockFlightWatchers[0];
        watcher.onResult({ flightNumber: 'UA123' } as any);
        watcher.onNotFound('UA123');
        watcher.onLoadingChange(true);
        expect(applyFlightLookup).toHaveBeenCalledWith(0, {
            flightNumber: 'UA123',
        });
        expect(setLookupNotFound).toHaveBeenCalled();
        expect(handleLookupLoadingChange).toHaveBeenCalledWith(0, true);
    });

    it('edit mode: renders the smart box, segment cards, and cost together', () => {
        renderWithProviders(
            <FlightForm
                controller={makeController({ flightSegments: [flightSeg()] })}
                mode={EDIT}
            />,
        );
        expect(
            screen.getByPlaceholderText(SMART_PLACEHOLDER),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add stopover' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
    });
});
