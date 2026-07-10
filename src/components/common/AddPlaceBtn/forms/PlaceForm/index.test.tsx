import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import { ADD_METHOD } from 'constants';
import type { PlaceRecommendation } from 'types';
import type { FormController, FormMode, PlaceDraft } from '../../types';
import PlaceForm from './index';

// Capture the headless smart-entry watcher's props so tests can drive its
// onResult callback (that's where most of PlaceForm's branch logic lives).
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
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rating: 4,
    bestTimeToVisit: '',
    description: 'A tower',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: 48.8,
    longitude: 2.29,
    ...over,
});

const makeController = (
    place: PlaceDraft = {},
    over: Partial<FormController> = {},
): FormController =>
    ({
        place,
        countryScope: undefined,
        cityScope: undefined,
        handleOnChange: vi.fn(),
        handlePlacePicked: vi.fn(),
        firePlaceSuggest: vi.fn(),
        handleImageChange: vi.fn(),
        placeSmartEntry: '',
        setPlaceSmartEntry: vi.fn(),
        placeSmartLoading: false,
        setPlaceSmartLoading: vi.fn(),
        placeSuggestLoading: false,
        placeSmartWarning: null,
        setPlaceSmartWarning: vi.fn(),
        setPlaceDetailsExpanded: vi.fn(),
        sameCountry: vi.fn(() => true),
        ...over,
    }) as unknown as FormController;

const smart = (): FormMode => ({ method: ADD_METHOD.SMART });
const custom = (): FormMode => ({ method: ADD_METHOD.CUSTOM });
const suggestions = (): FormMode => ({ method: ADD_METHOD.SUGGESTIONS });

describe('PlaceForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWatcher.props = null;
    });

    it('custom mode: renders the manual detail fields', () => {
        renderWithProviders(
            <PlaceForm controller={makeController()} mode={custom()} />,
        );
        expect(
            screen.getByRole('textbox', { name: 'Activity name' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Location (optional)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Note' }),
        ).toBeInTheDocument();
    });

    it('custom mode (scoped): uses the country-scoped autocomplete label', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { countryScope: 'Spain' })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('textbox', {
                name: 'Activity name (or place in Spain)',
            }),
        ).toBeInTheDocument();
    });

    it('custom mode: typing the location fires the mapped handleOnChange', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { handleOnChange })}
                mode={custom()}
            />,
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Location (optional)' }),
            'L',
        );
        expect(handleOnChange).toHaveBeenCalledWith('location', 'L');
    });

    it('custom mode: picking from the autocomplete fires handlePlacePicked', async () => {
        const handlePlacePicked = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { handlePlacePicked })}
                mode={custom()}
            />,
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'mock-autocomplete-pick' }),
        );
        expect(handlePlacePicked).toHaveBeenCalledWith({
            name: 'Picked',
            location: 'Loc',
        });
    });

    it('suggestions mode: shows the suggestions strip and hides the details until a pick has content', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { countryScope: 'Spain' })}
                mode={suggestions()}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'mock-place-suggestions' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Location (optional)' }),
        ).not.toBeInTheDocument();
    });

    it('suggestions mode: reveals the detail fields once the draft has a name', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    { name: 'Prado Museum' },
                    { countryScope: 'Spain' },
                )}
                mode={suggestions()}
            />,
        );
        expect(
            screen.getByRole('textbox', { name: 'Location (optional)' }),
        ).toBeInTheDocument();
    });

    it('suggestions mode without a country scope: renders neither the strip nor the details', () => {
        renderWithProviders(
            <PlaceForm controller={makeController()} mode={suggestions()} />,
        );
        expect(
            screen.queryByRole('button', { name: 'mock-place-suggestions' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Location (optional)' }),
        ).not.toBeInTheDocument();
    });

    it('smart mode: shows the smart box + hint and hides the details', async () => {
        const setPlaceSmartEntry = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { setPlaceSmartEntry })}
                mode={smart()}
            />,
        );
        const box = screen.getByPlaceholderText(
            'e.g. "Ankole Grill at 10am-12pm, around $50", or paste a Google Maps link',
        );
        expect(box).toBeInTheDocument();
        expect(
            screen.getByText(
                "Type a place or paste a Maps / Yelp link — we'll fill in the rest.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('textbox', { name: 'Location (optional)' }),
        ).not.toBeInTheDocument();
        await userEvent.type(box, 'E');
        expect(setPlaceSmartEntry).toHaveBeenCalledWith('E');
    });

    it('smart mode (scoped + loading): swaps to the scoped placeholder and looking-up hint', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    { countryScope: 'Japan', placeSmartLoading: true },
                )}
                mode={smart()}
            />,
        );
        expect(
            screen.getByPlaceholderText(
                'e.g. "Ankole Grill at 10am-12pm, around $50" — searched in Japan',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Looking up the place…'),
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('smart mode: surfaces the warning only when nothing is still loading', () => {
        const { rerender } = renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    { placeSmartWarning: 'Could not find it' },
                )}
                mode={smart()}
            />,
        );
        expect(screen.getByText('Could not find it')).toBeInTheDocument();
        rerender(
            <PlaceForm
                controller={makeController(
                    {},
                    {
                        placeSmartWarning: 'Could not find it',
                        placeSmartLoading: true,
                    },
                )}
                mode={smart()}
            />,
        );
        expect(
            screen.queryByText('Could not find it'),
        ).not.toBeInTheDocument();
    });

    it('smart onResult: a wrong-country match warns and does not pick the place', () => {
        const setPlaceSmartWarning = vi.fn();
        const handlePlacePicked = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    {
                        countryScope: 'France',
                        sameCountry: vi.fn(() => false),
                        setPlaceSmartWarning,
                        handlePlacePicked,
                    },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec({ name: 'Tokyo Tower', country: 'Japan' }),
            { query: 'tokyo tower' },
            undefined,
        );
        expect(setPlaceSmartWarning).toHaveBeenCalledTimes(1);
        expect(setPlaceSmartWarning.mock.calls[0][0]).toContain('Japan');
        expect(handlePlacePicked).not.toHaveBeenCalled();
    });

    it('smart onResult: a bare match fills the name/URL/time and expands the details', () => {
        const handleOnChange = vi.fn();
        const firePlaceSuggest = vi.fn();
        const setPlaceDetailsExpanded = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    {
                        placeSmartEntry: 'https://maps.example/x',
                        handleOnChange,
                        firePlaceSuggest,
                        setPlaceDetailsExpanded,
                    },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec({ name: "Joe's Diner", latitude: null, longitude: null }),
            { query: "joe's diner", startTime: '10:00', endTime: '12:00', cost: 20 },
            undefined,
        );
        expect(handleOnChange).toHaveBeenCalledWith('name', "Joe's Diner");
        expect(handleOnChange).toHaveBeenCalledWith(
            'sourceUrl',
            'https://maps.example/x',
        );
        expect(handleOnChange).toHaveBeenCalledWith('startTime', '10:00');
        expect(handleOnChange).toHaveBeenCalledWith('cost', '20');
        expect(setPlaceDetailsExpanded).toHaveBeenCalledWith(true);
        expect(firePlaceSuggest).toHaveBeenCalled();
    });

    it('smart onResult: a resolved place is picked and any upsell is surfaced', () => {
        const handlePlacePicked = vi.fn();
        const firePlaceSuggest = vi.fn();
        const setPlaceSmartWarning = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    { handlePlacePicked, firePlaceSuggest, setPlaceSmartWarning },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec(),
            { query: 'eiffel tower', cost: 30 },
            { addressUpsell: 'Upgrade for the exact address' },
        );
        expect(handlePlacePicked).toHaveBeenCalledTimes(1);
        expect(setPlaceSmartWarning).toHaveBeenCalledWith(
            'Upgrade for the exact address',
        );
        expect(firePlaceSuggest).toHaveBeenCalled();
    });

    it('custom mode: renders a fully populated draft (cost, times, note, image alt fallback)', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController({
                    name: 'Prado Museum',
                    location: 'Madrid',
                    cost: 25,
                    startTime: '10:00',
                    endTime: '12:00',
                    note: 'World-class art',
                    // No image name → the alt falls back to the place name.
                    image: { url: 'http://img/x.jpg' } as any,
                })}
                mode={custom()}
            />,
        );
        expect(
            screen.getByRole('img', { name: 'Prado Museum' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Cost (optional)' }),
        ).toHaveValue('25');
    });

    it('smart mode (scoped, not loading): shows the scoped placeholder and scoped hint', () => {
        renderWithProviders(
            <PlaceForm
                controller={makeController({}, { countryScope: 'Japan' })}
                mode={smart()}
            />,
        );
        expect(
            screen.getByPlaceholderText(
                'e.g. "Ankole Grill at 10am-12pm, around $50" — searched in Japan',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /search Japan and fill in the rest|search Japan/,
            ),
        ).toBeInTheDocument();
    });

    it('smart onResult: a wrong-country match with no country name uses the short warning', () => {
        const setPlaceSmartWarning = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    {},
                    {
                        countryScope: 'France',
                        sameCountry: vi.fn(() => false),
                        setPlaceSmartWarning,
                    },
                )}
                mode={smart()}
            />,
        );
        mockWatcher.props!.onResult(
            rec({ name: 'Mystery Spot', country: '' }),
            { query: 'mystery spot' },
            undefined,
        );
        expect(setPlaceSmartWarning).toHaveBeenCalledTimes(1);
        expect(setPlaceSmartWarning.mock.calls[0][0]).toContain('France');
    });

    it('custom mode: shows an image preview with a clear control that resets the image', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <PlaceForm
                controller={makeController(
                    { image: { url: 'http://img/x.jpg', name: 'Pic' } },
                    { handleOnChange },
                )}
                mode={custom()}
            />,
        );
        expect(screen.getByRole('img', { name: 'Pic' })).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove image' }),
        );
        expect(handleOnChange).toHaveBeenCalledWith('image', undefined);
    });
});
