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

import About from './index';

describe('About', () => {
    it('renders the page title and hero motto', () => {
        renderWithProviders(<About />);
        expect(
            screen.getByRole('heading', { name: 'About DaTryp.com' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Making More Trips Possible/i })
        ).toBeInTheDocument();
    });

    it('renders the four feature titles', () => {
        renderWithProviders(<About />);
        expect(
            screen.getByRole('heading', { name: /Travel that gets you/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Itineraries that flow/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Plan with friends/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /Yours forever/i })
        ).toBeInTheDocument();
    });

    it('renders the story and next section headings', () => {
        renderWithProviders(<About />);
        expect(
            screen.getByRole('heading', { name: 'Our story' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: "What's next" })
        ).toBeInTheDocument();
    });

    it('links the contact page and the start-planning CTA', () => {
        renderWithProviders(<About />);
        expect(
            screen.getByRole('link', { name: /contact page/i })
        ).toHaveAttribute('href', '/contact');
        expect(
            screen.getByRole('link', { name: /Start planning/i })
        ).toHaveAttribute('href', '/');
    });
});
