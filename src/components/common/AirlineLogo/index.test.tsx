import { describe, it, expect } from 'vitest';
import {
    renderWithProviders,
    screen,
    fireEvent,
} from '../../../test/renderWithProviders';
import AirlineLogo, { deriveAirlineCode } from './index';

describe('deriveAirlineCode', () => {
    it('prefers an explicit IATA code, uppercased and clamped to 3 chars', () => {
        expect(deriveAirlineCode('ua')).toBe('UA');
        expect(deriveAirlineCode('  ba ')).toBe('BA');
        expect(deriveAirlineCode('abcd')).toBe('ABC');
    });

    it('derives the carrier prefix from a flight number when no IATA code', () => {
        expect(deriveAirlineCode(null, 'UA123')).toBe('UA');
        expect(deriveAirlineCode(undefined, 'U2 123')).toBe('U2');
        expect(deriveAirlineCode('', '9W 456')).toBe('9W');
    });

    it('returns null when nothing resolves to a 2-3 char code', () => {
        expect(deriveAirlineCode('U')).toBeNull();
        expect(deriveAirlineCode(null, null)).toBeNull();
        expect(deriveAirlineCode(null, '123')).toBeNull();
    });
});

describe('AirlineLogo', () => {
    it('renders the CDN logo with the airline name as alt text', () => {
        renderWithProviders(<AirlineLogo iata="UA" label="United" />);
        const img = screen.getByRole('img', { name: 'United' });
        expect(img).toHaveAttribute(
            'src',
            'https://images.kiwi.com/airlines/64/UA.png'
        );
    });

    it('falls back to a "<code> logo" alt when no label is given', () => {
        renderWithProviders(<AirlineLogo iata="ua" />);
        expect(screen.getByRole('img', { name: 'UA logo' })).toBeInTheDocument();
    });

    it('renders a decorative glyph fallback when the code cannot be resolved', () => {
        const { container } = renderWithProviders(<AirlineLogo iata="U" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        const fallback = container.querySelector('.airline-logo--fallback');
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveAttribute('aria-hidden', 'true');
    });

    it('swaps to the fallback when the CDN image errors (404)', () => {
        const { container } = renderWithProviders(<AirlineLogo iata="ZZ" />);
        const img = screen.getByRole('img');
        fireEvent.error(img);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(
            container.querySelector('.airline-logo--fallback')
        ).toBeInTheDocument();
    });
});
