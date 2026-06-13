import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { requestPasswordReset } from 'api/authApi';
import { BUTTON_VARIANT, EMAIL_REGEX } from 'constants';
import './index.scss';

/**
 * "Forgot your password?" form. Sends a reset link via SendGrid → /auth/forgot-password.
 *
 * The backend deliberately returns 204 for unknown emails (no user-list
 * leakage), so this page shows the same success message regardless. The
 * user is told to check their inbox, and the next step lives in the email.
 */
const ForgotPassword = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const trimmed = email.trim();
        if (!EMAIL_REGEX.test(trimmed)) {
            setError(t('auth.forgot.invalidEmail'));
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            await requestPasswordReset(trimmed);
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.forgot.sendError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title={t('auth.forgot.pageTitle')}>
            <article className="forgot-password-page">
                {sent ? (
                    <div className="forgot-password-confirm">
                        <h2>{t('auth.forgot.confirmTitle')}</h2>
                        <p>
                            <Trans
                                i18nKey="auth.forgot.confirmBody"
                                values={{ email }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                        <p className="forgot-password-fineprint">
                            <Trans
                                i18nKey="auth.forgot.resendHint"
                                components={{
                                    resend: (
                                        <button
                                            type="button"
                                            className="forgot-password-resend"
                                            onClick={() => setSent(false)}
                                        />
                                    ),
                                }}
                            />
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="forgot-password-form">
                        <h2 className="forgot-password-title">
                            {t('auth.forgot.title')}
                        </h2>
                        <p className="forgot-password-subtitle">
                            {t('auth.forgot.subtitle')}
                        </p>
                        <div className="forgot-password-field">
                            <InputField
                                variant="bare"
                                label={t('auth.common.email')}
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder={t('auth.common.emailPlaceholder')}
                                required
                            />
                        </div>
                        {error && (
                            <p className="forgot-password-error" role="alert">
                                {error}
                            </p>
                        )}
                        <div className="forgot-password-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD}
                                nativeType="submit"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting
                                    ? t('auth.forgot.sending')
                                    : t('auth.forgot.sendLink')}
                            </ButtonCustom>
                        </div>
                        <p className="forgot-password-back">
                            {t('auth.forgot.remembered')}{' '}
                            <Link to="/">{t('auth.forgot.backToHome')}</Link>
                        </p>
                    </form>
                )}
            </article>
        </Layout>
    );
};

export default ForgotPassword;
