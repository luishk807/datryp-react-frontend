import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { PlaceRecommendation } from 'types';
import PlaceAutocomplete, { type PlaceSuggestion } from './index';

const makeItem = (
    over: Partial<PlaceRecommendation> = {}
): PlaceRecommendation => ({
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rating: 4.6,
    bestTimeToVisit: '',
    description: 'Iron tower',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: null,
    longitude: null,
    ...over,
});

let mockItems: PlaceRecommendation[] = [];
let mockFetching = false;

// Return matches only for a non-empty (submitted) query, mirroring the real
// hook's enabled-gate — so the "short input" / initial states have no options.
vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: (query: string) => ({
        data: query && query.trim() ? { items: mockItems } : undefined,
        isFetching: mockFetching,
    }),
}));

beforeEach(() => {
    mockItems = [makeItem()];
    mockFetching = false;
});

/** Controlled harness — mirrors real usage where the parent owns the value
 *  and feeds it back so the debounced query settles. */
const Harness = ({
    onSelect,
}: {
    onSelect: (s: PlaceSuggestion) => void;
}) => {
    const [value, setValue] = useState('');
    return (
        <PlaceAutocomplete
            value={value}
            onTextChange={setValue}
            onSelect={onSelect}
        />
    );
};

describe('PlaceAutocomplete', () => {
    it('renders a combobox wired to its label', () => {
        renderWithProviders(
            <PlaceAutocomplete
                value=""
                onTextChange={() => {}}
                onSelect={() => {}}
            />
        );
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByLabelText('Name of Place')).toBeInTheDocument();
    });

    it('forwards typed text via onTextChange', async () => {
        const onTextChange = vi.fn();
        renderWithProviders(
            <PlaceAutocomplete
                value=""
                onTextChange={onTextChange}
                onSelect={() => {}}
            />
        );
        await userEvent.type(screen.getByRole('combobox'), 'b');
        expect(onTextChange).toHaveBeenCalledWith('b');
    });

    it('opens the listbox after the debounce and fires onSelect with the mapped place', async () => {
        const onSelect = vi.fn();
        renderWithProviders(<Harness onSelect={onSelect} />);
        await userEvent.type(screen.getByRole('combobox'), 'eiffel');
        const option = await screen.findByRole('option', {
            name: /Eiffel Tower/,
        });
        expect(screen.getByRole('combobox')).toHaveAttribute(
            'aria-expanded',
            'true'
        );
        await userEvent.click(option);
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Eiffel Tower',
                location: 'Paris, France',
                city: 'Paris',
                country: 'France',
                countryCode: 'FR',
                note: 'Iron tower',
            })
        );
    });

    it('shows a progress indicator while a request is in flight', () => {
        mockFetching = true;
        renderWithProviders(
            <PlaceAutocomplete
                value="eif"
                onTextChange={() => {}}
                onSelect={() => {}}
            />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('disables the input when disabled', () => {
        renderWithProviders(
            <PlaceAutocomplete
                value=""
                onTextChange={() => {}}
                onSelect={() => {}}
                disabled
            />
        );
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
