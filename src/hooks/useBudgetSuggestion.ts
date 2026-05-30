/**
 * Shared AI-budget-suggestion hook. Powers the badge under the budget
 * input in BOTH the wizard's BasicsStep ("Tell us about your trip" →
 * auto-fill the field) AND the Edit Trip Info modal's BasicInfo form
 * ("Average suggested for X: $Y" reference under a saved budget the
 * user already typed).
 *
 * Auto-fill semantics:
 *  - `autoFill: true` — the hook will dispatch the AI's suggestedTotal
 *    back via `onAutoFill` when the current budget is empty OR still
 *    equals the last AI total. This is the wizard's "pick a default"
 *    behavior. The hook never overwrites a value the user typed.
 *  - `autoFill: false` — the hook is read-only. It fetches a suggestion
 *    so the badge can display it, but never touches the budget input.
 *    Used by the edit modal where the saved budget is the source of
 *    truth.
 *
 * The hook owns its own state (not TanStack Query) for the same
 * StrictMode reason called out in BasicsStep: dev-mode double-mount
 * orphans a mutation observer's settled result. Local state + an
 * AbortController is the simplest survivable shape.
 */
import { useEffect, useRef, useState } from 'react';
import { suggestBudget, type BudgetSuggestResult } from 'api/budgetApi';

export interface UseBudgetSuggestionInput {
    countryCode: string | null;
    /** Optional city refinement — anchors the lodging estimate when
     *  set. Null = country-level estimate. */
    city?: string | null;
    /** Trip duration in days (1..90). Null disables the call — used to
     *  gate on "we don't have valid dates yet". */
    days: number | null;
    startDate?: string | null;
    travelStyle?: string | null;
    homeCountryCode?: string | null;
    homeCity?: string | null;
    /** Wait for an auth/me fetch (or any other prerequisite) before
     *  firing the first call. When true, the hook is a no-op until
     *  this flips to false. Skips wasting OpenAI calls on stale home-
     *  base data. */
    enabled?: boolean;
    /** Current value in the budget input — used both to detect "does
     *  the input still match the AI" (drives the badge's emphasized
     *  vs muted variant) AND to decide whether auto-fill should fire. */
    currentBudget?: string;
    autoFill?: boolean;
    onAutoFill?: (suggestedTotal: number) => void;
}

export interface UseBudgetSuggestionResult {
    /** Last successful suggestion. Survives across destination /
     *  date changes; replaced when the next call resolves. Null
     *  before the first call settles. */
    suggestion: BudgetSuggestResult | null;
    isLoading: boolean;
    /** True when the budget input value is exactly the AI's
     *  suggestedTotal (as a string). Drives the badge's "AI suggested
     *  budget" vs "Average suggested" copy. */
    inputMatchesAi: boolean;
}

export const useBudgetSuggestion = ({
    countryCode,
    city = null,
    days,
    startDate = null,
    travelStyle = null,
    homeCountryCode = null,
    homeCity = null,
    enabled = true,
    currentBudget = '',
    autoFill = false,
    onAutoFill,
}: UseBudgetSuggestionInput): UseBudgetSuggestionResult => {
    const [suggestion, setSuggestion] = useState<BudgetSuggestResult | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(false);
    // The last value we auto-filled, so we can re-fill when the user
    // either hasn't touched it or has typed the same number back. Lives
    // in a ref so it doesn't re-trigger the effect on its own.
    const lastAiTotalRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;
        if (!countryCode) return;
        if (days === null || days < 1 || days > 90) return;
        if (!startDate) return;

        // Auto-fill gate: skip when the user has typed a value that
        // isn't blank and doesn't match what we last suggested.
        if (autoFill) {
            const trimmed = currentBudget.trim();
            const userEdited =
                trimmed !== '' &&
                trimmed !== '0' &&
                trimmed !== String(lastAiTotalRef.current ?? '');
            if (userEdited) return;
        }

        // BE schema caps `start_date` at YYYY-MM-DD (10 chars). On
        // /trip-detail the trip's startDate comes back from GraphQL as
        // a full ISO datetime ("2026-06-29T00:00:00") which trips a 422.
        // Normalize to date-only before shipping.
        const startDateOnly = startDate
            ? startDate.slice(0, 10)
            : null;

        const ac = new AbortController();
        setIsLoading(true);
        suggestBudget(
            {
                countryCode,
                city,
                days,
                travelStyle,
                startDate: startDateOnly,
                homeCountryCode,
                homeCity,
            },
            ac.signal,
        )
            .then((result) => {
                if (ac.signal.aborted) return;
                setSuggestion(result);
                setIsLoading(false);
                if (autoFill && result?.suggestedTotal != null) {
                    lastAiTotalRef.current = result.suggestedTotal;
                    onAutoFill?.(result.suggestedTotal);
                }
            })
            .catch((err) => {
                if (ac.signal.aborted) return;
                if (err?.name === 'AbortError') return;
                setIsLoading(false);
            });

        return () => {
            ac.abort();
        };
        // `currentBudget` is intentionally NOT in deps — including it
        // would re-fire the AI call on every keystroke. The autoFill
        // guard reads its current value at effect time, which is
        // exactly the snapshot the hook should evaluate against.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        countryCode,
        city,
        days,
        startDate,
        travelStyle,
        homeCountryCode,
        homeCity,
        enabled,
        autoFill,
        onAutoFill,
    ]);

    const inputMatchesAi =
        suggestion?.suggestedTotal != null &&
        currentBudget === String(suggestion.suggestedTotal);

    return { suggestion, isLoading, inputMatchesAi };
};
