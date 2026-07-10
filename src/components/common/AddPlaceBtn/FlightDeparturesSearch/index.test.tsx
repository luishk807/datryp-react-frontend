import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import FlightDeparturesSearch from './index';

interface DeparturesState {
    data?: FlightDepartureOption[];
    isFetching: boolean;
    isError: boolean;
}

let mockDepartures: DeparturesState;

vi.mock('api/hooks/useFlightDepartures', () => ({
    useFlightDepartures: () => mockDepartures,
}));

// AirportAutocomplete fetches through useAirports — stub it so no network
// fires (the MSW server errors on unhandled requests).
vi.mock('api/hooks/useAirports', () => ({
    useAirports: () => ({ data: { items: [] }, isFetching: false }),
}));

const makeItem = (n: number): FlightDepartureOption => ({
    flightNumber: `UA${n}`,
    airline: 'United',
    airlineIata: 'UA',
    departAirport: 'EWR',
    departDate: '2026-08-01',
    departTime: '08:00',
    arrivalAirport: 'PTY',
    arrivalAirportName: 'Tocumen',
    arrivalDate: '2026-08-01',
    arrivalTime: '14:00',
    aircraft: 'Boeing 737',
});

const renderSearch = (overrides: Partial<React.ComponentProps<
    typeof FlightDeparturesSearch
>> = {}) => {
    const onPick = vi.fn();
    const onBack = vi.fn();
    renderWithProviders(
        <FlightDeparturesSearch
            initialAirport="EWR"
            initialArrival="PTY"
            initialDate="2026-08-01"
            onPick={onPick}
            onBack={onBack}
            {...overrides}
        />
    );
    return { onPick, onBack };
};

const search = () =>
    userEvent.click(screen.getByRole('button', { name: 'Search' }));

beforeEach(() => {
    mockDepartures = { data: [], isFetching: false, isError: false };
});

describe('FlightDeparturesSearch', () => {
    it('renders the From/To fields, time-of-day tabs and an enabled Search', () => {
        renderSearch();
        expect(screen.getByText('From airport')).toBeInTheDocument();
        expect(screen.getByText('To airport')).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: /Morning/ })
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('button', { name: 'Search' })
        ).toBeEnabled();
    });

    it('disables Search when the From-airport is not a 3-letter code', () => {
        renderSearch({ initialAirport: '' });
        expect(
            screen.getByRole('button', { name: 'Search' })
        ).toBeDisabled();
    });

    it('fires onBack from the footer', async () => {
        const { onBack } = renderSearch();
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('shows a searching state while the query is fetching', () => {
        mockDepartures = { data: undefined, isFetching: true, isError: false };
        renderSearch();
        expect(
            screen.getByText('Searching departures…')
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows the empty state after a search that returns nothing', async () => {
        mockDepartures = { data: [], isFetching: false, isError: false };
        renderSearch();
        await search();
        expect(screen.getByText(/No flights found/)).toBeInTheDocument();
    });

    it('shows the empty state when the query errors', async () => {
        mockDepartures = { data: undefined, isFetching: false, isError: true };
        renderSearch();
        await search();
        expect(screen.getByText(/No flights found/)).toBeInTheDocument();
    });

    it('renders result rows after a search', async () => {
        mockDepartures = {
            data: [makeItem(100), makeItem(200)],
            isFetching: false,
            isError: false,
        };
        renderSearch();
        await search();
        expect(screen.getByText('UA100')).toBeInTheDocument();
        expect(screen.getByText('UA200')).toBeInTheDocument();
        expect(screen.getAllByText('Use')).toHaveLength(2);
    });

    it('fires onPick when a result row is chosen', async () => {
        const item = makeItem(100);
        mockDepartures = { data: [item], isFetching: false, isError: false };
        const { onPick } = renderSearch();
        await search();
        await userEvent.click(
            screen.getByRole('button', { name: /Use flight UA100/ })
        );
        expect(onPick).toHaveBeenCalledWith(item);
    });

    it('pages long result sets behind a Show more control', async () => {
        mockDepartures = {
            data: Array.from({ length: 25 }, (_, i) => makeItem(i)),
            isFetching: false,
            isError: false,
        };
        renderSearch();
        await search();
        expect(screen.getAllByText('Use')).toHaveLength(20);
        await userEvent.click(
            screen.getByRole('button', { name: 'Show more (5 left)' })
        );
        expect(screen.getAllByText('Use')).toHaveLength(25);
        expect(screen.getByText('Showing all 25')).toBeInTheDocument();
    });

    it('filters the visible rows by the client-side text filter', async () => {
        mockDepartures = {
            data: [
                { ...makeItem(0), flightNumber: 'UA100', airline: 'United' },
                { ...makeItem(0), flightNumber: 'AA200', airline: 'American' },
            ],
            isFetching: false,
            isError: false,
        };
        renderSearch();
        await search();
        expect(screen.getByText('AA200')).toBeInTheDocument();
        await userEvent.type(
            screen.getByPlaceholderText(/Flight #/),
            'UA'
        );
        await waitFor(() =>
            expect(screen.queryByText('AA200')).not.toBeInTheDocument()
        );
        expect(screen.getByText('UA100')).toBeInTheDocument();
    });

    it('switches the active time-of-day tab', async () => {
        renderSearch();
        await userEvent.click(
            screen.getByRole('tab', { name: /Afternoon/ })
        );
        expect(
            screen.getByRole('tab', { name: /Afternoon/ })
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('tab', { name: /Morning/ })
        ).toHaveAttribute('aria-selected', 'false');
    });

    it('hides results after swapping the From/To airports', async () => {
        mockDepartures = {
            data: [makeItem(100)],
            isFetching: false,
            isError: false,
        };
        renderSearch();
        await search();
        expect(screen.getByText('UA100')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Swap From and To airports',
            })
        );
        expect(screen.queryByText('UA100')).not.toBeInTheDocument();
    });
});
