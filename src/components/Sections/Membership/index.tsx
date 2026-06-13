import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Trans, useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import PlanCards from 'components/PlanCards';
import './index.scss';

/**
 * Plans + pricing page. Pure marketing: comparison table, value-prop
 * bullets, FAQ. The PlanCards component handles the actual "Start trial"
 * CTA — same flow as the paywall modal, just in a fuller context.
 *
 * The route is intentionally NOT gated. Logged-out visitors should be able
 * to read the pricing before signing up; the PlanCards CTA prompts login
 * when needed (Stripe Checkout requires an authenticated user via the API).
 *
 * All copy lives in src/i18n/locales/* under `membership.*` — this file only
 * declares the structure (which rows exist, which cells are icons vs. text).
 */

interface FeatureRowDef {
    /** Row id under `membership.rows.*` in the locale files (label/free/pro/note). */
    key: string;
    /** Booleans render the check/cross icon; 'text' renders the translated cell value. */
    free: boolean | 'text';
    pro: boolean | 'text';
    /** Row has a one-line clarification under the label (`membership.rows.<key>.note`). */
    hasNote?: boolean;
}

const FEATURE_ROWS: FeatureRowDef[] = [
    { key: 'savedTrips', free: 'text', pro: 'text', hasNote: true },
    { key: 'searchDepth', free: 'text', pro: 'text' },
    { key: 'searchQuality', free: 'text', pro: 'text', hasNote: true },
    { key: 'dailySearchLimit', free: 'text', pro: 'text' },
    { key: 'bucketList', free: 'text', pro: 'text', hasNote: true },
    { key: 'bucketToTrip', free: false, pro: true, hasNote: true },
    { key: 'planForYou', free: false, pro: true, hasNote: true },
    // Bundles the personalized homepage surfaces (Places you might love +
    // your monthly personal top pick) into one comparison row. Free gets the
    // baseline; Pro adds the monthly personalized pick on top.
    { key: 'personalizedPicks', free: 'text', pro: 'text', hasNote: true },
    { key: 'collaboration', free: true, pro: true },
    // Bundles country / city / place detail-page features into one row.
    // Free gets the standard detail page plus cultural-shock heads-up; Pro
    // adds the year-current popularity meter and experience-highlight strip.
    { key: 'detailPages', free: 'text', pro: 'text', hasNote: true },
    { key: 'ratings', free: false, pro: true, hasNote: true },
    { key: 'bestThisMonth', free: false, pro: true, hasNote: true },
    { key: 'savedVisited', free: true, pro: true },
    { key: 'mapper', free: false, pro: true, hasNote: true },
    { key: 'freeTrial', free: 'text', pro: 'text' },
];

/** Why-upgrade bullets: bold lead + body under `membership.why.<key>`. */
const WHY_KEYS = [
    'unlimitedTrips',
    'advancedSearch',
    'noDailyLimits',
    'bucketList',
    'detailPages',
    'picks',
    'mapper',
    'trial',
] as const;

const FAQ_KEYS = ['cancel', 'downgrade', 'refunds', 'data', 'switch'] as const;

const Membership = () => {
    const { t } = useTranslation();

    const renderCell = (
        rowKey: string,
        column: 'free' | 'pro',
        value: boolean | 'text',
    ) => {
        if (value === true) {
            return (
                <CheckRoundedIcon
                    className="membership-icon membership-icon--check"
                    aria-label={t('membership.table.included')}
                />
            );
        }
        if (value === false) {
            return (
                <CloseRoundedIcon
                    className="membership-icon membership-icon--cross"
                    aria-label={t('membership.table.notIncluded')}
                />
            );
        }
        return <span>{t(`membership.rows.${rowKey}.${column}`)}</span>;
    };

    return (
        <Layout title={t('membership.pageTitle')}>
            <article className="membership-page">
                <header className="membership-hero">
                    <h1 className="membership-hero-title">
                        {t('membership.hero.title')}
                    </h1>
                    <p className="membership-hero-subtitle">
                        {t('membership.hero.subtitle')}
                    </p>
                </header>

                <section className="membership-plans">
                    <PlanCards />
                </section>

                <section className="membership-table-section">
                    <h2 className="membership-section-title">
                        {t('membership.table.title')}
                    </h2>
                    <div className="membership-table-scroll">
                        <table className="membership-table">
                            <thead>
                                <tr>
                                    <th className="membership-table-feature">
                                        {t('membership.table.feature')}
                                    </th>
                                    <th>{t('membership.table.free')}</th>
                                    <th>
                                        {t('membership.table.pro')}
                                        <span className="membership-table-pro-tag">
                                            {t('membership.table.proTag')}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {FEATURE_ROWS.map((row) => (
                                    <tr key={row.key}>
                                        <td className="membership-table-feature">
                                            <div className="membership-table-feature-label">
                                                {t(`membership.rows.${row.key}.label`)}
                                            </div>
                                            {row.hasNote && (
                                                <div className="membership-table-feature-note">
                                                    {t(`membership.rows.${row.key}.note`)}
                                                </div>
                                            )}
                                        </td>
                                        <td>{renderCell(row.key, 'free', row.free)}</td>
                                        <td className="membership-table-pro-cell">
                                            {renderCell(row.key, 'pro', row.pro)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="membership-why">
                    <h2 className="membership-section-title">
                        {t('membership.why.title')}
                    </h2>
                    <ul className="membership-why-list">
                        {WHY_KEYS.map((key) => (
                            <li key={key}>
                                <strong>{t(`membership.why.${key}.lead`)}</strong>{' '}
                                <Trans
                                    i18nKey={`membership.why.${key}.body`}
                                    components={{ em: <em /> }}
                                />
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="membership-faq">
                    <h2 className="membership-section-title">
                        {t('membership.faq.title')}
                    </h2>
                    {FAQ_KEYS.map((key) => (
                        <div className="membership-faq-item" key={key}>
                            <h3>{t(`membership.faq.${key}.q`)}</h3>
                            <p>
                                <Trans
                                    i18nKey={`membership.faq.${key}.a`}
                                    components={{ em: <em /> }}
                                />
                            </p>
                        </div>
                    ))}
                </section>

                <section className="membership-plans membership-plans--bottom">
                    <h2 className="membership-section-title">
                        {t('membership.readyTitle')}
                    </h2>
                    <PlanCards />
                </section>
            </article>
        </Layout>
    );
};

export default Membership;
