import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from 'components/common/Layout/SubLayout';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import './index.scss';

const FEATURE_ICONS = [
    AutoAwesomeIcon,
    MapRoundedIcon,
    GroupRoundedIcon,
    FlightTakeoffRoundedIcon,
] as const;

const FEATURE_KEYS = ['plainLanguage', 'itineraries', 'collaboration', 'forever'] as const;

const PILLAR_ICONS = [FavoriteRoundedIcon, ExploreRoundedIcon, AutoAwesomeIcon] as const;

const PILLAR_KEYS = ['loveTravel', 'forExplorers', 'smartRecs'] as const;

const About = () => {
    const { t } = useTranslation();

    return (
        <Layout title={t('about.pageTitle')}>
            <article className="about-page">
                <section className="about-hero">
                    <span className="about-hero-eyebrow">{t('about.hero.eyebrow')}</span>
                    <h1 className="about-hero-motto">{t('about.hero.motto')}</h1>
                    <p className="about-hero-lede">{t('about.hero.lede')}</p>
                    <div className="about-hero-pillars" aria-hidden="true">
                        {PILLAR_KEYS.map((key, i) => {
                            const Icon = PILLAR_ICONS[i];
                            return (
                                <span className="about-pillar" key={key}>
                                    <Icon className="about-pillar-icon" />
                                    <span>{t(`about.pillars.${key}`)}</span>
                                </span>
                            );
                        })}
                    </div>
                </section>

                <section className="about-features">
                    {FEATURE_KEYS.map((key, i) => {
                        const Icon = FEATURE_ICONS[i];
                        return (
                            <div className="about-feature" key={key}>
                                <span className="about-feature-icon-wrap">
                                    <Icon className="about-feature-icon" />
                                </span>
                                <h3 className="about-feature-title">
                                    {t(`about.features.${key}.title`)}
                                </h3>
                                <p className="about-feature-body">
                                    {t(`about.features.${key}.body`)}
                                </p>
                            </div>
                        );
                    })}
                </section>

                <section className="about-section about-story">
                    <h2>{t('about.story.heading')}</h2>
                    <p>{t('about.story.body1')}</p>
                    <p>{t('about.story.body2')}</p>
                </section>

                <section className="about-section about-next">
                    <h2>{t('about.next.heading')}</h2>
                    <p>
                        <Trans
                            i18nKey="about.next.body"
                            components={{
                                contactLink: (
                                    <Link to="/contact" className="about-inline-link" />
                                ),
                            }}
                        />
                    </p>
                </section>

                <section className="about-cta">
                    <h3 className="about-cta-title">{t('about.cta.title')}</h3>
                    <Link to="/" className="about-cta-button">
                        {t('about.cta.button')}
                    </Link>
                </section>
            </article>
        </Layout>
    );
};

export default About;
