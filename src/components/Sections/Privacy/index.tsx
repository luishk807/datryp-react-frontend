import { Trans, useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'May 30, 2026';

const Privacy = () => {
    const { t } = useTranslation();

    return (
        <Layout title={t('privacy.title')}>
            <article className="privacy-page">
                <p className="privacy-last-updated">
                    {t('privacy.lastUpdated', { date: LAST_UPDATED })}
                </p>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.short.heading')}</h2>
                    <p>{t('privacy.sections.short.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.collect.heading')}</h2>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.account"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.companions"
                            components={{ strong: <strong />, em: <em /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.travel"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.social"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.billing"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.technical"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.collect.analytics"
                            components={{ strong: <strong />, em: <em /> }}
                        />
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.use.heading')}</h2>
                    <p>{t('privacy.sections.use.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.ai.heading')}</h2>
                    <p>{t('privacy.sections.ai.body1')}</p>
                    <p>{t('privacy.sections.ai.body2')}</p>
                    <ul>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.ai.items.places"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.ai.items.holiday"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.ai.items.monthly"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.ai.items.trips"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                    </ul>
                    <p>{t('privacy.sections.ai.body3')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.processors.heading')}</h2>
                    <p>{t('privacy.sections.processors.body1')}</p>
                    <ul>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.stripe"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.sendgrid"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.ai"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.google"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.aws"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.unsplash"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                        <li>
                            <Trans
                                i18nKey="privacy.sections.processors.items.posthog"
                                components={{ strong: <strong /> }}
                            />
                        </li>
                    </ul>
                    <p>{t('privacy.sections.processors.body2')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.visibility.heading')}</h2>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.visibility.body"
                            components={{ em: <em /> }}
                        />
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.choices.heading')}</h2>
                    <p>
                        <Trans
                            i18nKey="privacy.sections.choices.body1"
                            components={{ em: <em /> }}
                        />
                    </p>
                    <p>{t('privacy.sections.choices.body2')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.cookies.heading')}</h2>
                    <p>{t('privacy.sections.cookies.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.security.heading')}</h2>
                    <p>{t('privacy.sections.security.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.children.heading')}</h2>
                    <p>{t('privacy.sections.children.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.changes.heading')}</h2>
                    <p>{t('privacy.sections.changes.body')}</p>
                </section>

                <section className="privacy-section">
                    <h2>{t('privacy.sections.contact.heading')}</h2>
                    <p>{t('privacy.sections.contact.body')}</p>
                </section>
            </article>
        </Layout>
    );
};

export default Privacy;
