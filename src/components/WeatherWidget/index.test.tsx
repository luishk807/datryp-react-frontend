import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { WeatherLive } from 'types';

// useResidenceCountry drives the default °C/°F unit; mock it so the widget
// renders offline. useTempUnit (localStorage-backed) stays real.
let mockResidence: string | null = null;
vi.mock('api/hooks/useResidenceCountry', () => ({
    useResidenceCountry: () => mockResidence,
}));

import WeatherWidget from './index';

const live = (over: Partial<WeatherLive> = {}): WeatherLive => ({
    temperatureC: 26,
    apparentTemperatureC: 25,
    highC: 30,
    lowC: 20,
    windKph: 10,
    isDay: true,
    weatherCode: 0,
    condition: 'Clear',
    flavor: 'sunny',
    observedAt: null,
    ...over,
});

beforeEach(() => {
    mockResidence = null;
    localStorage.clear();
});

describe('WeatherWidget', () => {
    describe('climate fallback (no live conditions)', () => {
        it.each([
            ['Expect heavy snow and freezing alpine winters.', 'Cold'],
            ['A humid tropical jungle climate year-round.', 'Tropical'],
            ['Frequent monsoon rainfall in the wet season.', 'Rainy'],
            ['A lovely place to visit any time.', 'Sunny'],
        ])('detects a flavor tag from the climate text (%s)', (text, tag) => {
            renderWithProviders(<WeatherWidget text={text} />);
            expect(screen.getByText(tag)).toBeInTheDocument();
            expect(screen.getByText(text)).toBeInTheDocument();
        });

        it('shows no unit toggle without live conditions', () => {
            renderWithProviders(<WeatherWidget text="Sunny and warm." />);
            expect(screen.queryByRole('group')).not.toBeInTheDocument();
        });
    });

    describe('live conditions', () => {
        it('renders the temperature, localized condition, and today range', () => {
            renderWithProviders(<WeatherWidget current={live()} />);
            expect(screen.getByText('Clear sky')).toBeInTheDocument();
            expect(screen.getByText('26°C')).toBeInTheDocument();
            // High/low share one span (separated by " · ").
            expect(screen.getByText('H 30° · L 20°')).toBeInTheDocument();
        });

        it('falls back to the raw condition string for an unmapped code', () => {
            renderWithProviders(
                <WeatherWidget
                    current={live({ weatherCode: 999, condition: 'Meteor shower' })}
                />
            );
            expect(screen.getByText('Meteor shower')).toBeInTheDocument();
        });

        it('defaults to °F for a Fahrenheit country and converts on toggle', async () => {
            mockResidence = 'US';
            renderWithProviders(<WeatherWidget current={live()} />);
            // 26°C → 79°F by default (US residence).
            expect(screen.getByText('79°F')).toBeInTheDocument();
            const group = screen.getByRole('group', {
                name: /Temperature unit/i,
            });
            expect(group).toBeInTheDocument();
            // The toggle buttons are named by aria-label ("Degrees Celsius"),
            // not the visible "°C" glyph, so Narrator announces the unit in full.
            const toC = screen.getByRole('button', { name: 'Degrees Celsius' });
            expect(toC).toHaveAttribute('aria-pressed', 'false');
            await userEvent.click(toC);
            expect(screen.getByText('26°C')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'Degrees Celsius' })
            ).toHaveAttribute('aria-pressed', 'true');
        });

        it('keeps the climate text as a secondary line when both are present', () => {
            renderWithProviders(
                <WeatherWidget text="Typically mild." current={live()} />
            );
            expect(screen.getByText('Typically mild.')).toBeInTheDocument();
            expect(screen.getByText('26°C')).toBeInTheDocument();
        });
    });
});
