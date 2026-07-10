import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// SubLayout wraps the app shell (Header/Footer → useUser/SearchBar/data hooks).
// It's covered by its own test, so stub it to a passthrough that keeps the
// page's title + content observable.
vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import Terms from './index';

describe('Terms', () => {
    it('renders the page title and its policy sections', () => {
        renderWithProviders(<Terms />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            /terms/i
        );
        // Eight policy sections, each an h2.
        expect(
            screen.getAllByRole('heading', { level: 2 }).length
        ).toBeGreaterThanOrEqual(6);
    });

    it('shows the last-updated date', () => {
        renderWithProviders(<Terms />);
        expect(screen.getByText(/July 5, 2026/)).toBeInTheDocument();
    });
});
