import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { SafetyInfo } from 'types';
import SafetySection from './index';

describe('SafetySection', () => {
    it('shows a loading hint + skeleton while the payload is undefined', () => {
        renderWithProviders(<SafetySection safety={undefined} isError={false} />);
        expect(
            screen.getByRole('heading', { name: /safety/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/checking safety reports/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows an inline error when the query failed', () => {
        renderWithProviders(<SafetySection safety={undefined} isError />);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/could not load safety/i);
    });

    it('renders the safety meter once the payload resolves', () => {
        const safety: SafetyInfo = {
            score: 82,
            level: 'low',
            summary: 'Very safe for travelers.',
        };
        renderWithProviders(<SafetySection safety={safety} isError={false} />);

        expect(screen.getByText('Low risk')).toBeInTheDocument();
        expect(screen.getByText('82')).toBeInTheDocument();
        expect(screen.getByText('Very safe for travelers.')).toBeInTheDocument();
        const meter = screen.getByRole('meter');
        expect(meter).toHaveAttribute('aria-valuenow', '82');
    });
});
