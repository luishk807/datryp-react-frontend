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
import { useTranslation } from 'react-i18next';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { useUser } from 'context/UserContext';
import { getUserFirstName } from 'utils/userName';
import './index.scss';

const STEPS = [
    { Icon: PaymentsRoundedIcon, key: 'budget' },
    { Icon: ExploreRoundedIcon, key: 'interests' },
    { Icon: EventRoundedIcon, key: 'plan' },
];

const AiTripBuilderCard = () => {
    const { t } = useTranslation();
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
                                {t('homeCards.aiTripBuilderCard.previews.iceland.tag')}
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>
                                {t('homeCards.aiTripBuilderCard.previews.iceland.city')}
                            </strong>
                            <span>
                                {t('homeCards.aiTripBuilderCard.previews.iceland.line')}
                            </span>
                        </div>
                    </article>
                    <article className="ai-trip-builder-card-preview is-mid">
                        <div className="ai-trip-builder-card-preview-photo theme-temple">
                            <span className="ai-trip-builder-card-preview-tag">
                                {t('homeCards.aiTripBuilderCard.previews.japan.tag')}
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>
                                {t('homeCards.aiTripBuilderCard.previews.japan.city')}
                            </strong>
                            <span>
                                {t('homeCards.aiTripBuilderCard.previews.japan.line')}
                            </span>
                        </div>
                    </article>
                    <article className="ai-trip-builder-card-preview is-front">
                        <div className="ai-trip-builder-card-preview-photo theme-beach">
                            <span className="ai-trip-builder-card-preview-tag">
                                {t('homeCards.aiTripBuilderCard.previews.mexico.tag')}
                            </span>
                        </div>
                        <div className="ai-trip-builder-card-preview-body">
                            <strong>
                                {t('homeCards.aiTripBuilderCard.previews.mexico.city')}
                            </strong>
                            <span>
                                {t('homeCards.aiTripBuilderCard.previews.mexico.line')}
                            </span>
                        </div>
                    </article>
                </div>
                <span className="ai-trip-builder-card-visual-badge">
                    <AutoAwesomeRoundedIcon className="ai-trip-builder-card-visual-badge-icon" />
                    <span>{t('homeCards.aiTripBuilderCard.optionsBadge')}</span>
                </span>
            </div>

            <div className="ai-trip-builder-card-body">
                <span className="ai-trip-builder-card-eyebrow">
                    <AutoAwesomeRoundedIcon
                        className="ai-trip-builder-card-eyebrow-icon"
                        fontSize="small"
                    />
                    <span>{t('homeCards.aiTripBuilderCard.eyebrow')}</span>
                </span>
                <h2 className="ai-trip-builder-card-title">
                    {t('homeCards.aiTripBuilderCard.title', {
                        name: firstName,
                    })}
                </h2>
                <p className="ai-trip-builder-card-lede">
                    {t('homeCards.aiTripBuilderCard.lede')}
                </p>

                <ol className="ai-trip-builder-card-steps">
                    {STEPS.map(({ Icon, key }, idx) => (
                        <li
                            key={key}
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
                                <strong>
                                    {t(
                                        `homeCards.aiTripBuilderCard.steps.${key}.title`,
                                    )}
                                </strong>
                                <span>
                                    {t(
                                        `homeCards.aiTripBuilderCard.steps.${key}.body`,
                                    )}
                                </span>
                            </span>
                        </li>
                    ))}
                </ol>

                <Link
                    to="/discover"
                    className="ai-trip-builder-card-cta"
                >
                    <AutoAwesomeRoundedIcon className="ai-trip-builder-card-cta-sparkle" />
                    <span>{t('heroSearch.aiCta')}</span>
                    <ArrowForwardRoundedIcon className="ai-trip-builder-card-cta-arrow" />
                </Link>

                <p className="ai-trip-builder-card-microcopy">
                    {t('homeCards.aiTripBuilderCard.microcopy')}
                </p>
            </div>
        </section>
    );
};

export default AiTripBuilderCard;
