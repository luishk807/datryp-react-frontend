/**
 * Standalone sign-in splash page.
 *
 * Routed at `/login?returnTo=<encoded-path>`. Wraps the same `<AuthGate>` the
 * rest of the app uses, so the split-screen sign-in UI is identical to the
 * one shown on gated routes. After a successful login the `<AuthGate>` flips
 * to its authenticated branch and the `<Navigate>` child redirects the user
 * back to `returnTo` (defaulting to `/` if absent or invalid).
 *
 * Used by features that need to bounce un-auth'd users to login without
 * losing their place — e.g. clicking "Sign in to leave a review" on a
 * place page redirects here with `returnTo=/place?q=…&i=…`.
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthGate from 'components/AuthGate';

const Login = () => {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const raw = params.get('returnTo') ?? '/';
    // Only allow same-origin relative paths back, never an external URL.
    const returnTo = raw.startsWith('/') ? raw : '/';

    return (
        <AuthGate
            title={t('auth.login.continueTitle')}
            subtitle={t('auth.login.continueSubtitle')}
        >
            <Navigate to={returnTo} replace />
        </AuthGate>
    );
};

export default Login;
