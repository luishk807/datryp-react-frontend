import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { BudgetSuggestResult } from 'api/budgetApi';
import BudgetSuggestionBadge from './index';

const result = (over: Partial<BudgetSuggestResult> = {}): BudgetSuggestResult => ({
    suggestedTotal: 2500,
    currency: 'USD',
    daily: 250,
    note: null,
    ...over,
});

describe('BudgetSuggestionBadge', () => {
    describe('loading', () => {
        it('shows a generic loading line without a destination', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={null}
                    isLoading
                    inputMatchesAi
                />
            );
            expect(screen.getByText('Updating estimate…')).toBeInTheDocument();
        });

        it('names the destination while loading when given one', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={null}
                    isLoading
                    destinationLabel="Tokyo"
                    inputMatchesAi
                />
            );
            expect(
                screen.getByText('Updating estimate for Tokyo…')
            ).toBeInTheDocument();
        });
    });

    describe('nothing to show', () => {
        it('renders nothing when the suggestion is null', () => {
            const { container } = renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={null}
                    isLoading={false}
                    inputMatchesAi
                />
            );
            expect(container).toBeEmptyDOMElement();
        });

        it('renders nothing when suggestedTotal is null', () => {
            const { container } = renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={result({ suggestedTotal: null })}
                    isLoading={false}
                    inputMatchesAi
                />
            );
            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('populated', () => {
        it('reads as the active AI value when the input matches, formatting the total', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={result()}
                    isLoading={false}
                    inputMatchesAi
                />
            );
            expect(
                screen.getByText(/Suggested budget: \$2,500/)
            ).toBeInTheDocument();
        });

        it('reads as a muted reference when the input differs from the AI', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={result()}
                    isLoading={false}
                    inputMatchesAi={false}
                />
            );
            expect(
                screen.getByText(/Average suggested: \$2,500/)
            ).toBeInTheDocument();
        });

        it('anchors the copy to the destination when supplied', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={result()}
                    isLoading={false}
                    destinationLabel="Tokyo"
                    inputMatchesAi
                />
            );
            expect(
                screen.getByText(/Suggested budget for Tokyo: \$2,500/)
            ).toBeInTheDocument();
        });

        it('appends the model note when present', () => {
            renderWithProviders(
                <BudgetSuggestionBadge
                    suggestion={result({ note: 'mid-range, 5 days' })}
                    isLoading={false}
                    inputMatchesAi
                />
            );
            expect(
                screen.getByText(/\$2,500 — mid-range, 5 days/)
            ).toBeInTheDocument();
        });
    });
});
