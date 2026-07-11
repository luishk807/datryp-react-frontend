import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { AirQualityLive } from 'api/airQualityApi';

let mockData: AirQualityLive | undefined;
vi.mock('api/hooks/useAirQuality', () => ({
    useAirQuality: () => ({ data: mockData }),
}));

import AirQualitySection from './index';

const coords = { lat: 40.7, lng: -74 };

beforeEach(() => {
    mockData = undefined;
});

describe('AirQualitySection', () => {
    it('renders nothing while the live AQI is unresolved', () => {
        mockData = undefined;
        const { container } = renderWithProviders(
            <AirQualitySection coordinates={coords} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when coordinates are missing', () => {
        mockData = undefined;
        const { container } = renderWithProviders(
            <AirQualitySection coordinates={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the AQI value, its band label, and the live sub-note', () => {
        mockData = {
            aqi: 42,
            categoryKey: 'good',
            pm25: 8,
            observedAt: '2026-07-01T00:00:00Z',
        };
        renderWithProviders(<AirQualitySection coordinates={coords} />);

        expect(
            screen.getByRole('heading', { name: 'Air quality' })
        ).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Good')).toBeInTheDocument();
        expect(screen.getByText('US AQI · live')).toBeInTheDocument();
    });

    it('renders the matching band label for an unhealthy reading', () => {
        mockData = {
            aqi: 165,
            categoryKey: 'unhealthy',
            pm25: 90,
            observedAt: null,
        };
        renderWithProviders(<AirQualitySection coordinates={coords} />);
        expect(screen.getByText('165')).toBeInTheDocument();
        expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    });
});
