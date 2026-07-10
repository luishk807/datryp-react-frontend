import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { PlaceRecommendation } from 'types';
import type { FormController, FormMode, PlaceDraft } from '../../types';
import HotelForm from './index';

const mockWatcher: { props: Record<string, any> | null } = { props: null };
vi.mock('../../PlaceSmartEntryWatcher', () => ({
    default: (props: Record<string, any>) => {
        mockWatcher.props = props;
        return null;
    },
}));

vi.mock('components/common/PlaceAutocomplete', () => ({
    default: ({ label, value, onTextChange, onSelect }: any) => (
        <div>
            <input
                aria-label={label}
                value={value ?? ''}
                onChange={(e) => onTextChange(e.target.value)}
            />
            <button
                type="button"
                onClick={() => onSelect({ name: 'Picked', location: 'Loc' })}
            >
                mock-autocomplete-pick
            </button>
        </div>
    ),
}));

vi.mock('components/common/PlaceSuggestions', () => ({
    default: ({ onPick }: any) => (
        <button
            type="button"
            onClick={() => onPick({ name: 'Suggested', location: 'City' })}
        >
            mock-place-suggestions
        </button>
    ),
}));

const rec = (over: Partial<PlaceRecommendation> = {}): PlaceRecommendation => ({
    name: 'Hilton Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    rating: 4,
    bestTimeToVisit: '',
    description: 'A hotel',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: 35.6,
    longitude: 139.7,
    ...over,
});

const makeController = (
    place: PlaceDraft = { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
    over: Partial<FormController> = {},
): FormController =>
    ({
        place,
        countryScope: undefined,
        cityScope: undefined,
        handleOnChange: vi.fn(),
        handlePlacePicked: vi.fn(),
        fireHotelSuggest: vi.fn(),
        setPlace: vi.fn(),
        hotelSmartEntry: '',
        setHotelSmartEntry: vi.fn(),
        hotelSmartLoading: false,
        setHotelSmartLoading: vi.fn(),
        hotelSmartWarning: null,
        setHotelSmartWarning: vi.fn(),
        setHotelDetailsExpanded: vi.fn(),
        sameCountry: vi.fn(() => true),
        smartEntryLocation: undefined,
        ...over,
    }) as unknown as FormController;

const smart = (): FormMode => ({ method: ADD_METHOD.SMART });
const custom = (): FormMode => ({ method: ADD_METHOD.CUSTOM });
const suggestions = (): FormMode => ({ method: ADD_METHOD.SUGGESTIONS });

describe('HotelForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWatcher.props = null;
    });

    it('custom mode (check-in): renders the side toggle and the check-in detail fields', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController({ kind: ACTIVITY_KIND.HOTEL_CHECKIN })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('tablist', { name: 'Hotel event side' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(2);
        expect(
            screen.getByRole('textbox', { name: 'Hotel name' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Address (optional)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Confirmation # (optional)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional — total stay)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Notes (optional)' }),
        ).toBeInTheDocument();
    });

    it('custom mode: clicking the check-out tab fires setPlace', async () => {
        const setPlace = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { setPlace },
                )}
                mode={custom()}
            />,
        );
        await userEvent.click(screen.getByRole('tab', { name: 'Check-out' }));
        expect(setPlace).toHaveBeenCalledTimes(1);
    });

    it('custom mode (check-out): swaps to the check-out cost label', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController({
                    kind: ACTIVITY_KIND.HOTEL_CHECKOUT,
                })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
        // The stay-total variant belongs to check-in only.
        expect(
            screen.queryByRole('textbox', {
                name: 'Cost (optional — total stay)',
            }),
        ).not.toBeInTheDocument();
    });

    it('custom mode (scoped): uses the country-scoped hotel name label', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { countryScope: 'Spain' },
                )}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('textbox', {
                name: 'Hotel name (or search in Spain)',
            }),
        ).toBeInTheDocument();
    });

    it('custom mode: typing the address fires the mapped handleOnChange', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { handleOnChange },
                )}
                mode={custom()}
            />,
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Address (optional)' }),
            'A',
        );
        expect(handleOnChange).toHaveBeenCalledWith('location', 'A');
    });

    it('suggestions mode: shows the suggestions strip, hiding details until a pick has content', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { countryScope: 'Spain' },
                )}
                mode={suggestions()}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'mock-place-suggestions' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Address (optional)' }),
        ).not.toBeInTheDocument();
    });

    it('suggestions mode: reveals the detail fields once the draft has a name', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN, name: 'Hotel Ritz' },
                    { countryScope: 'Spain' },
                )}
                mode={suggestions()}
            />,
        );
        expect(
            screen.getByRole('textbox', { name: 'Address (optional)' }),
        ).toBeInTheDocument();
    });

    it('smart mode: shows the smart box + hint and hides the details', async () => {
        const setHotelSmartEntry = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { setHotelSmartEntry },
                )}
                mode={smart()}
            />,
        );
        const box = screen.getByPlaceholderText(
            'e.g. "Hilton Tokyo, check-in 3pm, $200", or paste a Google Maps link',
        );
        expect(box).toBeInTheDocument();
        expect(
            screen.getByText(
                "Type a hotel, sentence, or paste a Google Maps / Yelp link. We'll search and fill in the details below.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Address (optional)' }),
        ).not.toBeInTheDocument();
        await userEvent.type(box, 'H');
        expect(setHotelSmartEntry).toHaveBeenCalledWith('H');
    });

    it('smart mode (loading): shows the looking-up hint + spinner and any warning', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { hotelSmartLoading: true, hotelSmartWarning: 'Heads up' },
                )}
                mode={smart()}
            />,
        );
        expect(screen.getByText('Looking up the hotel…')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('Heads up')).toBeInTheDocument();
    });

    it('smart onResult: a wrong-country match warns and does not pick the hotel', () => {
        const setHotelSmartWarning = vi.fn();
        const handlePlacePicked = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    {
                        countryScope: 'France',
                        sameCountry: vi.fn(() => false),
                        setHotelSmartWarning,
                        handlePlacePicked,
                    },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec({ name: 'Tokyo Hilton', country: 'Japan' }),
            { query: 'tokyo hilton' },
            undefined,
        );
        expect(setHotelSmartWarning).toHaveBeenCalledTimes(1);
        expect(setHotelSmartWarning.mock.calls[0][0]).toContain('Japan');
        expect(handlePlacePicked).not.toHaveBeenCalled();
    });

    it('smart onResult: a bare match fills name/confirmation and expands the details', () => {
        const handleOnChange = vi.fn();
        const fireHotelSuggest = vi.fn();
        const setHotelDetailsExpanded = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    { handleOnChange, fireHotelSuggest, setHotelDetailsExpanded },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec({ name: 'Cozy Inn', latitude: null, longitude: null }),
            { query: 'cozy inn', startTime: '15:00', cost: 200, confirmationNumber: 'ABC123' },
            undefined,
        );
        expect(handleOnChange).toHaveBeenCalledWith('name', 'Cozy Inn');
        expect(handleOnChange).toHaveBeenCalledWith('confirmationNumber', 'ABC123');
        expect(handleOnChange).toHaveBeenCalledWith('cost', '200');
        expect(setHotelDetailsExpanded).toHaveBeenCalledWith(true);
        expect(fireHotelSuggest).toHaveBeenCalled();
    });

    it('smart onResult: a resolved hotel is picked, details expand, and the upsell shows', () => {
        const handlePlacePicked = vi.fn();
        const fireHotelSuggest = vi.fn();
        const setHotelSmartWarning = vi.fn();
        const setHotelDetailsExpanded = vi.fn();
        renderWithProviders(
            <HotelForm
                controller={makeController(
                    { kind: ACTIVITY_KIND.HOTEL_CHECKIN },
                    {
                        handlePlacePicked,
                        fireHotelSuggest,
                        setHotelSmartWarning,
                        setHotelDetailsExpanded,
                    },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec(),
            { query: 'hilton tokyo', startTime: '15:00', confirmationNumber: 'ZZ9' },
            { addressUpsell: 'Upgrade for the exact address' },
        );
        expect(handlePlacePicked).toHaveBeenCalledTimes(1);
        expect(setHotelSmartWarning).toHaveBeenCalledWith(
            'Upgrade for the exact address',
        );
        expect(setHotelDetailsExpanded).toHaveBeenCalledWith(true);
        expect(fireHotelSuggest).toHaveBeenCalled();
    });

    it('custom mode: renders a fully populated check-in draft (address, confirmation, cost, notes)', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController({
                    kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                    name: 'Hotel Ritz',
                    location: 'Plaza de la Lealtad 5',
                    startTime: '15:00',
                    confirmationNumber: 'CONF-1',
                    cost: 320,
                    note: 'Late arrival',
                })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('textbox', { name: 'Address (optional)' }),
        ).toHaveValue('Plaza de la Lealtad 5');
        expect(
            screen.getByRole('textbox', { name: 'Confirmation # (optional)' }),
        ).toHaveValue('CONF-1');
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional — total stay)' }),
        ).toHaveValue('320');
        expect(
            screen.getByRole('textbox', { name: 'Notes (optional)' }),
        ).toHaveValue('Late arrival');
    });

    it('edit mode: no side toggle, but the detail fields are shown', () => {
        renderWithProviders(
            <HotelForm
                controller={makeController({ kind: ACTIVITY_KIND.HOTEL_CHECKIN })}
                mode="edit"
            />,
        );
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Hotel name' }),
        ).toBeInTheDocument();
    });
});
