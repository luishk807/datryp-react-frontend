import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import SmsPolicy from './index';

describe('SmsPolicy', () => {
    it('renders the page title and last-updated date', () => {
        renderWithProviders(<SmsPolicy />);
        expect(
            screen.getByRole('heading', { name: 'SMS Messaging Policy' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Last updated: June 10, 2026')
        ).toBeInTheDocument();
    });

    it('renders all six policy sections as h2 headings', () => {
        renderWithProviders(<SmsPolicy />);
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
        expect(
            screen.getByRole('heading', { name: 'The short version' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'How you opt in' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Opting out and getting help' })
        ).toBeInTheDocument();
    });

    it('shows the exact carrier consent language', () => {
        renderWithProviders(<SmsPolicy />);
        expect(
            screen.getByText(/I agree to receive SMS text messages from DaTryp/i)
        ).toBeInTheDocument();
    });

    it('links to the privacy and terms pages and a support mailto', () => {
        renderWithProviders(<SmsPolicy />);
        expect(
            screen.getByRole('link', { name: 'Privacy Policy' })
        ).toHaveAttribute('href', '/privacy');
        expect(
            screen.getByRole('link', { name: 'Terms of Service' })
        ).toHaveAttribute('href', '/terms');
        expect(
            screen.getByRole('link', { name: 'info@datryp.com' })
        ).toHaveAttribute('href', 'mailto:info@datryp.com');
    });
});
