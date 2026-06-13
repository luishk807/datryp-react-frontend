import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'api/queryKeys';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

/**
 * Post-Stripe-Checkout landing. The user just paid (or started a trial)
 * and Stripe redirected them here with a `session_id={CHECKOUT_SESSION_ID}`
 * query param. We show a celebratory confirmation + entry points back into
 * the product.
 *
 * Access is gated on the presence of a Stripe-looking session_id. This is a
 * UX gate, not a security one — the page has no sensitive data, but bouncing
 * direct URL-typers to home keeps the "thank you" frame intact for the
 * actual buyers.
 *
 * On mount the page invalidates the cached /auth/me response so the
 * Subscription section the user lands on after refreshes shows their new
 * Pro state (the Stripe webhook will have updated the DB by the time the
 * redirect lands).
 */
/** Perk bullets: bold lead + body under `welcome.perks.<key>`. */
const PERK_KEYS = ['savedTrips', 'search', 'noLimits', 'manage'] as const;

const MembershipWelcome = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const sessionId = searchParams.get('session_id') ?? '';

    // Bust the auth/me cache so when the user clicks "Manage subscription"
    // (or any other place that reads user state) the new Pro plan shows up.
    // The webhook may still be in flight; the refetch happens lazily.
    useEffect(() => {
        if (sessionId.startsWith('cs_')) {
            queryClient.invalidateQueries({ queryKey: queryKeys.me });
        }
    }, [sessionId, queryClient]);

    // Guard: the URL must carry a Stripe-shaped session_id. Anything else
    // (direct URL typing, social-share leak, bookmark) bounces to home.
    if (!sessionId.startsWith('cs_')) {
        return <Navigate to="/" replace />;
    }

    return (
        <Layout title={t('welcome.pageTitle')}>
            <article className="welcome-page">
                <div className="welcome-hero">
                    <CheckCircleRoundedIcon
                        className="welcome-hero-icon"
                        aria-hidden="true"
                    />
                    <h1 className="welcome-hero-title">
                        {t('welcome.heroTitle')}
                    </h1>
                    <p className="welcome-hero-subtitle">
                        {t('welcome.heroSubtitle')}
                    </p>
                </div>

                <section className="welcome-perks">
                    <h2 className="welcome-section-title">
                        {t('welcome.perksTitle')}
                    </h2>
                    <ul className="welcome-perks-list">
                        {PERK_KEYS.map((key) => (
                            <li key={key}>
                                <strong>{t(`welcome.perks.${key}.lead`)}</strong>{' '}
                                {t(`welcome.perks.${key}.body`)}
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="welcome-actions">
                    <Link to="/" className="welcome-action-link">
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD}
                            capitalizeType="uppercase"
                            label={t('welcome.startPlanning')}
                        />
                    </Link>
                    <Link
                        to="/account#subscription"
                        className="welcome-action-link"
                    >
                        <ButtonCustom
                            type={BUTTON_VARIANT.LINE}
                            capitalizeType="uppercase"
                            label={t('welcome.viewSubscription')}
                        />
                    </Link>
                </div>

                <p className="welcome-fineprint">
                    {t('welcome.fineprint')}
                </p>
            </article>
        </Layout>
    );
};

export default MembershipWelcome;
