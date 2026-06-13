import { useTranslation } from 'react-i18next';
import { useStartCheckout } from 'api/hooks/useBilling';
import './index.scss';

interface PlanCardsProps {
    /** Optional headline rendered above the two plan cards. Pass null/undefined
     *  to omit. Used so paywall (cap-hit) and upgrade (voluntary) flows can
     *  show different framing without duplicating the card grid. */
    headline?: string;
    /** Optional body copy under the headline. Same rationale. */
    body?: string;
    /** Show the "30-day free trial" reassurance line under the cards. */
    showTrialNote?: boolean;
    /** Optional className for the outer wrapper — used to scope plan-card
     *  styles where needed (e.g. tighter spacing inside a modal). */
    className?: string;
}

/**
 * Shared two-tier plan card grid + Stripe Checkout trigger. Self-contained:
 * owns the `useStartCheckout` mutation so consumers don't have to wire it.
 * Use from PaywallModal (cap-hit) and the Account page Subscription section
 * (voluntary upgrade) without duplicating the visual + logic.
 */
const PlanCards = ({
    headline,
    body,
    showTrialNote = true,
    className,
}: PlanCardsProps) => {
    const { t } = useTranslation();
    const startCheckout = useStartCheckout();
    const isPending = startCheckout.isPending;
    const error = startCheckout.error;

    const handlePlan = (plan: 'monthly' | 'yearly') => () => {
        startCheckout.mutate(plan);
    };

    return (
        <div className={`plan-cards${className ? ` ${className}` : ''}`}>
            {headline && <p className="plan-cards-headline">{headline}</p>}
            {body && <p className="plan-cards-body">{body}</p>}

            <div className="plan-cards-grid">
                <button
                    type="button"
                    className="plan-card"
                    onClick={handlePlan('monthly')}
                    disabled={isPending}
                >
                    <span className="plan-card-name">{t('planCards.monthly')}</span>
                    <span className="plan-card-price">
                        <strong>$3.99</strong>
                        <span className="plan-card-cadence">{t('planCards.perMonth')}</span>
                    </span>
                    <span className="plan-card-fine">{t('planCards.cancelAnytime')}</span>
                </button>
                <button
                    type="button"
                    className="plan-card plan-card--featured"
                    onClick={handlePlan('yearly')}
                    disabled={isPending}
                >
                    <span className="plan-card-badge">{t('planCards.saveBadge')}</span>
                    <span className="plan-card-name">{t('planCards.yearly')}</span>
                    <span className="plan-card-price">
                        <strong>$29</strong>
                        <span className="plan-card-cadence">{t('planCards.perYear')}</span>
                    </span>
                    <span className="plan-card-fine">{t('planCards.approxMonthly')}</span>
                </button>
            </div>

            {showTrialNote && (
                <p className="plan-cards-trial-note">
                    {t('planCards.trialNote')}
                </p>
            )}

            {error && (
                <p className="plan-cards-error" role="alert">
                    {t('planCards.checkoutError', { message: error.message })}
                </p>
            )}
        </div>
    );
};

export default PlanCards;
