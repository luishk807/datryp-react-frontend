import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from 'test/renderWithProviders';
import type { AirportOption } from 'api/airportsApi';
import AirportAutocomplete from './index';

// Mock the data hook so the component is deterministic + offline. We route
// through a hoisted spy so individual tests can swap the fixture / loading
// state without re-declaring the mock.
const { useAirportsMock } = vi.hoisted(() => ({ useAirportsMock: vi.fn() }));
vi.mock('api/hooks/useAirports', () => ({
    useAirports: (query: string) => useAirportsMock(query),
}));

const AIRPORTS: AirportOption[] = [
    {
        iataCode: 'JFK',
        name: 'John F. Kennedy International',
        city: 'New York',
        countryCode: 'US',
        country: 'United States',
    },
    {
        iataCode: 'LHR',
        name: 'Heathrow',
        city: 'London',
        countryCode: 'GB',
        country: 'United Kingdom',
    },
];

const setAirports = (
    items: AirportOption[],
    isFetching = false
): void => {
    useAirportsMock.mockReturnValue({ data: { items }, isFetching });
};

beforeEach(() => {
    setAirports(AIRPORTS);
});

describe('AirportAutocomplete', () => {
    it('renders with the label and placeholder', () => {
        renderWithProviders(
            <AirportAutocomplete
                value=""
                onChange={vi.fn()}
                label="From"
                placeholder="IATA code, city, or airport"
            />
        );
        expect(screen.getByLabelText('From')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('IATA code, city, or airport')
        ).toBeInTheDocument();
    });

    it('pushes each keystroke up as an uppercased IATA code', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(
            <AirportAutocomplete value="" onChange={onChange} label="From" />
        );
        await user.type(screen.getByRole('combobox'), 'jf');
        expect(onChange).toHaveBeenLastCalledWith('JF');
    });

    it('renders ranked options from the hook (server order preserved)', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AirportAutocomplete value="" onChange={vi.fn()} label="From" />
        );
        await user.type(screen.getByRole('combobox'), 'j');
        const jfk = await screen.findByRole('option', { name: /JFK/ });
        expect(jfk).toHaveTextContent('New York');
        expect(jfk).toHaveTextContent('United States');
        expect(screen.getByRole('option', { name: /LHR/ })).toBeInTheDocument();
    });

    it('fires onChange(iataCode) + onSelectMeta(option) when an option is picked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onSelectMeta = vi.fn();
        renderWithProviders(
            <AirportAutocomplete
                value=""
                onChange={onChange}
                onSelectMeta={onSelectMeta}
                label="From"
            />
        );
        await user.type(screen.getByRole('combobox'), 'j');
        await user.click(await screen.findByRole('option', { name: /JFK/ }));
        expect(onChange).toHaveBeenLastCalledWith('JFK');
        expect(onSelectMeta).toHaveBeenCalledWith(AIRPORTS[0]);
    });

    it('uppercases a free-typed string on Enter (not in the catalog)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        setAirports([]); // no dropdown options → Enter creates a free-solo value
        renderWithProviders(
            <AirportAutocomplete value="" onChange={onChange} label="From" />
        );
        await user.type(screen.getByRole('combobox'), 'xyz');
        onChange.mockClear();
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('XYZ');
    });

    // NOTE: handleChange's `newValue == null` branch (onChange('')) is
    // unreachable through the UI. The component hard-codes the MUI value to
    // `null`, and MUI short-circuits its onChange when the value is already
    // `null` (useAutocomplete.js: `else if (value === newValue) return`), so
    // clicking the clear button never fires our null branch. Left uncovered
    // by design rather than tested via a synthetic call.

    it('shows a spinner while fetching', () => {
        setAirports([], true);
        renderWithProviders(
            <AirportAutocomplete value="" onChange={vi.fn()} label="From" />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('is disabled when disabled', () => {
        renderWithProviders(
            <AirportAutocomplete
                value=""
                onChange={vi.fn()}
                label="From"
                disabled
            />
        );
        expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('syncs the visible input when the parent updates value externally', () => {
        const { rerender } = renderWithProviders(
            <AirportAutocomplete value="" onChange={vi.fn()} label="From" />
        );
        expect(screen.getByRole('combobox')).toHaveValue('');
        rerender(
            <AirportAutocomplete value="CDG" onChange={vi.fn()} label="From" />
        );
        expect(screen.getByRole('combobox')).toHaveValue('CDG');
    });
});
