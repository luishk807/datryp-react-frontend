import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    waitFor,
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
// return results *regardless* of `submittedQuery`, the dropdown opens (and the
// result options render) as soon as the user types one character — it keys off
// `rawQuery`, not the debounced `submittedQuery`. The one exception is the
// empty-state copy, which interpolates `submittedQuery`; those tests
// `flushDebounce` so the settled query is present in the "no results" message.
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

/** Advance past the debounce so `submittedQuery` settles before asserting on
 *  copy that interpolates it (the empty-state message). */
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
});

afterEach(() => {
    vi.clearAllTimers();
});

describe('SearchBar — place mode (homepage hero, Tab-navigable list)', () => {
    it('1. the input is a combobox; typing opens a controlled listbox', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-expanded', 'false');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).not.toHaveAttribute('aria-controls');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

        await user.type(input, 'par');
        await screen.findByRole('listbox');

        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(input).toHaveAttribute('aria-controls', 'searchbar-results-list');
        expect(screen.getByRole('status')).toHaveTextContent(
            `${places.length} results available`
        );
    });

    it('2. renders each result as a role=option row', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');

        const options = await screen.findAllByRole('option');
        expect(options).toHaveLength(places.length);
        expect(options[0]).toHaveTextContent('Paris, France');
        expect(options[1]).toHaveTextContent('Lyon, France');
        expect(options[2]).toHaveTextContent('France');
    });

    // ---- The exact flow the product owner specified ----
    it("3. Tab lands on the dropdown, then each item: input → list → item 1 → item 2", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('combobox');
        await user.type(input, 'par');
        const listbox = await screen.findByRole('listbox');
        const options = screen.getAllByRole('option');

        expect(input).toHaveFocus();
        await user.tab();
        expect(listbox).toHaveFocus(); // "pressing tab lands you on the dropdown"
        await user.tab();
        expect(options[0]).toHaveFocus(); // "tab again, to the first item"
        await user.tab();
        expect(options[1]).toHaveFocus(); // and onward through the items
    });

    it('4. Enter on a focused option selects it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('combobox'), 'par');
        const options = await screen.findAllByRole('option');

        act(() => options[1].focus());
        await user.keyboard('{Enter}');
        expect(onPlaceSelected).toHaveBeenCalledTimes(1);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[1]);
    });

    it('5. Space on a focused option also selects it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('combobox'), 'par');
        const options = await screen.findAllByRole('option');

        act(() => options[0].focus());
        await user.keyboard('[Space]');
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });

    // ---- The other half of the spec ----
    it('6. Escape from the dropdown closes it and returns focus to the search bar', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('combobox');
        await user.type(input, 'par');
        const options = await screen.findAllByRole('option');

        act(() => options[0].focus());
        expect(options[0]).toHaveFocus();

        await user.keyboard('{Escape}');
        expect(input).toHaveFocus(); // "back to the search bar"
        await waitFor(() =>
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        );
        expect(input).toHaveValue('par'); // typed text is preserved
    });

    it('7. clicking a result selects it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('combobox'), 'par');
        const options = await screen.findAllByRole('option');
        await user.click(options[0]);

        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });

    it('8. ArrowDown from the input jumps to the first option; arrows rove', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('combobox');
        await user.type(input, 'par');
        const options = await screen.findAllByRole('option');

        await user.keyboard('{ArrowDown}'); // input → first option
        expect(options[0]).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(options[1]).toHaveFocus();
        await user.keyboard('{ArrowUp}');
        expect(options[0]).toHaveFocus();
        await user.keyboard('{ArrowUp}'); // first option → back to the input
        expect(input).toHaveFocus();
    });

    it('9. options expose their set position (aria-posinset / setsize) for "N of M"', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');
        const options = await screen.findAllByRole('option');

        expect(options[2]).toHaveAttribute('aria-posinset', '3');
        expect(options[2]).toHaveAttribute('aria-setsize', String(places.length));
    });

    it('10. options carry descriptive accessible names and hide the code chip', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');
        await screen.findAllByRole('option');

        const paris = screen.getByRole('option', { name: 'Paris, City, France' });
        expect(paris).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Lyon, City, France' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'France, Country' })
        ).toBeInTheDocument();

        const codeChip = paris.querySelector('.searchbar-country-code');
        expect(codeChip).toHaveTextContent('FR');
        expect(codeChip).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows the loading state while fetching with no results yet', async () => {
        mockState.places = { data: [], isFetching: true, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');

        expect(await screen.findByText(/Searching/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('shows the empty state when the settled query returns nothing', async () => {
        mockState.places = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'zzz');
        await flushDebounce();

        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('shows the error state when the place query errors', async () => {
        mockState.places = { data: undefined, isFetching: false, isError: true };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('combobox'), 'par');

        expect(await screen.findByText(/Could not reach/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
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
            const input = screen.getByRole('combobox');
            expect(input).toHaveAttribute('placeholder', 'Where to?');

            act(() => vi.advanceTimersByTime(3000));
            expect(input).toHaveAttribute('placeholder', 'Try Paris');

            act(() => vi.advanceTimersByTime(3000));
            expect(input).toHaveAttribute('placeholder', 'Try Tokyo');
        } finally {
            vi.useRealTimers();
        }
    });

    it('focusInput() imperatively moves DOM focus to the field', () => {
        const ref = { current: null } as React.RefObject<{
            focusInput: () => void;
        }>;
        renderWithProviders(<SearchBar ref={ref} mode="place" />);

        const input = screen.getByRole('combobox');
        expect(input).not.toHaveFocus();
        act(() => ref.current?.focusInput());
        expect(input).toHaveFocus();
    });
});

describe('SearchBar — country mode', () => {
    it('renders option rows and fires onSelected on pick', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(<SearchBar mode="country" onSelected={onSelected} />);

        const input = screen.getByRole('combobox');
        await user.type(input, 'ger');
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

    it('keyboard-selects a country: Tab into the list, then Enter', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(<SearchBar mode="country" onSelected={onSelected} />);

        const input = screen.getByRole('combobox');
        await user.type(input, 'fra');
        const listbox = await screen.findByRole('listbox');
        const options = screen.getAllByRole('option');

        await user.tab(); // → listbox
        expect(listbox).toHaveFocus();
        await user.tab(); // → first option
        expect(options[0]).toHaveFocus();
        await user.keyboard('{Enter}');

        expect(onSelected).toHaveBeenCalledWith({
            id: 'c-fr',
            name: 'France',
            code: 'FR',
            local: 'France',
        });
    });

    it('folds the local name into the option name and hides the code chip', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('combobox'), 'ger');
        await screen.findAllByRole('option');

        const germany = screen.getByRole('option', { name: 'Germany, Deutschland' });
        expect(germany).toBeInTheDocument();
        expect(germany.querySelector('.searchbar-country-code')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
        expect(screen.getByRole('option', { name: 'France' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Testland' })).toBeInTheDocument();
    });

    it('shows the country loading state', async () => {
        mockState.countries = { data: [], isFetching: true, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('combobox'), 'ger');

        expect(await screen.findByText(/Searching/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('shows the country empty state', async () => {
        mockState.countries = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('combobox'), 'zzz');
        await flushDebounce();

        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('shows the country error state', async () => {
        mockState.countries = {
            data: undefined,
            isFetching: false,
            isError: true,
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('combobox'), 'ger');

        expect(await screen.findByText(/Could not reach/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
});

describe('SearchBar — simple variant (modal country picker)', () => {
    it('exposes a combobox and selects a country on click', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="country" type="simple" onSelected={onSelected} />
        );

        const input = screen.getByRole('combobox');
        expect(input).toBeInTheDocument();

        await user.type(input, 'ger');
        const options = await screen.findAllByRole('option');
        await user.click(options[2]); // Testland (local: null, code: '')

        expect(onSelected).toHaveBeenCalledWith({
            id: 'c-xx',
            name: 'Testland',
            code: '',
            local: undefined,
        });
    });

    it('keyboard-selects in the simple variant: ArrowDown into the list, then Enter', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar
                mode="place"
                type="simple"
                onPlaceSelected={onPlaceSelected}
            />
        );

        const input = screen.getByRole('combobox');
        await user.type(input, 'par');
        const options = await screen.findAllByRole('option');

        await user.keyboard('{ArrowDown}');
        expect(options[0]).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
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

        await user.type(input, ' tokyo ');
        expect(submit).toBeEnabled();

        await user.keyboard('{Enter}');
        expect(onAiSearchSubmit).toHaveBeenLastCalledWith('tokyo');

        await user.click(submit);
        expect(onAiSearchSubmit).toHaveBeenCalledTimes(2);

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
