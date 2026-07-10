import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { Country } from 'types';
import type { PlaceResult } from 'api/hooks/usePlaces';
import type { TransportDraft } from '../types';
import ConfirmStep from './index';

// The catalog lookup that resolves a picked place → savable Country.
let mockCountryMatches:
    | Array<{
          id: number;
          name: string;
          code: string;
          local: string | null;
          image: string | null;
      }>
    | undefined;
vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({ data: mockCountryMatches }),
}));

// SearchBar is a heavy live-search combobox; stub it to a button that hands a
// picked place back through onPlaceSelected so we can drive the fallback picker.
let mockPlace: PlaceResult;
vi.mock('components/SearchBar', () => ({
    default: ({
        onPlaceSelected,
    }: {
        onPlaceSelected: (p: PlaceResult) => void;
    }) => (
        <button type="button" onClick={() => onPlaceSelected(mockPlace)}>
            stub-pick-place
        </button>
    ),
}));

const flightDraft = (over: Partial<TransportDraft> = {}): TransportDraft => ({
    kind: ACTIVITY_KIND.FLIGHT,
    smartText: '',
    flightSegments: [
        {
            flightNumber: 'CM123',
            departAirport: 'EWR',
            arrivalAirport: 'PTY',
            departDate: '2026-06-06',
            departTime: '10:00',
        },
    ],
    transitSegments: [],
    cost: '',
    ...over,
});

const japan: Country = { id: 1, name: 'Japan' };

beforeEach(() => {
    mockCountryMatches = [
        { id: 10, name: 'Panama', code: 'PA', local: null, image: null },
    ];
    mockPlace = {
        id: 'country:panama',
        kind: 'country',
        name: 'Panama',
        countryCode: 'PA',
        countryName: 'Panama',
        population: null,
        latitude: null,
        longitude: null,
    };
});

describe('AddDestination/ConfirmStep', () => {
    it('shows the resolved country and the flight summary', () => {
        renderWithProviders(
            <ConfirmStep
                country={japan}
                transport={flightDraft()}
                onEditTransport={vi.fn()}
                onSetCountry={vi.fn()}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Confirm your destination' })
        ).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText('Flight')).toBeInTheDocument();
        expect(
            screen.getByText(/CM123 · EWR → PTY · 2026-06-06 · 10:00/)
        ).toBeInTheDocument();
        // Country resolved → no fallback picker.
        expect(screen.queryByText('stub-pick-place')).not.toBeInTheDocument();
    });

    it('renders the "add later" state when no transport kind is set', () => {
        renderWithProviders(
            <ConfirmStep
                country={japan}
                transport={flightDraft({ kind: null })}
                onEditTransport={vi.fn()}
                onSetCountry={vi.fn()}
            />
        );
        expect(screen.getByText("You'll add this later")).toBeInTheDocument();
        expect(screen.queryByText('Flight')).not.toBeInTheDocument();
    });

    it('fires onEditTransport from the Edit link', async () => {
        const onEditTransport = vi.fn();
        renderWithProviders(
            <ConfirmStep
                country={japan}
                transport={flightDraft()}
                onEditTransport={onEditTransport}
                onSetCountry={vi.fn()}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEditTransport).toHaveBeenCalledTimes(1);
    });

    it('offers the destination picker and resolves a country pick', async () => {
        const onSetCountry = vi.fn();
        renderWithProviders(
            <ConfirmStep
                country={null}
                transport={flightDraft()}
                onEditTransport={vi.fn()}
                onSetCountry={onSetCountry}
            />
        );
        expect(
            screen.getByText('Pick your destination city or country.')
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'stub-pick-place' })
        );
        await waitFor(() =>
            expect(onSetCountry).toHaveBeenCalledWith(
                expect.objectContaining({ id: 10, name: 'Panama', code: 'PA' })
            )
        );
    });

    it('resolves a city pick via its country name', async () => {
        const onSetCountry = vi.fn();
        mockPlace = {
            ...mockPlace,
            id: 'city:panama-city',
            kind: 'city',
            name: 'Panama City',
            countryName: 'Panama',
        };
        renderWithProviders(
            <ConfirmStep
                country={null}
                transport={flightDraft()}
                onEditTransport={vi.fn()}
                onSetCountry={onSetCountry}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'stub-pick-place' })
        );
        await waitFor(() =>
            expect(onSetCountry).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Panama' })
            )
        );
    });

    it('does not resolve a country when the catalog returns no match', async () => {
        const onSetCountry = vi.fn();
        mockCountryMatches = [];
        renderWithProviders(
            <ConfirmStep
                country={null}
                transport={flightDraft()}
                onEditTransport={vi.fn()}
                onSetCountry={onSetCountry}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'stub-pick-place' })
        );
        // No match → picker stays; onSetCountry never fires.
        expect(onSetCountry).not.toHaveBeenCalled();
    });
});
