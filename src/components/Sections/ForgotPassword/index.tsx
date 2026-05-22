import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const trimmed = email.trim();
        if (!EMAIL_REGEX.test(trimmed)) {
            setError('Enter a valid email address.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            await requestPasswordReset(trimmed);
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the reset link. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title="Forgot password">
            <article className="forgot-password-page">
                {sent ? (
                    <div className="forgot-password-confirm">
                        <h2>Check your inbox</h2>
                        <p>
                            If <strong>{email}</strong> is a registered DaTryp.com
                            account, we&rsquo;ve emailed you a link to reset
                            your password. The link expires in 60 minutes.
                        </p>
                        <p className="forgot-password-fineprint">
                            Didn&rsquo;t receive it? Check your spam folder,
                            then{' '}
                            <button
                                type="button"
                                className="forgot-password-resend"
                                onClick={() => setSent(false)}
                            >
                                try again
                            </button>
                            .
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="forgot-password-form">
                        <h2 className="forgot-password-title">
                            Reset your password
                        </h2>
                        <p className="forgot-password-subtitle">
                            Enter the email tied to your DaTryp.com account and
                            we&rsquo;ll send you a link to choose a new
                            password.
                        </p>
                        <div className="forgot-password-field">
                            <InputField
                                variant="bare"
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="you@example.com"
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
                                {submitting ? 'Sending…' : 'Send reset link'}
                            </ButtonCustom>
                        </div>
                        <p className="forgot-password-back">
                            Remembered it?{' '}
                            <Link to="/">Back to homepage</Link>
                        </p>
                    </form>
                )}
            </article>
        </Layout>
    );
};

export default ForgotPassword;
