import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
    act,
} from 'test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import type { PlaceResult } from 'api/hooks/usePlaces';
import type { CountryResult } from 'api/hooks/useCountries';
import type { CountryRecommendation } from 'types';
import SearchBar from './index';

// Mirror of the component's own debounce constant (SearchBar/index.tsx).
const DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Mocking strategy
// ---------------------------------------------------------------------------
// The three data hooks are mocked wholesale so the test is deterministic and
// offline (MSW's onUnhandledRequest='error' would fail on any real request).
// Each mock reads from a mutable `mockState` bucket (created via vi.hoisted so
// it exists before the hoisted vi.mock factories run). Tests flip a bucket to
// exercise loading/empty/error branches; beforeEach resets to the happy path.
//
// TIMER APPROACH: real timers throughout. Because the hooks are mocked to
// return results *regardless* of `submittedQuery`, the dropdown opens as soon
// as the user types one character (it keys off `rawQuery`, not the debounced
// `submittedQuery`) — so most tests never need to touch the debounce at all.
// The one exception is keyboard navigation: the component resets the active
// highlight whenever `submittedQuery` changes (after the ~250ms debounce), so
// nav tests first flush the debounce (`flushDebounce`) so that reset fires
// BEFORE we start arrowing, and can't clobber the highlight mid-test.
const { placeFixtures, countryFixtures, recommendFixtures, mockState } =
    vi.hoisted(() => {
        const placeFixtures = [
            {
                id: 'city:paris',
                kind: 'city',
                name: 'Paris',
                countryCode: 'FR',
                countryName: 'France',
                population: 2_100_000,
                latitude: 48.85,
                longitude: 2.35,
            },
            {
                id: 'city:lyon',
                kind: 'city',
                name: 'Lyon',
                countryCode: 'FR',
                countryName: 'France',
                population: 515_000,
                latitude: 45.76,
                longitude: 4.83,
            },
            {
                id: 'country:france',
                kind: 'country',
                name: 'France',
                countryCode: 'FR',
                countryName: 'France',
                population: null,
                latitude: null,
                longitude: null,
            },
        ];
        const countryFixtures = [
            { id: 'c-fr', name: 'France', code: 'FR', local: 'France', image: null },
            {
                id: 'c-de',
                name: 'Germany',
                code: 'DE',
                local: 'Deutschland',
                image: null,
            },
            // Blank code exercises the flagEmoji() globe fallback + the
            // "local is null → no local line" branch.
            { id: 'c-xx', name: 'Testland', code: '', local: null, image: null },
        ];
        const recommendFixtures = [
            {
                id: 'r-jp',
                name: 'Japan',
                code: 'JP',
                local: '日本',
                image: null,
                score: 0.92,
                reason: 'Great food',
            },
            {
                id: 'r-th',
                name: 'Thailand',
                code: 'TH',
                local: null,
                image: null,
                score: 0.81,
                reason: null,
            },
        ];

        const happy = {
            places: { data: placeFixtures, isFetching: false, isError: false },
            countries: { data: countryFixtures, isFetching: false, isError: false },
            recommend: {
                data: { items: recommendFixtures, modelVersion: 'test-model' },
                isFetching: false,
                isError: false,
                error: null,
            },
        };
        return {
            placeFixtures,
            countryFixtures,
            recommendFixtures,
            mockState: {
                places: { ...happy.places },
                countries: { ...happy.countries },
                recommend: { ...happy.recommend },
                happy,
            },
        };
    });

vi.mock('api/hooks/usePlaces', () => ({
    usePlaces: () => mockState.places,
}));
vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => mockState.countries,
}));
vi.mock('api/hooks/useCountryRecommendations', () => ({
    useCountryRecommendations: () => mockState.recommend,
}));

// Cast the loosely-typed fixtures to the real hook shapes for assertions.
const places = placeFixtures as PlaceResult[];
const countries = countryFixtures as CountryResult[];
const recommendations = recommendFixtures as CountryRecommendation[];

/** Advance past the debounce so `submittedQuery` settles (and the
 *  activeIndex-reset effect it drives fires) before keyboard navigation. */
const flushDebounce = async () => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 50));
    });
};

beforeEach(() => {
    // Reset the mock buckets to the happy path (module mocks survive
    // clearMocks/restoreMocks, so this is manual).
    mockState.places = { ...mockState.happy.places };
    mockState.countries = { ...mockState.happy.countries };
    mockState.recommend = { ...mockState.happy.recommend };
    // jsdom doesn't implement scrollIntoView; the keyboard-nav effect calls it.
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    vi.clearAllTimers();
});

describe('SearchBar — place mode (homepage hero)', () => {
    it('1. renders the input as role="combobox"', () => {
        renderWithProviders(<SearchBar mode="place" />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('2. shows a listbox of option rows after typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');

        const listbox = await screen.findByRole('listbox');
        const options = within(listbox).getAllByRole('option');
        expect(options).toHaveLength(places.length);
        expect(listbox).toHaveTextContent('Paris, France');
        expect(listbox).toHaveTextContent('Lyon, France');
        // Country-kind row renders the bare name (no ", countryName").
        expect(options[2]).toHaveTextContent('France');
    });

    it('3. keyboard nav highlights options and Enter selects the active one', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'par');
        await screen.findByRole('listbox');
        // Settle the debounce so the submittedQuery→reset can't clobber nav.
        await flushDebounce();

        const options = screen.getAllByRole('option');
        expect(combo).not.toHaveAttribute('aria-activedescendant');

        await user.keyboard('{ArrowDown}');
        expect(combo).toHaveAttribute('aria-activedescendant', options[0].id);
        expect(options[0]).toHaveAttribute('aria-selected', 'true');

        await user.keyboard('{ArrowDown}');
        expect(combo).toHaveAttribute('aria-activedescendant', options[1].id);
        expect(options[1]).toHaveAttribute('aria-selected', 'true');
        expect(options[0]).toHaveAttribute('aria-selected', 'false');

        await user.keyboard('{Enter}');
        expect(onPlaceSelected).toHaveBeenCalledTimes(1);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[1]);
    });

    it('4. clicking an option fires onPlaceSelected with that place', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('combobox'), 'par');
        const options = await screen.findAllByRole('option');
        await user.click(options[0]);

        expect(onPlaceSelected).toHaveBeenCalledTimes(1);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });

    it('5. Escape closes the dropdown', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'par');
        await screen.findByRole('listbox');

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        );
        expect(combo).toHaveAttribute('aria-expanded', 'false');
    });

    it('6. aria-expanded reflects open/closed state', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const combo = screen.getByRole('combobox');
        expect(combo).toHaveAttribute('aria-expanded', 'false');

        await user.type(combo, 'par');
        await screen.findByRole('listbox');
        expect(combo).toHaveAttribute('aria-expanded', 'true');
    });

    it('shows the loading state while fetching with no results yet', async () => {
        mockState.places = { data: [], isFetching: true, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'par');

        await waitFor(() =>
            expect(combo).toHaveAttribute('aria-expanded', 'true')
        );
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows the empty state when the settled query returns nothing', async () => {
        mockState.places = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'zzz');
        await flushDebounce();

        // The no-results copy interpolates the query in both EN and ES.
        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows the error state when the place query errors', async () => {
        mockState.places = { data: undefined, isFetching: false, isError: true };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'par');

        await waitFor(() =>
            expect(combo).toHaveAttribute('aria-expanded', 'true')
        );
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('keyboard nav supports ArrowUp / Home / End with wrap-around', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'par');
        await screen.findByRole('listbox');
        await flushDebounce();

        const options = screen.getAllByRole('option');
        const last = options.length - 1;

        await user.keyboard('{ArrowUp}'); // from nothing → wraps to last
        expect(combo).toHaveAttribute('aria-activedescendant', options[last].id);

        await user.keyboard('{Home}');
        expect(combo).toHaveAttribute('aria-activedescendant', options[0].id);

        await user.keyboard('{End}');
        expect(combo).toHaveAttribute('aria-activedescendant', options[last].id);

        await user.keyboard('{ArrowDown}'); // from last → wraps to first
        expect(combo).toHaveAttribute('aria-activedescendant', options[0].id);
    });

    it('clicking a country-kind result fires onPlaceSelected with it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('combobox'), 'fra');
        const options = await screen.findAllByRole('option');
        await user.click(options[2]); // France (kind: 'country')

        expect(onPlaceSelected).toHaveBeenCalledWith(places[2]);
    });

    it('rotates through the placeholder list on an idle, empty field', () => {
        vi.useFakeTimers();
        try {
            renderWithProviders(
                <SearchBar
                    mode="place"
                    placeholders={['Where to?', 'Try Paris', 'Try Tokyo']}
                />
            );
            const combo = screen.getByRole('combobox');
            expect(combo).toHaveAttribute('placeholder', 'Where to?');

            act(() => vi.advanceTimersByTime(3000));
            expect(combo).toHaveAttribute('placeholder', 'Try Paris');

            act(() => vi.advanceTimersByTime(3000));
            expect(combo).toHaveAttribute('placeholder', 'Try Tokyo');
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('SearchBar — country mode', () => {
    it('renders the combobox, option rows, and fires onSelected on pick', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(<SearchBar mode="country" onSelected={onSelected} />);

        const combo = screen.getByRole('combobox');
        expect(combo).toBeInTheDocument();

        await user.type(combo, 'ger');
        const options = await screen.findAllByRole('option');
        expect(options).toHaveLength(countries.length);

        await user.click(options[1]); // Germany
        expect(onSelected).toHaveBeenCalledWith({
            id: 'c-de',
            name: 'Germany',
            code: 'DE',
            local: 'Deutschland',
        });
    });

    it('keyboard-selects a country with ArrowDown + Enter', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(<SearchBar mode="country" onSelected={onSelected} />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'fra');
        await screen.findByRole('listbox');
        await flushDebounce();

        await user.keyboard('{ArrowDown}{Enter}');
        expect(onSelected).toHaveBeenCalledWith({
            id: 'c-fr',
            name: 'France',
            code: 'FR',
            local: 'France',
        });
    });

    it('shows the country loading state', async () => {
        mockState.countries = { data: [], isFetching: true, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'ger');

        await waitFor(() =>
            expect(combo).toHaveAttribute('aria-expanded', 'true')
        );
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows the country empty state', async () => {
        mockState.countries = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('combobox'), 'zzz');
        await flushDebounce();

        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows the country error state', async () => {
        mockState.countries = {
            data: undefined,
            isFetching: false,
            isError: true,
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        const combo = screen.getByRole('combobox');
        await user.type(combo, 'ger');

        await waitFor(() =>
            expect(combo).toHaveAttribute('aria-expanded', 'true')
        );
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('simple variant renders a plain input and maps null local to undefined', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="country" type="simple" onSelected={onSelected} />
        );

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.type(screen.getByRole('textbox'), 'ger');
        const options = await screen.findAllByRole('option');
        await user.click(options[2]); // Testland (local: null, code: '')

        expect(onSelected).toHaveBeenCalledWith({
            id: 'c-xx',
            name: 'Testland',
            code: '',
            local: undefined,
        });
    });
});

describe('SearchBar — recommend mode', () => {
    it('renders recommendation rows and fires onSelected on pick', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="recommend" onSelected={onSelected} />
        );

        await user.type(screen.getByRole('textbox'), 'beaches and food');

        const japan = await screen.findByText('Japan');
        await user.click(japan);
        expect(onSelected).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'r-jp', name: 'Japan', code: 'JP' })
        );
        expect(recommendations).toHaveLength(2);
    });

    it('uses the navigation flow (submit button + Enter) when onAiSearchSubmit is set', async () => {
        const user = userEvent.setup();
        const onAiSearchSubmit = vi.fn();
        renderWithProviders(
            <SearchBar mode="recommend" onAiSearchSubmit={onAiSearchSubmit} />
        );

        const input = screen.getByRole('textbox');
        const submit = screen.getByRole('button');
        expect(submit).toBeDisabled(); // empty query

        // Leading/trailing space proves submit trims the value.
        await user.type(input, ' tokyo ');
        expect(submit).toBeEnabled();

        await user.keyboard('{Enter}');
        expect(onAiSearchSubmit).toHaveBeenLastCalledWith('tokyo');

        await user.click(submit);
        expect(onAiSearchSubmit).toHaveBeenCalledTimes(2);

        // Navigation flow suppresses the inline recommendation dropdown.
        expect(screen.queryByText('Japan')).not.toBeInTheDocument();
    });

    it('maps a recommendation with null local/image to undefined', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="recommend" onSelected={onSelected} />
        );

        await user.type(screen.getByRole('textbox'), 'temples');
        await user.click(await screen.findByText('Thailand'));

        expect(onSelected).toHaveBeenCalledWith({
            id: 'r-th',
            name: 'Thailand',
            code: 'TH',
            local: undefined,
            image: undefined,
        });
    });

    it('shows the recommend loading state', async () => {
        mockState.recommend = {
            data: { items: [], modelVersion: 't' },
            isFetching: true,
            isError: false,
            error: null,
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="recommend" />);

        await user.type(screen.getByRole('textbox'), 'par');
        expect(screen.queryByText('Japan')).not.toBeInTheDocument();
    });

    it('shows the recommend empty state', async () => {
        mockState.recommend = {
            data: { items: [], modelVersion: 't' },
            isFetching: false,
            isError: false,
            error: null,
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="recommend" />);

        await user.type(screen.getByRole('textbox'), 'zzz');
        await flushDebounce();

        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
    });

    it('shows the recommend error state with the error detail', async () => {
        mockState.recommend = {
            data: undefined,
            isFetching: false,
            isError: true,
            error: new Error('boom'),
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="recommend" />);

        await user.type(screen.getByRole('textbox'), 'par');

        expect(await screen.findByText(/boom/)).toBeInTheDocument();
    });
});

describe('SearchBar — simple variant', () => {
    it('renders a plain input (no combobox) and still fires onPlaceSelected', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar
                mode="place"
                type="simple"
                onPlaceSelected={onPlaceSelected}
            />
        );

        // The simple variant uses InputField, which has no role="combobox".
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.type(screen.getByRole('textbox'), 'par');
        const options = await screen.findAllByRole('option');
        await user.click(options[0]);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });
});
