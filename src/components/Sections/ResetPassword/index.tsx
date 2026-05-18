import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { resetPassword } from 'api/authApi';
import { setAuthToken } from 'api/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'api/queryKeys';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

/**
 * Lands the user after they click the password-reset link in their email.
 * URL shape: /reset-password?token=<random>
 *
 * Token-only access — no email, no current password needed. On success the
 * backend returns a fresh access token; we save it to authStorage so the
 * user is logged in immediately, then redirect to /account.
 */
const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // After the reset succeeds we set the auth token and redirect. Use an
    // effect so the navigation happens AFTER the render that flipped `done`
    // to true, giving the success message a brief moment on screen.
    useEffect(() => {
        if (!done) return;
        const id = window.setTimeout(() => {
            navigate('/account', { replace: true });
        }, 1500);
        return () => window.clearTimeout(id);
    }, [done, navigate]);

    // No token in URL → bounce. Bookmarked /reset-password is useless without
    // an email-issued token, so we don't render the form.
    if (!token) {
        return <Navigate to="/forgot-password" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError("Passwords don't match.");
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const tokenResp = await resetPassword(token, password);
            // Log the user in immediately — they just proved ownership of
            // the account by clicking the email link + setting a password.
            setAuthToken(tokenResp.access_token);
            // Invalidate /me so the next render reads the fresh user state.
            queryClient.invalidateQueries({ queryKey: queryKeys.me });
            setDone(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not reset password. The link may have expired.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title="Reset password">
            <article className="reset-password-page">
                {done ? (
                    <div className="reset-password-confirm">
                        <h2>Password updated</h2>
                        <p>
                            You&rsquo;re now signed in. Taking you to your
                            account…
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="reset-password-form">
                        <h2 className="reset-password-title">
                            Choose a new password
                        </h2>
                        <p className="reset-password-subtitle">
                            Pick something you&rsquo;ll remember. At least
                            8 characters.
                        </p>

                        <div className="reset-password-field">
                            <InputField
                                variant="bare"
                                label="New password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError(null);
                                }}
                                required
                            />
                        </div>
                        <div className="reset-password-field">
                            <InputField
                                variant="bare"
                                label="Confirm new password"
                                type="password"
                                value={confirm}
                                onChange={(e) => {
                                    setConfirm(e.target.value);
                                    if (error) setError(null);
                                }}
                                required
                            />
                        </div>

                        {error && (
                            <p className="reset-password-error" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="reset-password-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD}
                                nativeType="submit"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Updating…' : 'Update password'}
                            </ButtonCustom>
                        </div>

                        <p className="reset-password-back">
                            Need a new link?{' '}
                            <Link to="/forgot-password">
                                Request another email
                            </Link>
                        </p>
                    </form>
                )}
            </article>
        </Layout>
    );
};

export default ResetPassword;
