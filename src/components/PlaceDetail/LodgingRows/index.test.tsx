import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { LodgingInfo } from 'types';
import LodgingRows, { LodgingSkeleton } from './index';

const lodging = (over: Partial<LodgingInfo> = {}): LodgingInfo => ({
    recommendedType: 'Boutique hotel',
    airbnbAvailability: 'common',
    airbnbNote: 'Plenty of downtown flats.',
    hotelAvailability: 'limited',
    hotelNote: 'Book early in high season.',
    priceRange: '$80–$150 / night',
    bookingTip: 'Reserve two weeks out.',
    ...over,
});

describe('LodgingRows', () => {
    it('renders the recommended type, price range, and booking tip', () => {
        renderWithProviders(<LodgingRows lodging={lodging()} />);
        expect(screen.getByText('Boutique hotel')).toBeInTheDocument();
        expect(screen.getByText('$80–$150 / night')).toBeInTheDocument();
        expect(screen.getByText('Reserve two weeks out.')).toBeInTheDocument();
    });

    it('maps each availability level to its badge label', () => {
        renderWithProviders(<LodgingRows lodging={lodging()} />);
        expect(screen.getByText('Widely available')).toBeInTheDocument();
        expect(screen.getByText('Limited')).toBeInTheDocument();
    });

    it('renders the "not available" badge for a none-availability lodging type', () => {
        renderWithProviders(
            <LodgingRows lodging={lodging({ hotelAvailability: 'none' })} />
        );
        expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('renders the airbnb and hotel notes', () => {
        renderWithProviders(<LodgingRows lodging={lodging()} />);
        expect(
            screen.getByText(/plenty of downtown flats\./i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/book early in high season\./i)
        ).toBeInTheDocument();
    });
});

describe('LodgingSkeleton', () => {
    it('renders five placeholder rows', () => {
        const { container } = renderWithProviders(<LodgingSkeleton />);
        expect(container.querySelectorAll('.info-rows-row').length).toBe(5);
    });
});
