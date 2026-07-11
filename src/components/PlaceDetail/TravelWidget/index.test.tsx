import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { TravelerOrigin } from 'hooks/useTravelerOrigin';

// react-leaflet renders a real Leaflet map that jsdom can't drive — stub the
// primitives to plain elements that just surface their children.
vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TileLayer: () => null,
    Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Polyline: () => null,
    Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('leaflet', () => ({ Icon: class {} }));

vi.mock('components/common/FormFields/CityAutocomplete', () => ({
    default: () => <div data-testid="city-autocomplete" />,
}));

let mockOrigin: TravelerOrigin | null = null;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('hooks/useTravelerOrigin', () => ({
    useTravelerOrigin: () => ({
        data: mockOrigin,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
}));

const mockMutate = vi.fn();
vi.mock('api/hooks/useMyPreferences', () => ({
    useUpdateMyPreferences: () => ({ mutate: mockMutate, isPending: false }),
}));

let mockUser: { id: string } | null = null;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import TravelWidget from './index';

const PARIS = { lat: 48.8566, lng: 2.3522 };
const nyOrigin: TravelerOrigin = {
    lat: 40.7128,
    lng: -74.006,
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    source: 'ip',
};

beforeEach(() => {
    mockOrigin = null;
    mockIsLoading = false;
    mockIsError = false;
    mockUser = null;
    mockMutate.mockReset();
});

describe('TravelWidget', () => {
    it('renders the map skeleton while the origin is resolving', () => {
        mockIsLoading = true;
        const { container } = renderWithProviders(
            <TravelWidget placeName="Paris" placeCoords={PARIS} />
        );
        expect(
            container.querySelector('.travel-widget-map-skeleton')
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /change/i })
        ).not.toBeInTheDocument();
    });

    it('shows the from-label and a distance stat once the origin resolves', () => {
        mockOrigin = nyOrigin;
        const { container } = renderWithProviders(
            <TravelWidget placeName="Paris" placeCoords={PARIS} />
        );
        expect(
            screen.getByText(/From New York, United States/)
        ).toBeInTheDocument();
        expect(
            container.querySelector('.travel-widget-stats')
        ).toBeInTheDocument();
        expect(
            screen.getByText(/straight-line estimate/i)
        ).toBeInTheDocument();
    });

    it('shows the unknown-origin copy when detection failed', () => {
        mockIsError = true;
        renderWithProviders(
            <TravelWidget placeName="Paris" placeCoords={PARIS} />
        );
        expect(screen.getByText('From your location')).toBeInTheDocument();
        expect(
            screen.getByText(/couldn.t detect your location/i)
        ).toBeInTheDocument();
    });

    it('toggles the city picker when "Change" is clicked', async () => {
        mockOrigin = nyOrigin;
        renderWithProviders(
            <TravelWidget placeName="Paris" placeCoords={PARIS} />
        );
        expect(
            screen.queryByTestId('city-autocomplete')
        ).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /change/i }));
        expect(screen.getByTestId('city-autocomplete')).toBeInTheDocument();
    });
});
