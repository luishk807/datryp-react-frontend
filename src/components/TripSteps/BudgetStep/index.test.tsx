import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { BudgetSuggestResult } from 'api/budgetApi';
import type { TripState } from 'types';

// useUser throws outside a UserProvider; useBudgetSuggestion fires a network
// call once a country + valid dates are known. Both mocked so the step renders
// offline and deterministically.
let mockUser: { id: string; name: string } | null = null;
let mockSuggestion: BudgetSuggestResult | null = null;
let mockSuggestionLoading = false;
let mockInputMatchesAi = false;

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isLoading: false }),
}));

vi.mock('hooks/useBudgetSuggestion', () => ({
    useBudgetSuggestion: () => ({
        suggestion: mockSuggestion,
        isLoading: mockSuggestionLoading,
        inputMatchesAi: mockInputMatchesAi,
    }),
}));

import BudgetStep from './index';

const trip = (over: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1', name: 'Ana' };
    mockSuggestion = null;
    mockSuggestionLoading = false;
    mockInputMatchesAi = false;
});

describe('BudgetStep', () => {
    it('renders the headline, label, and budget input', () => {
        renderWithProviders(<BudgetStep data={trip()} onChange={vi.fn()} />);
        expect(
            screen.getByRole('heading', { name: /what's your budget/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Total budget')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('e.g. 2000')
        ).toBeInTheDocument();
    });

    it('reflects the saved budget value in the input', () => {
        renderWithProviders(
            <BudgetStep data={trip({ budget: 1500 })} onChange={vi.fn()} />
        );
        expect(screen.getByRole('textbox')).toHaveValue('1500');
    });

    it('fires onChange with the field id and typed value', async () => {
        // Capture the value synchronously — the input is controlled at ''
        // and resets after each keystroke, so the DOM node's value is gone
        // by assertion time; the event's live target is read during dispatch.
        const values: string[] = [];
        const onChange = vi.fn((_id: string, e: { target: { value: string } }) =>
            values.push(e.target.value)
        );
        renderWithProviders(<BudgetStep data={trip()} onChange={onChange} />);
        await userEvent.type(screen.getByRole('textbox'), '9');
        expect(onChange).toHaveBeenCalledWith('budget', expect.anything());
        expect(values).toContain('9');
    });

    it('shows the loading placeholder while an estimate is in flight', () => {
        mockSuggestionLoading = true;
        renderWithProviders(<BudgetStep data={trip()} onChange={vi.fn()} />);
        expect(
            screen.getByPlaceholderText('Asking datryp for an estimate…')
        ).toBeInTheDocument();
    });

    it('renders the AI reference badge when a suggestion is available', () => {
        mockSuggestion = { suggestedTotal: 2000, note: null } as never;
        renderWithProviders(<BudgetStep data={trip()} onChange={vi.fn()} />);
        const badge = screen.getByText(/average suggested/i);
        expect(badge).toHaveTextContent('$2,000');
    });

    it('anchors the estimate to "City, Country" from a seeded flight leg', () => {
        mockSuggestion = { suggestedTotal: 2500, note: null } as never;
        mockInputMatchesAi = true;
        renderWithProviders(
            <BudgetStep
                data={{
                    startDate: '2026-08-01',
                    endDate: '2026-08-05',
                    destinations: [
                        {
                            id: 1,
                            country: { id: 1, name: 'France', code: 'FR' },
                            itinerary: [
                                {
                                    id: 1,
                                    date: '2026-08-01',
                                    activities: [
                                        { id: 1, name: 'Flight to Paris' } as never,
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                onChange={vi.fn()}
            />
        );
        expect(
            screen.getByText(/suggested budget for paris, france/i)
        ).toBeInTheDocument();
    });

    it('drops a city that merely echoes the country name from the label', () => {
        mockSuggestion = { suggestedTotal: 1800, note: null } as never;
        renderWithProviders(
            <BudgetStep
                data={{
                    startDate: '2026-08-01',
                    endDate: '2026-08-03',
                    destinations: [
                        {
                            id: 1,
                            country: { id: 1, name: 'Iceland', code: 'IS' },
                            itinerary: [
                                {
                                    id: 1,
                                    date: '2026-08-01',
                                    activities: [
                                        {
                                            id: 1,
                                            name: 'Flight to Iceland',
                                        } as never,
                                    ],
                                },
                            ],
                        },
                    ],
                }}
                onChange={vi.fn()}
            />
        );
        expect(
            screen.getByText(/average suggested for iceland:/i)
        ).toBeInTheDocument();
    });
});
