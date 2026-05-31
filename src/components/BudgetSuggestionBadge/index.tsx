import classnames from 'classnames';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import type { BudgetSuggestResult } from 'api/budgetApi';
import './index.scss';

interface BudgetSuggestionBadgeProps {
    suggestion: BudgetSuggestResult | null;
    isLoading: boolean;
    /** Used in the copy: "AI suggested budget for {destinationLabel}".
     *  Null when we don't have a destination name to anchor on — the
     *  badge falls back to a generic "AI suggested budget: $X". */
    destinationLabel?: string | null;
    /** When true the badge reads as the active AI value (emphasized
     *  chip). When false it reads as a reference number for comparison
     *  with the user's own value (muted, no chip background). */
    inputMatchesAi: boolean;
}

/**
 * Inline badge under the budget input. Two modes — emphasized (AI value
 * is what the user has) vs muted reference (user typed their own value
 * but the AI estimate is still useful to see). Used by BasicsStep in
 * the create wizard AND BasicInfo in the Edit Trip Info modal.
 */
const BudgetSuggestionBadge = ({
    suggestion,
    isLoading,
    destinationLabel = null,
    inputMatchesAi,
}: BudgetSuggestionBadgeProps) => {
    if (isLoading) {
        return (
            <p className="trip-basics-budget-ai-badge is-loading">
                <AutoAwesomeRoundedIcon
                    className="trip-basics-budget-ai-badge-icon"
                    fontSize="small"
                />
                <span>
                    Updating estimate
                    {destinationLabel ? ` for ${destinationLabel}` : ''}…
                </span>
            </p>
        );
    }

    if (!suggestion || suggestion.suggestedTotal == null) return null;

    const formatted = `$${suggestion.suggestedTotal.toLocaleString()}`;
    const note = suggestion.note ?? null;

    return (
        <p
            className={classnames('trip-basics-budget-ai-badge', {
                'is-reference': !inputMatchesAi,
            })}
        >
            <AutoAwesomeRoundedIcon
                className="trip-basics-budget-ai-badge-icon"
                fontSize="small"
            />
            <span>
                {inputMatchesAi ? 'Suggested budget' : 'Average suggested'}
                {destinationLabel ? ` for ${destinationLabel}` : ''}:{' '}
                {formatted}
                {note ? ` — ${note}` : ''}
            </span>
        </p>
    );
};

export default BudgetSuggestionBadge;
