import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                    <h2 className="account-card-title">
                        {t('account.subscription.title')}
                    </h2>
                    <p className="account-card-subtitle">
                        {t('account.subscription.adminNotice')}
                    </p>
                </div>
                <div className="subscription-badge subscription-badge--admin">
                    {t('account.subscription.adminBadge')}
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
                    <h2 className="account-card-title">
                        {t('account.subscription.title')}
                    </h2>
                    <p className="account-card-subtitle">
                        {t('account.subscription.paidSubtitle')}
                    </p>
                </div>

                <div className="subscription-status">
                    <span
                        className={`subscription-badge subscription-badge--${
                            cancelling || isPastDue ? 'warning' : 'active'
                        }`}
                    >
                        {cancelling
                            ? t('account.subscription.badgeProCancelling')
                            : t('account.subscription.badgePro')}
                    </span>
                    {cancelling && accessEndsOn && (
                        <p className="subscription-status-line subscription-status-line--warning">
                            <Trans
                                i18nKey={
                                    isTrial
                                        ? 'account.subscription.cancelledTrial'
                                        : 'account.subscription.cancelledSubscription'
                                }
                                values={{ date: accessEndsOn }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                    )}
                    {!cancelling && isTrial && trialEnds && (
                        <p className="subscription-status-line">
                            <Trans
                                i18nKey="account.subscription.trialEnds"
                                values={{ date: trialEnds }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                    )}
                    {!cancelling && !isTrial && !isPastDue && periodEnds && (
                        <p className="subscription-status-line">
                            <Trans
                                i18nKey="account.subscription.renews"
                                values={{ date: periodEnds }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                    )}
                    {!cancelling && isPastDue && (
                        <p className="subscription-status-line subscription-status-line--warning">
                            {t('account.subscription.pastDue')}
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
                            ? t('account.subscription.opening')
                            : isPastDue
                                ? t('account.subscription.updatePayment')
                                : cancelling
                                    ? t('account.subscription.resumeBilling')
                                    : t('account.subscription.manageBilling')}
                    </ButtonCustom>
                </div>

                {portalError && (
                    <p className="subscription-error" role="alert">
                        {t('account.subscription.portalError', {
                            error: portalError.message,
                        })}
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
                <h2 className="account-card-title">
                    {t('account.subscription.title')}
                </h2>
                <p className="account-card-subtitle">
                    {isCanceled
                        ? t('account.subscription.canceledSubtitle')
                        : t('account.subscription.freeSubtitle')}
                </p>
            </div>

            <div className="subscription-status">
                <span className="subscription-badge subscription-badge--free">
                    {t('account.subscription.badgeFree')}
                </span>
                <p className="subscription-status-line">
                    <Trans
                        i18nKey="account.subscription.tripCap"
                        count={user.effectiveTripCap}
                        values={{ count: user.effectiveTripCap }}
                        components={{ strong: <strong /> }}
                    />
                </p>
            </div>

            <PlanCards
                headline={
                    isCanceled
                        ? t('account.subscription.resubscribeHeadline')
                        : t('account.subscription.upgradeHeadline')
                }
                body={
                    isCanceled
                        ? t('account.subscription.resubscribeBody')
                        : t('account.subscription.upgradeBody')
                }
            />

            <p className="subscription-compare">
                <Trans
                    i18nKey="account.subscription.compare"
                    components={{
                        compareLink: (
                            <Link
                                to="/membership"
                                className="subscription-compare-link"
                            />
                        ),
                    }}
                />
            </p>
        </section>
    );
};

export default SubscriptionSection;
