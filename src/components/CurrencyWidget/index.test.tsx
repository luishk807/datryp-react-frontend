import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

// Both data hooks hit the network — mock so the chip renders offline and the
// rate math is driven by deterministic inputs.
let mockUserCurrency: string | undefined;
let mockFxRates: Record<string, number> | undefined;

vi.mock('api/hooks/useUserCurrency', () => ({
    useUserCurrency: () => ({ data: mockUserCurrency }),
}));
vi.mock('api/hooks/useFxRates', () => ({
    useFxRates: () => ({ data: mockFxRates }),
}));

import CurrencyWidget from './index';

const krw = { code: 'KRW', name: 'South Korean Won', ratePerUsd: 1300 };

beforeEach(() => {
    mockUserCurrency = undefined;
    mockFxRates = undefined;
});

describe('CurrencyWidget', () => {
    it('falls back to a USD chip + approx disclaimer with no fx rates', () => {
        renderWithProviders(<CurrencyWidget info={krw} />);
        expect(screen.getByText('1 USD')).toBeInTheDocument();
        expect(screen.getByText('1300')).toBeInTheDocument();
        expect(screen.getByText('KRW')).toBeInTheDocument();
        expect(screen.getByText('South Korean Won')).toBeInTheDocument();
        expect(
            screen.getByText('Approximate — check before travel.')
        ).toBeInTheDocument();
    });

    it('reads the rate as one accessible sentence, hiding the split pieces', () => {
        renderWithProviders(<CurrencyWidget info={krw} />);
        // The whole rate row is a single labelled unit for screen readers,
        // using the currency NAME (not the code chip) for a readable name.
        expect(
            screen.getByRole('img', {
                name: '1 USD ≈ 1300 South Korean Won',
            })
        ).toBeInTheDocument();
        // The visual tokens are hidden so they don't double-read.
        expect(screen.getByText('1 USD')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
        expect(screen.getByText('1300')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText('KRW')).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows the live-rate disclaimer once fx rates are present', () => {
        mockFxRates = { KRW: 1300 };
        renderWithProviders(<CurrencyWidget info={krw} />);
        expect(
            screen.getByText('Live rate from the ECB — check before travel.')
        ).toBeInTheDocument();
    });

    it('converts from the user home currency when the fx source carries it', () => {
        mockUserCurrency = 'eur';
        mockFxRates = { EUR: 0.9, THB: 33 };
        renderWithProviders(
            <CurrencyWidget
                info={{ code: 'THB', name: 'Thai Baht', ratePerUsd: 30 }}
            />
        );
        // 1 EUR ≈ 33 / 0.9 = 36.7 THB (formatRate → one decimal in the tens).
        expect(screen.getByText('1 EUR')).toBeInTheDocument();
        expect(screen.getByText('36.7')).toBeInTheDocument();
        expect(screen.getByText('THB')).toBeInTheDocument();
    });

    it('renders two-decimal precision for sub-10 rates', () => {
        renderWithProviders(
            <CurrencyWidget
                info={{ code: 'CHF', name: 'Swiss Franc', ratePerUsd: 0.91 }}
            />
        );
        expect(screen.getByText('0.91')).toBeInTheDocument();
    });

    it('collapses to the home-currency note when from === destination', () => {
        mockUserCurrency = 'eur';
        mockFxRates = { EUR: 0.9 };
        renderWithProviders(
            <CurrencyWidget
                info={{ code: 'EUR', name: 'Euro', ratePerUsd: 0.9 }}
            />
        );
        expect(
            screen.getByText('This is your home currency.')
        ).toBeInTheDocument();
        expect(screen.getByText('Euro')).toBeInTheDocument();
        // No conversion chip and no disclaimer in the home branch.
        expect(screen.queryByText('≈')).not.toBeInTheDocument();
        expect(
            screen.queryByText(/check before travel/)
        ).not.toBeInTheDocument();
    });
});
