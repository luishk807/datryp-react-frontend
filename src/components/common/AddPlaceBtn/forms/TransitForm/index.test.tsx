import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { TransitInfo } from 'types';
import type { FormController, FormMode, PlaceDraft } from '../../types';
import TransitForm from './index';

const mockTransitWatchers: Record<string, any>[] = [];
vi.mock('../../TransitSegmentLookupWatcher', () => ({
    default: (props: Record<string, any>) => {
        mockTransitWatchers.push(props);
        return null;
    },
}));

const transitSeg = (over: Partial<TransitInfo> = {}): TransitInfo => ({
    operator: 'Renfe',
    number: '3152',
    departStation: 'Madrid',
    arrivalStation: 'Barcelona',
    departDate: '2026-06-15',
    departTime: '10:30',
    arrivalTime: '15:20',
    ...over,
});

const makeController = (
    place: PlaceDraft = { kind: ACTIVITY_KIND.TRAIN },
    over: Partial<FormController> = {},
): FormController =>
    ({
        place,
        countryScope: 'Spain',
        handleOnChange: vi.fn(),
        setPlace: vi.fn(),
        emptyTransitSegment: () => transitSeg({ operator: '', number: '' }),
        isoDefaultDate: '2026-06-15',
        transitSmartEntry: '',
        setTransitSmartEntry: vi.fn(),
        transitSmartWarning: null,
        transitLookupLoading: new Set<number>(),
        transitLookupNotFound: {},
        setTransitLookupNotFound: vi.fn(),
        handleTransitField: vi.fn(),
        handleAddTransitSegment: vi.fn(),
        handleRemoveTransitSegment: vi.fn(),
        applyTransitLookup: vi.fn(),
        handleTransitLookupLoadingChange: vi.fn(),
        tripMinDate: undefined,
        tripMaxDate: undefined,
        ...over,
    }) as unknown as FormController;

const smart = (): FormMode => ({ method: ADD_METHOD.SMART });
const custom = (): FormMode => ({ method: ADD_METHOD.CUSTOM });

const expandFirstSegment = async () => {
    await userEvent.click(
        screen.getAllByRole('button', { expanded: false })[0],
    );
};

describe('TransitForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransitWatchers.length = 0;
    });

    it('custom mode: renders the 4-mode toggle, trip name, transit cards, and cost', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [transitSeg()],
                })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('tablist', { name: 'Ground transport mode' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(4);
        expect(
            screen.getByRole('textbox', { name: /Trip name/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add leg (transfer)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
    });

    it('custom mode: clicking a different mode tab fires setPlace', async () => {
        const setPlace = vi.fn();
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.TRAIN, transitSegments: [transitSeg()] },
                    { setPlace },
                )}
                mode={custom()}
            />,
        );
        await userEvent.click(screen.getByRole('tab', { name: 'Bus' }));
        expect(setPlace).toHaveBeenCalledTimes(1);
    });

    it('custom mode: typing trip name / cost fires the mapped handleOnChange', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.TRAIN, transitSegments: [transitSeg()] },
                    { handleOnChange },
                )}
                mode={custom()}
            />,
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: /Trip name/ }),
            'T',
        );
        expect(handleOnChange).toHaveBeenCalledWith('name', 'T');
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
            '9',
        );
        expect(handleOnChange).toHaveBeenCalledWith('cost', '9');
    });

    it('custom mode (rental car): uses the rental add-stopover leg label', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.RENTAL_CAR,
                    transitSegments: [transitSeg()],
                })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Add stopover' }),
        ).toBeInTheDocument();
    });

    it('custom mode (train): expanding a segment reveals the idle schedule hint', async () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [
                        transitSeg({ departStation: '', arrivalStation: '' }),
                    ],
                })}
                mode={custom()}
            />,
        );
        await expandFirstSegment();
        expect(
            screen.getByText(/auto-fill the stations and times/),
        ).toBeInTheDocument();
    });

    it('custom mode (train): an expanded segment shows the looking-up spinner', async () => {
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    {
                        kind: ACTIVITY_KIND.TRAIN,
                        transitSegments: [
                            transitSeg({ departStation: '', arrivalStation: '' }),
                        ],
                    },
                    { transitLookupLoading: new Set<number>([0]) },
                )}
                mode={custom()}
            />,
        );
        await expandFirstSegment();
        expect(screen.getByText(/Looking up schedule/)).toBeInTheDocument();
        expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    });

    it('custom mode (train): an expanded segment shows the not-found hint', async () => {
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    {
                        kind: ACTIVITY_KIND.TRAIN,
                        transitSegments: [
                            transitSeg({ departStation: '', arrivalStation: '' }),
                        ],
                    },
                    { transitLookupNotFound: { 0: 'Renfe 3152' } },
                )}
                mode={custom()}
            />,
        );
        await expandFirstSegment();
        expect(
            screen.getByText(
                /find Renfe 3152\. Fill in the stations, date, and time below manually/,
            ),
        ).toBeInTheDocument();
    });

    it('smart mode (train): shows the smart box + hint + warning, hides the detail fields', async () => {
        const setTransitSmartEntry = vi.fn();
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    {
                        kind: ACTIVITY_KIND.TRAIN,
                        transitSegments: [transitSeg()],
                    },
                    {
                        setTransitSmartEntry,
                        transitSmartWarning: 'Heads up',
                    },
                )}
                mode={smart()}
            />,
        );
        const box = screen.getByPlaceholderText(
            'e.g. "Tokyo to Kyoto 9am-12pm $100"',
        );
        expect(box).toBeInTheDocument();
        expect(screen.getByText('Heads up')).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: /Trip name/ }),
        ).not.toBeInTheDocument();
        await userEvent.type(box, 'K');
        expect(setTransitSmartEntry).toHaveBeenCalledWith('K');
    });

    it('smart mode (train): the hidden watcher forwards lookup results and misses', () => {
        const setTransitLookupNotFound = vi.fn((fn: any) => {
            if (typeof fn === 'function') {
                fn({ 0: 'x' });
                fn({});
            }
        });
        const applyTransitLookup = vi.fn();
        const handleTransitLookupLoadingChange = vi.fn();
        renderWithProviders(
            <TransitForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.TRAIN, transitSegments: [transitSeg()] },
                    {
                        setTransitLookupNotFound,
                        applyTransitLookup,
                        handleTransitLookupLoadingChange,
                    },
                )}
                mode={smart()}
            />,
        );
        const watcher = mockTransitWatchers[0];
        watcher.onResult({ operator: 'Renfe' } as any);
        watcher.onNotFound('Renfe 3152');
        watcher.onLoadingChange(true);
        expect(applyTransitLookup).toHaveBeenCalledWith(0, {
            operator: 'Renfe',
        });
        expect(setTransitLookupNotFound).toHaveBeenCalled();
        expect(handleTransitLookupLoadingChange).toHaveBeenCalledWith(0, true);
    });

    it('smart mode (rental car): uses the rental-specific placeholder', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.RENTAL_CAR,
                    transitSegments: [transitSeg()],
                })}
                mode={smart()}
            />,
        );
        expect(
            screen.getByPlaceholderText('e.g. "Hertz pickup JFK 10am $50"'),
        ).toBeInTheDocument();
    });

    it('smart mode (other): uses the other-specific placeholder', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.OTHER,
                    transitSegments: [transitSeg()],
                })}
                mode={smart()}
            />,
        );
        expect(
            screen.getByPlaceholderText('e.g. "Uber airport to hotel 10am $30"'),
        ).toBeInTheDocument();
    });

    it('edit mode: no mode toggle, but trip name + cards + cost are shown', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [transitSeg()],
                })}
                mode="edit"
            />,
        );
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: /Trip name/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
    });

    it('falls back to thumb position 1 when the kind is not a transit mode', () => {
        renderWithProviders(
            <TransitForm
                controller={makeController({
                    kind: ACTIVITY_KIND.PLACE,
                    transitSegments: [transitSeg()],
                })}
                mode={custom()}
            />,
        );
        const toggle = screen.getByRole('tablist', {
            name: 'Ground transport mode',
        });
        expect(toggle.className).toContain('is-pos-1');
    });
});
