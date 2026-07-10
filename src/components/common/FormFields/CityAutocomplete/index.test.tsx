import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from 'test/renderWithProviders';
import type { PlaceResult } from 'api/hooks/usePlaces';
import CityAutocomplete, { type CitySelection } from './index';

// Mock the unified places resolver so the picker is deterministic + offline.
const { usePlacesMock } = vi.hoisted(() => ({ usePlacesMock: vi.fn() }));
vi.mock('api/hooks/usePlaces', () => ({
    usePlaces: (query: string, options?: unknown) =>
        usePlacesMock(query, options),
}));

const PARIS: PlaceResult = {
    id: 'city:paris',
    kind: 'city',
    name: 'Paris',
    countryCode: 'FR',
    countryName: 'France',
    population: 2148000,
    latitude: 48.8566,
    longitude: 2.3522,
};
const FRANCE: PlaceResult = {
    id: 'country:france',
    kind: 'country',
    name: 'France',
    countryCode: 'FR',
    countryName: 'France',
    population: null,
    latitude: null,
    longitude: null,
};

const setPlaces = (data: PlaceResult[], isFetching = false): void => {
    usePlacesMock.mockReturnValue({ data, isFetching });
};

beforeEach(() => {
    setPlaces([PARIS, FRANCE]);
});

describe('CityAutocomplete', () => {
    it('renders with the label and default placeholder (outlined)', () => {
        renderWithProviders(
            <CityAutocomplete value={null} onChange={vi.fn()} label="Home city" />
        );
        expect(screen.getByLabelText('Home city')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('Search a city')
        ).toBeInTheDocument();
    });

    it('lists only city-kind results (countries are filtered out)', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <CityAutocomplete value={null} onChange={vi.fn()} label="Home city" />
        );
        await user.type(screen.getByRole('combobox'), 'pa');
        expect(
            await screen.findByRole('option', { name: /Paris/ })
        ).toBeInTheDocument();
        // The country row for "France" must not appear as a selectable option.
        expect(
            screen.queryByRole('option', { name: /^France/ })
        ).not.toBeInTheDocument();
    });

    it('fires onChange with the full CitySelection when a city is picked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <CityAutocomplete value={null} onChange={onChange} label="Home city" />
        );
        await user.type(screen.getByRole('combobox'), 'pa');
        await user.click(await screen.findByRole('option', { name: /Paris/ }));
        expect(onChange).toHaveBeenCalledWith({
            city: 'Paris',
            country: 'France',
            countryCode: 'FR',
            latitude: 48.8566,
            longitude: 2.3522,
        } satisfies CitySelection);
    });

    it('ignores a free-typed Enter (cannot fulfil the lat/lng contract)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        setPlaces([]); // no options → Enter would create a free-solo string
        renderWithProviders(
            <CityAutocomplete value={null} onChange={onChange} label="Home city" />
        );
        await user.type(screen.getByRole('combobox'), 'xyz');
        await user.keyboard('{Enter}');
        expect(onChange).not.toHaveBeenCalled();
    });

    // NOTE: handleChange's `next == null` branch (onChange(null)) is
    // unreachable through the UI — the component hard-codes the MUI value to
    // `null`, and MUI short-circuits its onChange when the value is already
    // `null` (useAutocomplete.js: `else if (value === newValue) return`), so
    // the clear button never fires our null branch.

    it('shows a spinner while fetching, with a query above the minimum length', async () => {
        // Typing >= MIN_CHARS while fetching exercises the `isFetching`
        // arm of the noOptionsText ternary; the spinner proves fetch state.
        // (noOptionsText itself never displays — the picker is freeSolo, which
        // MUI suppresses the no-options row for.)
        const user = userEvent.setup();
        setPlaces([], true);
        renderWithProviders(
            <CityAutocomplete value={null} onChange={vi.fn()} label="Home city" />
        );
        await user.type(screen.getByRole('combobox'), 'pa');
        expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    });

    it('renders a stacked caps label in the bare variant', () => {
        renderWithProviders(
            <CityAutocomplete
                value={null}
                onChange={vi.fn()}
                label="Home base"
                variant="bare"
            />
        );
        // Bare mode hides MUI's floating label and stacks our own above the field.
        expect(screen.getByText('Home base')).toBeInTheDocument();
    });

    it('omits the caps label in bare mode when no label is given', () => {
        renderWithProviders(
            <CityAutocomplete value={null} onChange={vi.fn()} variant="bare" />
        );
        expect(
            document.querySelector('.city-autocomplete-bare-label')
        ).toBeNull();
    });

    it('reflects an externally committed selection in the input text', () => {
        const { rerender } = renderWithProviders(
            <CityAutocomplete value={null} onChange={vi.fn()} label="Home city" />
        );
        expect(screen.getByRole('combobox')).toHaveValue('');
        rerender(
            <CityAutocomplete
                value={{
                    city: 'Paris',
                    country: 'France',
                    countryCode: 'FR',
                    latitude: 48.8566,
                    longitude: 2.3522,
                }}
                onChange={vi.fn()}
                label="Home city"
            />
        );
        expect(screen.getByRole('combobox')).toHaveValue('Paris, France');
    });

    it('shows only the city name when the selection has no country', () => {
        renderWithProviders(
            <CityAutocomplete
                value={{
                    city: 'Atlantis',
                    country: '',
                    countryCode: '',
                    latitude: null,
                    longitude: null,
                }}
                onChange={vi.fn()}
                label="Home city"
            />
        );
        expect(screen.getByRole('combobox')).toHaveValue('Atlantis');
    });
});
