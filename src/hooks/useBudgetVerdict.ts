/**
 * AI-budget verdict hook. Wraps `useBudgetSuggestion` (read-only) and
 * maps the comparison (user's saved budget vs the AI estimate) onto a
 * 3-state verdict — Tight / On target / Comfortable — with a "why"
 * sentence for the tooltip.
 *
 * Extracted from BasicTripInfo so the verdict chip can render wherever
 * the trip's budget is shown (currently the Trip Expenses Meter). The
 * user's saved budget is the source of truth; this only surfaces
 * whether it's tight / right-sized / cushioned for the destination.
 */
import { useBudgetSuggestion } from 'hooks/useBudgetSuggestion';
import { useUser } from 'context/UserContext';
import { isValidDate } from 'utils';
import type { TripState } from 'types';

export type BudgetVerdictTone = 'low' | 'on' | 'high';

export interface BudgetVerdict {
    tone: BudgetVerdictTone;
    label: string;
    why: string;
}

export const useBudgetVerdict = (data: TripState): BudgetVerdict | null => {
    const { user: currentUser, isLoading: isUserLoading } = useUser();

    const tripDays = (() => {
        if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) {
            return null;
        }
        const ms =
            new Date(data.endDate as string).getTime() -
            new Date(data.startDate as string).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
        return days >= 1 && days <= 90 ? days : null;
    })();

    const budgetCountryCode = data.destinations?.[0]?.country?.code ?? null;
    const budgetCountryName = data.destinations?.[0]?.country?.name ?? null;

    const { suggestion: budgetSuggestion } = useBudgetSuggestion({
        countryCode: budgetCountryCode,
        city: null,
        days: tripDays,
        startDate: data.startDate ?? null,
        travelStyle: currentUser?.travelerStyles?.[0] ?? null,
        homeCountryCode: currentUser?.homeCountryCode ?? null,
        homeCity: currentUser?.homeCity ?? null,
        enabled: !isUserLoading,
        currentBudget: String(data.budget ?? ''),
        autoFill: false,
    });

    const budgetNum = Number(data.budget);
    const suggestedTotal = budgetSuggestion?.suggestedTotal ?? null;
    const aiNote = budgetSuggestion?.note ?? null;

    if (suggestedTotal == null || !suggestedTotal) return null;
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) return null;

    const ratio = budgetNum / suggestedTotal;
    const suggestedLabel = `$${suggestedTotal.toLocaleString()}`;
    const destination = budgetCountryName ? ` for ${budgetCountryName}` : '';

    if (ratio < 0.7) {
        return {
            tone: 'low',
            label: 'Tight',
            why:
                `We estimate about ${suggestedLabel}${destination}. ` +
                `Your budget is ${Math.round((1 - ratio) * 100)}% under — ` +
                `you may need to economize on lodging or dining.` +
                (aiNote ? ` ${aiNote}` : ''),
        };
    }
    if (ratio > 1.3) {
        return {
            tone: 'high',
            label: 'Comfortable',
            why:
                `We estimate about ${suggestedLabel}${destination}. ` +
                `You have ${Math.round((ratio - 1) * 100)}% cushion — ` +
                `room for upgrades or memorable splurges.` +
                (aiNote ? ` ${aiNote}` : ''),
        };
    }
    return {
        tone: 'on',
        label: 'On target',
        why:
            `We estimate about ${suggestedLabel}${destination}. ` +
            `Your budget lines up with typical spend for this trip.` +
            (aiNote ? ` ${aiNote}` : ''),
    };
};
