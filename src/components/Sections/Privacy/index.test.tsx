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

import Privacy from './index';

describe('Privacy', () => {
    it('renders the page title and last-updated date', () => {
        renderWithProviders(<Privacy />);
        expect(
            screen.getByRole('heading', { name: 'Privacy Policy' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Last updated: May 30, 2026')
        ).toBeInTheDocument();
    });

    it('renders all twelve policy sections as h2 headings', () => {
        renderWithProviders(<Privacy />);
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(12);
    });

    it('renders key section headings', () => {
        renderWithProviders(<Privacy />);
        expect(
            screen.getByRole('heading', { name: 'The short version' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'What we collect' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Security' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Children' })
        ).toBeInTheDocument();
    });
});
