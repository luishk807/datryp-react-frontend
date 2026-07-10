import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from 'test/renderWithProviders';
import type { PlaceResult } from 'api/hooks/usePlaces';
import HomeBaseField from './index';

// HomeBaseField wraps CityAutocomplete, which fetches through usePlaces —
// mock the city lookup so the wrapper renders offline + deterministically.
const { usePlacesMock } = vi.hoisted(() => ({ usePlacesMock: vi.fn() }));
vi.mock('api/hooks/usePlaces', () => ({
    usePlaces: (query: string, options?: unknown) =>
        usePlacesMock(query, options),
}));

const MADRID: PlaceResult = {
    id: 'city:madrid',
    kind: 'city',
    name: 'Madrid',
    countryCode: 'ES',
    countryName: 'Spain',
    population: 3223000,
    latitude: 40.4168,
    longitude: -3.7038,
};

beforeEach(() => {
    usePlacesMock.mockReturnValue({ data: [MADRID], isFetching: false });
});

describe('HomeBaseField', () => {
    it('renders the privacy hint and the default residence label', () => {
        renderWithProviders(<HomeBaseField value={null} onChange={vi.fn()} />);
        // Hint paragraph (i18n homeBase.hint).
        expect(
            screen.getByText(/we only store your city/i)
        ).toBeInTheDocument();
        // Default label falls back to homeBase.label.
        expect(
            screen.getByText('Current place of residence')
        ).toBeInTheDocument();
    });

    it('lets a custom label override the default', () => {
        renderWithProviders(
            <HomeBaseField value={null} onChange={vi.fn()} label="Where you live" />
        );
        expect(screen.getByText('Where you live')).toBeInTheDocument();
        expect(
            screen.queryByText('Current place of residence')
        ).not.toBeInTheDocument();
    });

    it('forwards city selections from the picker to onChange', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithProviders(<HomeBaseField value={null} onChange={onChange} />);
        await user.type(screen.getByRole('combobox'), 'ma');
        await user.click(await screen.findByRole('option', { name: /Madrid/ }));
        expect(onChange).toHaveBeenCalledWith({
            city: 'Madrid',
            country: 'Spain',
            countryCode: 'ES',
            latitude: 40.4168,
            longitude: -3.7038,
        });
    });

    it('propagates the disabled flag down to the picker', () => {
        renderWithProviders(
            <HomeBaseField value={null} onChange={vi.fn()} disabled />
        );
        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
