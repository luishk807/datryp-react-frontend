import { useMutation } from '@tanstack/react-query';
import {
    suggestBudget,
    type BudgetSuggestRequest,
    type BudgetSuggestResult,
} from 'api/budgetApi';

/**
 * Mutation wrapper around `POST /budgets/suggest`. A mutation (not a
 * query) because the call is user-triggered — the "Suggest a budget"
 * button on BasicsStep fires it on click, never on render. The model
 * call costs OpenAI tokens so we don't want it polling.
 *
 * The mutation's data can be `null` — that's the fail-soft branch
 * from the backend ("couldn't estimate, keep the input blank") and
 * the caller should NOT show an error in that case.
 */
export const useBudgetSuggestion = () =>
    useMutation<BudgetSuggestResult | null, Error, BudgetSuggestRequest>({
        mutationFn: suggestBudget,
    });
