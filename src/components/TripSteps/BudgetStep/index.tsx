import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import InputField from 'components/common/FormFields/InputField';
import BudgetSuggestionBadge from 'components/BudgetSuggestionBadge';
import { useBudgetSuggestion } from 'hooks/useBudgetSuggestion';
import { useUser } from 'context/UserContext';
import type { TripChangeEvent, TripState } from 'types';
import './index.scss';

interface BudgetStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 4 — total trip budget. Auto-fills via `POST /budgets/suggest` once
 *  a country + valid date range are known (both set on earlier steps), and
 *  only when the user hasn't typed their own number. */
const BudgetStep = ({ data, onChange }: BudgetStepProps) => {
    const { t } = useTranslation();
    const { user, isLoading: isUserLoading } = useUser();
    const rootCountry = data?.destinations?.[0]?.country;
    const start = data?.startDate ?? '';
    const end = data?.endDate ?? '';
    const budget = String(data?.budget ?? '');

    const nights = (() => {
        if (!start || !end) return null;
        const a = new Date(start);
        const b = new Date(end);
        const diff = Math.round(
            (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Number.isFinite(diff) && diff >= 0 ? diff : null;
    })();

    // `nights` is end - start; trip length in days is nights + 1 (a same-day
    // trip is 1 day, not 0). Cap at 90 to match the backend's range.
    const suggestableDays = (() => {
        if (nights === null) return null;
        const d = nights + 1;
        return d >= 1 && d <= 90 ? d : null;
    })();
    const countryCode = rootCountry?.code ?? null;

    const inferredCity = (() => {
        const firstDayActivities =
            data?.destinations?.[0]?.itinerary?.[0]?.activities ?? [];
        for (const a of firstDayActivities) {
            const m =
                typeof a.name === 'string'
                    ? /^(?:Flight|Train) to (.+)$/.exec(a.name)
                    : null;
            if (m && m[1]) return m[1];
        }
        return null;
    })();

    const destinationLabel = rootCountry?.name
        ? inferredCity
            ? `${inferredCity}, ${rootCountry.name}`
            : rootCountry.name
        : null;

    const handleAutoFill = useCallback(
        (total: number) => {
            onChange('budget', { target: { value: String(total) } });
        },
        [onChange],
    );

    const { suggestion, isLoading: isLoadingSuggestion, inputMatchesAi } =
        useBudgetSuggestion({
            countryCode,
            city: inferredCity,
            days: suggestableDays,
            startDate: start,
            travelStyle: user?.travelerStyles?.[0] ?? null,
            homeCountryCode: user?.homeCountryCode ?? null,
            homeCity: user?.homeCity ?? null,
            enabled: !isUserLoading,
            currentBudget: budget,
            autoFill: true,
            onAutoFill: handleAutoFill,
        });

    return (
        <div
            className="trip-step-screen trip-budget-step"
            data-tour="trip-budget"
        >
            <h2 className="trip-step-headline">
                {t('createTrip.budget.title')}
            </h2>
            <p className="trip-step-sub">{t('createTrip.budget.subtitle')}</p>

            <div className="trip-step-card">
                <div className="trip-step-field trip-budget-field">
                    <label className="trip-step-label">
                        <PaymentsOutlinedIcon />{' '}
                        {t('createTrip.budget.label')}
                    </label>
                    <InputField
                        value={budget}
                        name="budget"
                        placeholder={
                            isLoadingSuggestion
                                ? t('createTrip.budget.loadingPlaceholder')
                                : t('createTrip.budget.placeholder')
                        }
                        onChange={(e) => onChange('budget', e)}
                    />
                    <BudgetSuggestionBadge
                        suggestion={suggestion}
                        isLoading={isLoadingSuggestion}
                        destinationLabel={destinationLabel}
                        inputMatchesAi={inputMatchesAi}
                    />
                    <p className="trip-budget-hint">
                        {t('createTrip.budget.hint')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BudgetStep;
