import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { WeatherLive } from 'types';

let mockLive: WeatherLive | undefined;
vi.mock('api/hooks/useWeather', () => ({
    useWeather: () => ({ data: mockLive }),
}));

// The real WeatherWidget pulls in residence + temp-unit hooks (network + local
// storage). Stub it so this test isolates WeatherSection's payload wiring.
vi.mock('components/WeatherWidget', () => ({
    default: ({ text, current }: { text?: string; current?: WeatherLive }) => (
        <div data-testid="weather-widget">
            {current ? `live:${current.temperatureC}` : 'no-live'}
            {text ? ` text:${text}` : ''}
        </div>
    ),
}));

import WeatherSection from './index';

const live: WeatherLive = {
    temperatureC: 26,
    apparentTemperatureC: 27,
    highC: 30,
    lowC: 20,
    windKph: 10,
    isDay: true,
    weatherCode: 0,
    condition: 'Clear',
    flavor: 'sunny',
    observedAt: null,
};

beforeEach(() => {
    mockLive = undefined;
});

describe('WeatherSection', () => {
    it('shows a loading hint + skeleton while nothing has resolved', () => {
        renderWithProviders(
            <WeatherSection weather={undefined} isError={false} />
        );
        expect(
            screen.getByRole('heading', { name: /weather/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/fetching the weather/i)).toBeInTheDocument();
        expect(screen.queryByTestId('weather-widget')).not.toBeInTheDocument();
    });

    it('shows an inline error when the prose query fails with no live data', () => {
        renderWithProviders(<WeatherSection weather={undefined} isError />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            /could not load weather/i
        );
    });

    it('falls back to the climate prose when there is no live reading', () => {
        renderWithProviders(
            <WeatherSection weather="Hot and humid all year" isError={false} />
        );
        const widget = screen.getByTestId('weather-widget');
        expect(widget).toHaveTextContent('no-live');
        expect(widget).toHaveTextContent('text:Hot and humid all year');
    });

    it('prefers live conditions and keeps the prose as secondary text', () => {
        mockLive = live;
        renderWithProviders(
            <WeatherSection
                weather="Typically warm"
                coordinates={{ lat: 13.7, lng: 100.5 }}
                isError={false}
            />
        );
        const widget = screen.getByTestId('weather-widget');
        expect(widget).toHaveTextContent('live:26');
        expect(widget).toHaveTextContent('text:Typically warm');
    });
});
