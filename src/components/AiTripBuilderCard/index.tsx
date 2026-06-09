/**
 * Pro-only homepage marketing card for the AI Trip Builder.
 *
 * Big, image-anchored ad block — two-column on desktop (visual on
 * left, copy + CTA on right), stacked on mobile. Tapping the CTA
 * routes the user to the full `/discover` wizard page (modal
 * was replaced because the feature deserves a real page experience
 * for Pro users).
 *
 * Hidden for signed-out + free-tier users — the pricing page is the
 * paywall path; the homepage stays free of upsell pressure.
 */
import { Link } from 'react-router-dom';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { useUser } from 'context/UserContext';
import { getUserFirstName } from 'utils/userName';
import './index.scss';

const STEPS = [
    {
        Icon: PaymentsRoundedIcon,
        title: 'Set a budget',
        body: 'A rough number, in USD.',
    },
    {
        Icon: ExploreRoundedIcon,
        title: 'Drop your interests',
        body: 'Beach, hiking, ramen — whatever.',
    },
    {
        Icon: EventRoundedIcon,
        title: 'Let us plan the trip',
        body: 'Day-by-day, saved as a draft.',
    },
];

const AiTripBuilderCard = () => {
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));
    if (!user || !isPro) return null;

    const firstName = getUserFirstName(user);

    return (
        <section className="ai-trip-builder-card">
            {/* Fanned stack of destination "preview cards" — mirrors
                the option-grid layout the user will see in the wizard.
                Concrete + travel-themed instead of the previous
                abstract-AI orb. Pure CSS, no external image
                dependencies. */}
            <div className="ai-trip-builder-card-visual" aria-hidden="true">
                <div className="ai-trip-builder-card-stack">
                    <article className="ai-trip-builder-card-preview is-back">
                        <div className="ai-trip-builder-card-preview-photo theme-mountain">
                            <span className="ai-trip-builder-card-preview-tag">
                                🇮🇸 Iceland
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>Reykjavik</strong>
                            <span>Northern lights + glaciers</span>
                        </div>
                    </article>
                    <article className="ai-trip-builder-card-preview is-mid">
                        <div className="ai-trip-builder-card-preview-photo theme-temple">
                            <span className="ai-trip-builder-card-preview-tag">
                                🇯🇵 Japan
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>Kyoto</strong>
                            <span>Sakura + temples + ramen</span>
                        </div>
                    </article>
                    <article className="ai-trip-builder-card-preview is-front">
                        <div className="ai-trip-builder-card-preview-photo theme-beach">
                            <span className="ai-trip-builder-card-preview-tag">
                                🇲🇽 Mexico
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>Tulum</strong>
                            <span>Beach + cenotes + ruins</span>
                        </div>
                    </article>
                </div>
                <span className="ai-trip-builder-card-visual-badge">
                    <AutoAwesomeRoundedIcon className="ai-trip-builder-card-visual-badge-icon" />
                    <span>4 options for you</span>
                </span>
            </div>

            <div className="ai-trip-builder-card-body">
                <span className="ai-trip-builder-card-eyebrow">
                    <AutoAwesomeRoundedIcon
                        className="ai-trip-builder-card-eyebrow-icon"
                        fontSize="small"
                    />
                    <span>Pro perk</span>
                </span>
                <h2 className="ai-trip-builder-card-title">
                    Skip the planning, {firstName}. We&rsquo;ll build the
                    trip for you.
                </h2>
                <p className="ai-trip-builder-card-lede">
                    Tell us your budget and what you want to do. We
                    pick the destination, plan every day, and save
                    a draft you can edit before confirming.
                </p>

                <ol className="ai-trip-builder-card-steps">
                    {STEPS.map(({ Icon, title, body }, idx) => (
                        <li
                            key={title}
                            className="ai-trip-builder-card-step"
                        >
                            <span className="ai-trip-builder-card-step-bullet">
                                <span className="ai-trip-builder-card-step-num">
                                    {idx + 1}
                                </span>
                                <Icon
                                    className="ai-trip-builder-card-step-icon"
                                    fontSize="small"
                                />
                            </span>
                            <span className="ai-trip-builder-card-step-text">
                                <strong>{title}</strong>
                                <span>{body}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                <Link
                    to="/discover"
                    className="ai-trip-builder-card-cta"
                >
                    <AutoAwesomeRoundedIcon className="ai-trip-builder-card-cta-sparkle" />
                    <span>Plan my trip for me</span>
                    <ArrowForwardRoundedIcon className="ai-trip-builder-card-cta-arrow" />
                </Link>

                <p className="ai-trip-builder-card-microcopy">
                    Takes ~30 seconds. The plan is yours to edit.
                </p>
            </div>
        </section>
    );
};

export default AiTripBuilderCard;
