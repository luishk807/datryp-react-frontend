import { Link } from 'react-router-dom';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlanCards from 'components/PlanCards';
import { useOpenBillingPortal } from 'api/hooks/useBilling';
import { useUser } from 'context/UserContext';
import { BUTTON_VARIANT, SUBSCRIPTION_STATUS } from 'constants';
import './index.scss';

/** Format an ISO-8601 timestamp as "May 18, 2026". Returns empty string on
 *  null/invalid so we don't render "Invalid Date". */
const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Account-page subscription panel. Shows current plan + status with the
 * right CTA per state:
 *
 *   Free           → PlanCards (start a trial)
 *   Trialing       → "Trial ends [date]" + Manage billing
 *   Active         → "Renews [date]" + Manage billing
 *   Past due       → "Last payment failed" + Update payment method
 *   Canceled       → "Subscription ended" + PlanCards (resubscribe)
 *   Admin          → "Admin — paywall bypassed" callout, no actions
 *
 * The Manage / Update buttons both go to the same Stripe Customer Portal —
 * Stripe's prebuilt UI lets the user switch plans, change cards, cancel,
 * view invoices. We don't reimplement that.
 */
const SubscriptionSection = () => {
    const { user, isAdmin } = useUser();
    const openPortal = useOpenBillingPortal();

    if (!user) return null;

    const handleManage = () => openPortal.mutate();
    const portalPending = openPortal.isPending;
    const portalError = openPortal.error;

    // Admins skip the whole flow — no Stripe customer, no billing concerns.
    if (isAdmin) {
        return (
            <section className="account-card" id="subscription">
                <div className="account-card-headings simple">
                    <h2 className="account-card-title">Subscription</h2>
                    <p className="account-card-subtitle">
                        You&rsquo;re an admin — paywalls don&rsquo;t apply to
                        you, and there&rsquo;s nothing to bill.
                    </p>
                </div>
                <div className="subscription-badge subscription-badge--admin">
                    Admin account
                </div>
            </section>
        );
    }

    const status = user.subscriptionStatus;
    const trialEnds = formatDate(user.trialEndsAt);
    const periodEnds = formatDate(user.currentPeriodEnd);
    const cancelling = user.cancelAtPeriodEnd;

    // ── Paid states ────────────────────────────────────────────────────
    if (
        status === SUBSCRIPTION_STATUS.TRIALING ||
        status === SUBSCRIPTION_STATUS.ACTIVE ||
        status === SUBSCRIPTION_STATUS.PAST_DUE
    ) {
        const isTrial = status === SUBSCRIPTION_STATUS.TRIALING;
        const isPastDue = status === SUBSCRIPTION_STATUS.PAST_DUE;
        // When cancelling, the end-of-access date is whichever boundary
        // closes the current period — trial_ends_at on trial, otherwise
        // current_period_end. Renders as "Pro access ends Jun 17".
        const accessEndsOn = isTrial ? trialEnds : periodEnds;

        return (
            <section className="account-card" id="subscription">
                <div className="account-card-headings simple">
                    <h2 className="account-card-title">Subscription</h2>
                    <p className="account-card-subtitle">
                        Manage your plan, payment method, and billing history.
                    </p>
                </div>

                <div className="subscription-status">
                    <span
                        className={`subscription-badge subscription-badge--${
                            cancelling || isPastDue ? 'warning' : 'active'
                        }`}
                    >
                        {cancelling ? 'DaTryp.com Pro — Cancelling' : 'DaTryp.com Pro'}
                    </span>
                    {cancelling && accessEndsOn && (
                        <p className="subscription-status-line subscription-status-line--warning">
                            {isTrial
                                ? `Your trial is cancelled. Pro access ends `
                                : `Your subscription is cancelled. Pro access ends `}
                            <strong>{accessEndsOn}</strong>
                            {isTrial
                                ? '. No charge will be made.'
                                : '. No further charges will be made.'}{' '}
                            Change your mind? Use the billing portal to
                            resume.
                        </p>
                    )}
                    {!cancelling && isTrial && trialEnds && (
                        <p className="subscription-status-line">
                            Free trial ends <strong>{trialEnds}</strong>. Your
                            card will be charged then unless you cancel.
                        </p>
                    )}
                    {!cancelling && !isTrial && !isPastDue && periodEnds && (
                        <p className="subscription-status-line">
                            Renews <strong>{periodEnds}</strong>.
                        </p>
                    )}
                    {!cancelling && isPastDue && (
                        <p className="subscription-status-line subscription-status-line--warning">
                            Your last payment failed. Update your payment
                            method in the billing portal to keep your Pro
                            access.
                        </p>
                    )}
                </div>

                <div className="subscription-actions">
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD_MINI}
                        capitalizeType="uppercase"
                        onClick={handleManage}
                        disabled={portalPending}
                    >
                        {portalPending
                            ? 'Opening…'
                            : isPastDue
                                ? 'Update payment method'
                                : cancelling
                                    ? 'Resume or update billing'
                                    : 'Manage billing'}
                    </ButtonCustom>
                </div>

                {portalError && (
                    <p className="subscription-error" role="alert">
                        Could not open the billing portal: {portalError.message}
                    </p>
                )}
            </section>
        );
    }

    // ── Free / never subscribed / canceled ─────────────────────────────
    const isCanceled = status === SUBSCRIPTION_STATUS.CANCELED;

    return (
        <section className="account-card" id="subscription">
            <div className="account-card-headings simple">
                <h2 className="account-card-title">Subscription</h2>
                <p className="account-card-subtitle">
                    {isCanceled
                        ? 'Your previous subscription has ended.'
                        : 'Upgrade to Pro for unlimited trips and Advanced Search.'}
                </p>
            </div>

            <div className="subscription-status">
                <span className="subscription-badge subscription-badge--free">
                    Free plan
                </span>
                <p className="subscription-status-line">
                    Save up to <strong>{user.effectiveTripCap}</strong> trip
                    {user.effectiveTripCap === 1 ? '' : 's'} with standard
                    search results.
                </p>
            </div>

            <PlanCards
                headline={isCanceled ? 'Resubscribe to Pro' : 'Upgrade to Pro'}
                body={
                    isCanceled
                        ? 'Pick up where you left off — your saved trips are still there.'
                        : 'Unlimited saved trips, Advanced Search, richer recommendations.'
                }
            />

            <p className="subscription-compare">
                Want the full feature breakdown?{' '}
                <Link to="/membership" className="subscription-compare-link">
                    See plan comparison
                </Link>
                .
            </p>
        </section>
    );
};

export default SubscriptionSection;
