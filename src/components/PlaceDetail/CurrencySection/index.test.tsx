import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CurrencyInfo } from 'types';

// CurrencyWidget fetches FX rates + user currency — stub it so this test
// stays focused on the section's load/error/data switching.
vi.mock('components/CurrencyWidget', () => ({
    default: ({ info }: { info: CurrencyInfo }) => (
        <div data-testid="currency-widget">{info.code}</div>
    ),
}));

import CurrencySection from './index';

const info: CurrencyInfo = { code: 'JPY', name: 'Japanese Yen', ratePerUsd: 150 };

describe('CurrencySection', () => {
    it('renders the currency widget once the payload resolves', () => {
        renderWithProviders(<CurrencySection currency={info} isError={false} />);

        expect(
            screen.getByRole('heading', { name: 'Currency' })
        ).toBeInTheDocument();
        expect(screen.getByTestId('currency-widget')).toHaveTextContent('JPY');
    });

    it('shows an inline error when the query failed', () => {
        renderWithProviders(<CurrencySection currency={undefined} isError />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load currency.'
        );
    });

    it('shows the loading hint while the payload is undefined', () => {
        renderWithProviders(
            <CurrencySection currency={undefined} isError={false} />
        );
        expect(
            screen.getByText('Looking up the local currency…')
        ).toBeInTheDocument();
        expect(screen.queryByTestId('currency-widget')).not.toBeInTheDocument();
    });
});
