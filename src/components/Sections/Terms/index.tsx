import { useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'May 18, 2026';

const Terms = () => {
    const { t } = useTranslation();

    return (
        <Layout title={t('terms.title')}>
            <article className="terms-page">
                <p className="terms-last-updated">
                    {t('terms.lastUpdated', { date: LAST_UPDATED })}
                </p>

                <section className="terms-section">
                    <h2>{t('terms.sections.about.heading')}</h2>
                    <p>{t('terms.sections.about.body')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.aiSearch.heading')}</h2>
                    <p>{t('terms.sections.aiSearch.body1')}</p>
                    <p>{t('terms.sections.aiSearch.body2')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.account.heading')}</h2>
                    <p>{t('terms.sections.account.body')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.content.heading')}</h2>
                    <p>{t('terms.sections.content.body')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.availability.heading')}</h2>
                    <p>{t('terms.sections.availability.body')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.changes.heading')}</h2>
                    <p>{t('terms.sections.changes.body')}</p>
                </section>

                <section className="terms-section">
                    <h2>{t('terms.sections.contact.heading')}</h2>
                    <p>{t('terms.sections.contact.body')}</p>
                </section>
            </article>
        </Layout>
    );
};

export default Terms;
