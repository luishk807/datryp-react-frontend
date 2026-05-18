import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
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
const MembershipWelcome = () => {
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
        <Layout title="Welcome to Pro">
            <article className="welcome-page">
                <div className="welcome-hero">
                    <CheckCircleRoundedIcon
                        className="welcome-hero-icon"
                        aria-hidden="true"
                    />
                    <h1 className="welcome-hero-title">
                        You&rsquo;re in. Welcome to daTryp Pro.
                    </h1>
                    <p className="welcome-hero-subtitle">
                        Your 30-day free trial has started. No charge until
                        day 31 — cancel anytime from your Account page.
                    </p>
                </div>

                <section className="welcome-perks">
                    <h2 className="welcome-section-title">
                        What you can do now
                    </h2>
                    <ul className="welcome-perks-list">
                        <li>
                            <strong>Save as many trips as you like.</strong>{' '}
                            Past, present, and future — all in one place.
                        </li>
                        <li>
                            <strong>Advanced AI Search is unlocked.</strong>{' '}
                            Searches return 5 places with deeper detail and
                            richer recommendations.
                        </li>
                        <li>
                            <strong>No daily limits.</strong> Search as much
                            as you want.
                        </li>
                        <li>
                            <strong>Manage anytime.</strong> Switch between
                            monthly and yearly, update your card, or cancel
                            from the Account page&rsquo;s Subscription
                            section.
                        </li>
                    </ul>
                </section>

                <div className="welcome-actions">
                    <Link to="/" className="welcome-action-link">
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD}
                            capitalizeType="uppercase"
                            label="Start planning"
                        />
                    </Link>
                    <Link
                        to="/account#subscription"
                        className="welcome-action-link"
                    >
                        <ButtonCustom
                            type={BUTTON_VARIANT.LINE}
                            capitalizeType="uppercase"
                            label="View subscription"
                        />
                    </Link>
                </div>

                <p className="welcome-fineprint">
                    A receipt for your subscription will be emailed to you by
                    Stripe.
                </p>
            </article>
        </Layout>
    );
};

export default MembershipWelcome;
