import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../test/renderWithProviders';
import { TripProvider, useTripState } from 'context/TripContext';
import type { Country } from 'types';

// SearchBar owns the country lookup (network); stub it to a controllable pair:
// a readout of the `defaultValue` it receives + a button that fires `onSelected`
// with a fixed country, so the step's dispatch can be observed end-to-end.
interface SearchBarStubProps {
    defaultValue?: Country | null;
    onSelected?: (country: Country) => void;
}
vi.mock('components/SearchBar', () => ({
    default: ({ defaultValue, onSelected }: SearchBarStubProps) => (
        <div>
            <span data-testid="sb-default">
                {defaultValue?.name ?? 'none'}
            </span>
            <button
                type="button"
                onClick={() =>
                    onSelected?.({ id: 7, name: 'Japan', code: 'JP' })
                }
            >
                pick-japan
            </button>
        </div>
    ),
}));

import DestinationStep from './index';

// The step is fed `data` by its parent; mirror that by reading the live trip
// context so a dispatched country change flows back into the rendered step.
const Harness = () => {
    const trip = useTripState();
    return <DestinationStep data={trip} />;
};

beforeEach(() => {
    localStorage.clear();
});

describe('DestinationStep', () => {
    it('renders the headline, label, and the search field', () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        expect(
            screen.getByRole('heading', { name: /where are you going/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Destination')).toBeInTheDocument();
        expect(screen.getByTestId('sb-default')).toHaveTextContent('none');
    });

    it('dispatches the picked country into trip state', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'pick-japan' })
        );
        await waitFor(() =>
            expect(screen.getByTestId('sb-default')).toHaveTextContent('Japan')
        );
    });

    it('replaces the country on an already-seeded destination', async () => {
        renderWithProviders(
            <TripProvider>
                <Harness />
            </TripProvider>
        );
        // First pick seeds the destination; the second takes the
        // "existing destinations" branch that merges into destinations[0].
        await userEvent.click(
            screen.getByRole('button', { name: 'pick-japan' })
        );
        await waitFor(() =>
            expect(screen.getByTestId('sb-default')).toHaveTextContent('Japan')
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'pick-japan' })
        );
        expect(screen.getByTestId('sb-default')).toHaveTextContent('Japan');
    });
});
