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
// result buttons render) as soon as the user types one character — it keys off
// `rawQuery`, not the debounced `submittedQuery` — so most tests never touch
// the debounce. The one exception is the empty-state copy, which interpolates
// `submittedQuery`; those tests `flushDebounce` so the settled query is present
// in the "no results for X" message.
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

describe('SearchBar — place mode (homepage hero)', () => {
    it('1. renders a search textbox, not a combobox', () => {
        renderWithProviders(<SearchBar mode="place" />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('2. renders result options as real buttons after typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('textbox'), 'par');

        const buttons = await screen.findAllByRole('button');
        expect(buttons).toHaveLength(places.length);
        // The virtual-highlight listbox/option roles are gone.
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('option')).not.toBeInTheDocument();

        expect(buttons[0]).toHaveTextContent('Paris, France');
        expect(buttons[1]).toHaveTextContent('Lyon, France');
        // Country-kind row renders the bare name (no ", countryName").
        expect(buttons[2]).toHaveTextContent('France');
    });

    it('3. Tab from the input reaches the first result button', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');
        const buttons = await screen.findAllByRole('button');

        expect(input).toHaveFocus();
        await user.tab();
        expect(buttons[0]).toHaveFocus();
        await user.tab();
        expect(buttons[1]).toHaveFocus();
    });

    it('4. ArrowDown from the input focuses the first result; roving + Enter selects', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');
        const buttons = await screen.findAllByRole('button');

        await user.keyboard('{ArrowDown}');
        expect(buttons[0]).toHaveFocus();

        await user.keyboard('{ArrowDown}');
        expect(buttons[1]).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(onPlaceSelected).toHaveBeenCalledTimes(1);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[1]);
    });

    it('5. Space on a focused result also selects it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('textbox'), 'par');
        const buttons = await screen.findAllByRole('button');

        await user.keyboard('{ArrowDown}');
        expect(buttons[0]).toHaveFocus();
        await user.keyboard('[Space]');

        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });

    it('6. clicking a result fires onPlaceSelected with that place', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('textbox'), 'par');
        const buttons = await screen.findAllByRole('button');
        await user.click(buttons[0]);

        expect(onPlaceSelected).toHaveBeenCalledTimes(1);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });

    it('7. Escape from a result closes the dropdown and returns focus to the input', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');
        const buttons = await screen.findAllByRole('button');

        await user.keyboard('{ArrowDown}');
        expect(buttons[0]).toHaveFocus();

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryAllByRole('button')).toHaveLength(0)
        );
        expect(input).toHaveFocus();
    });

    it('8. Escape from the input closes the dropdown', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');
        await screen.findAllByRole('button');

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryAllByRole('button')).toHaveLength(0)
        );
    });

    it('9. the disclosure exposes result buttons only after typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        // Closed: no result buttons, no aria-controls, and (crucially) no
        // aria-expanded on the plain textbox (invalid per aria-allowed-attr).
        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(input).not.toHaveAttribute('aria-expanded');
        expect(input).not.toHaveAttribute('aria-controls');

        await user.type(input, 'par');
        const buttons = await screen.findAllByRole('button');
        expect(buttons).toHaveLength(places.length);
        // Open: the input now points at the results list, and a polite live
        // region announces the count (the disclosure's screen-reader signal).
        expect(input).toHaveAttribute('aria-controls');
        expect(input).not.toHaveAttribute('aria-expanded');
        expect(screen.getByRole('status')).toHaveTextContent(
            `${places.length} results available`
        );
    });

    it('10. roving supports ArrowUp / Home / End; Up from first returns to input', async () => {
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');
        const buttons = await screen.findAllByRole('button');
        const last = buttons.length - 1;

        await user.keyboard('{ArrowDown}'); // input → first
        expect(buttons[0]).toHaveFocus();

        await user.keyboard('{End}');
        expect(buttons[last]).toHaveFocus();

        await user.keyboard('{ArrowDown}'); // clamps at last (no wrap)
        expect(buttons[last]).toHaveFocus();

        await user.keyboard('{Home}');
        expect(buttons[0]).toHaveFocus();

        await user.keyboard('{ArrowUp}'); // first → back to input
        expect(input).toHaveFocus();
    });

    it('shows the loading state while fetching with no results yet', async () => {
        mockState.places = { data: [], isFetching: true, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');

        expect(await screen.findByText(/Searching/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('shows the empty state when the settled query returns nothing', async () => {
        mockState.places = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        await user.type(screen.getByRole('textbox'), 'zzz');
        await flushDebounce();

        // The no-results copy interpolates the query in both EN and ES.
        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('shows the error state when the place query errors', async () => {
        mockState.places = { data: undefined, isFetching: false, isError: true };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="place" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'par');

        expect(await screen.findByText(/Could not reach/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('clicking a country-kind result fires onPlaceSelected with it', async () => {
        const user = userEvent.setup();
        const onPlaceSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="place" onPlaceSelected={onPlaceSelected} />
        );

        await user.type(screen.getByRole('textbox'), 'fra');
        const buttons = await screen.findAllByRole('button');
        await user.click(buttons[2]); // France (kind: 'country')

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
            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('placeholder', 'Where to?');

            act(() => vi.advanceTimersByTime(3000));
            expect(input).toHaveAttribute('placeholder', 'Try Paris');

            act(() => vi.advanceTimersByTime(3000));
            expect(input).toHaveAttribute('placeholder', 'Try Tokyo');
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('SearchBar — country mode', () => {
    it('renders the textbox, result buttons, and fires onSelected on pick', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(<SearchBar mode="country" onSelected={onSelected} />);

        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.type(input, 'ger');
        const buttons = await screen.findAllByRole('button');
        expect(buttons).toHaveLength(countries.length);

        await user.click(buttons[1]); // Germany
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

        const input = screen.getByRole('textbox');
        await user.type(input, 'fra');
        const buttons = await screen.findAllByRole('button');

        await user.keyboard('{ArrowDown}');
        expect(buttons[0]).toHaveFocus();
        await user.keyboard('{Enter}');

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

        const input = screen.getByRole('textbox');
        await user.type(input, 'ger');

        expect(await screen.findByText(/Searching/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('shows the country empty state', async () => {
        mockState.countries = { data: [], isFetching: false, isError: false };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        await user.type(screen.getByRole('textbox'), 'zzz');
        await flushDebounce();

        expect(await screen.findByText(/zzz/)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('shows the country error state', async () => {
        mockState.countries = {
            data: undefined,
            isFetching: false,
            isError: true,
        };
        const user = userEvent.setup();
        renderWithProviders(<SearchBar mode="country" />);

        const input = screen.getByRole('textbox');
        await user.type(input, 'ger');

        expect(await screen.findByText(/Could not reach/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('simple variant renders a plain input and maps null local to undefined', async () => {
        const user = userEvent.setup();
        const onSelected = vi.fn();
        renderWithProviders(
            <SearchBar mode="country" type="simple" onSelected={onSelected} />
        );

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.type(screen.getByRole('textbox'), 'ger');
        const buttons = await screen.findAllByRole('button');
        await user.click(buttons[2]); // Testland (local: null, code: '')

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
        const buttons = await screen.findAllByRole('button');
        await user.click(buttons[0]);
        expect(onPlaceSelected).toHaveBeenCalledWith(places[0]);
    });
});
