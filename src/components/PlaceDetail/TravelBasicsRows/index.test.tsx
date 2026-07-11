import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { TravelBasics } from 'types';
import TravelBasicsRows, { TravelBasicsSkeleton } from './index';

const basics: TravelBasics = {
    preferredTransport: 'Metro + walking',
    transportSystem: 'Extensive subway',
    paymentMethod: 'card',
    paymentNote: 'contactless everywhere',
    language: 'Japanese',
    vibe: 'Orderly and buzzing',
    audience: 'First-timers & foodies',
    ageRecommendation: 'All ages',
};

describe('TravelBasicsRows', () => {
    it('renders every labelled row with its value', () => {
        renderWithProviders(<TravelBasicsRows basics={basics} />);

        const rows = screen.getAllByRole('term').map((dt) => dt.textContent);
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.stringContaining('Getting around'),
                expect.stringContaining('Transit system'),
                expect.stringContaining('Payment'),
                expect.stringContaining('Language'),
                expect.stringContaining('Vibe'),
                expect.stringContaining('Good for'),
                expect.stringContaining('Age range'),
            ])
        );
        expect(screen.getByText('Metro + walking')).toBeInTheDocument();
        expect(screen.getByText('Japanese')).toBeInTheDocument();
    });

    it('renders the payment method label with its note', () => {
        renderWithProviders(<TravelBasicsRows basics={basics} />);
        expect(
            screen.getByText('Cards widely accepted')
        ).toBeInTheDocument();
        expect(screen.getByText(/contactless everywhere/)).toBeInTheDocument();
    });

    it('maps a cash-first payment method', () => {
        renderWithProviders(
            <TravelBasicsRows
                basics={{ ...basics, paymentMethod: 'cash', paymentNote: 'ATMs are common' }}
            />
        );
        expect(screen.getByText('Mostly cash')).toBeInTheDocument();
    });

    it('exposes a skeleton with two shimmer bars per basics field', () => {
        const { container } = renderWithProviders(<TravelBasicsSkeleton />);
        // 7 rows × (label + value) shimmer bars.
        expect(container.querySelectorAll('.skeleton')).toHaveLength(14);
    });
});
