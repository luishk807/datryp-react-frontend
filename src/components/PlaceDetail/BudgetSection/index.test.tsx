import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import BudgetSection from './index';

describe('BudgetSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <BudgetSection description="anything" costLevel={3} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the heading, cost badge, and description paragraph', () => {
        renderWithProviders(
            <BudgetSection
                description="Tokyo runs mid-range for most travelers."
                costLevel={3}
            />
        );

        expect(
            screen.getByRole('heading', { name: /Expenses & budget/ })
        ).toBeInTheDocument();
        // CostBadge exposes a hover title with the friendly tier label.
        expect(screen.getByTitle('3/5 — Mid-range')).toBeInTheDocument();
        expect(
            screen.getByText('Tokyo runs mid-range for most travelers.')
        ).toBeInTheDocument();
    });

    it('hides the badge when the cost level is null but keeps the section', () => {
        renderWithProviders(
            <BudgetSection description="Costs vary widely." costLevel={null} />
        );
        expect(
            screen.getByRole('heading', { name: /Expenses & budget/ })
        ).toBeInTheDocument();
        expect(screen.queryByTitle(/\/5/)).not.toBeInTheDocument();
    });

    it('shows a skeleton (no paragraph) while the description loads', () => {
        const { container } = renderWithProviders(
            <BudgetSection description={undefined} costLevel={2} />
        );
        expect(
            screen.getByRole('heading', { name: /Expenses & budget/ })
        ).toBeInTheDocument();
        expect(
            container.querySelector('.paragraph-section-description')
        ).toBeNull();
        expect(
            container.querySelector('.paragraph-skeleton')
        ).toBeInTheDocument();
    });
});
