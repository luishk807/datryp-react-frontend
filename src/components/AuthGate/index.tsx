import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import PhoneInput from 'components/common/FormFields/PhoneInput';
import DropDown from 'components/common/FormFields/DropDown';
import IconLink from 'components/common/IconLink';
import PageLoader from 'components/common/PageLoader';
import Footer from 'components/Footer';
import GoogleSignInButton from 'components/GoogleSignInButton';
import { useUser } from 'context/UserContext';
import { useGoogleSignin } from 'api/hooks/useAuth';
import { useHeroImages } from 'api/hooks/useHeroImages';
import { pickMonthlyHeroUrl } from 'utils/heroImages';
import { capture as captureEvent } from 'lib/posthog';
import {
    MAX_BIRTH_YEAR,
    MIN_BIRTH_YEAR,
    MIN_SIGNUP_AGE,
    yearsSinceBirthYear,
} from 'utils/age';
import logoUrl from 'assets/logo.svg';
import { AUTH_MODE } from 'constants';
import type { AuthMode } from 'types';

interface AuthGateProps {
    children: ReactNode;
    /** Hero text shown on the left panel. */
    title?: string;
    subtitle?: string;
}

/**
 * Split-screen auth page. Renders children straight through when the user is
 * authenticated; otherwise shows a hero/form layout with login + signup
 * toggleable inline. Backed by `useUser().login` / `useUser().signup`.
 */
const AuthGate = ({ children, title, subtitle }: AuthGateProps) => {
    const { t } = useTranslation();
    const { user, isLoading, login, signup } = useUser();
    const googleSignin = useGoogleSignin();
    const [mode, setMode] = useState<AuthMode>(AUTH_MODE.LOGIN);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [birthYear, setBirthYear] = useState<number | ''>('');
    const [confirmAge13Plus, setConfirmAge13Plus] = useState(false);
    const [phone, setPhone] = useState('');

    const yearOptions = useMemo(() => {
        const out: { id: number; name: string }[] = [];
        for (let y = MAX_BIRTH_YEAR; y >= MIN_BIRTH_YEAR; y--) {
            out.push({ id: y, name: String(y) });
        }
        return out;
    }, []);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Force a soft reload of the current URL after auth success.
    // Without this, gated routes that lazy-load (notably /single and
    // /multiple) sometimes render blank after the user transitions
    // from unauth → authed in-place — the AuthGate→Suspense→lazy
    // chunk pipeline doesn't always reconcile cleanly when the
    // upstream dispatches (Start Planning's resetTrip + basicInfo +
    // addPlace) happened before the user existed. localStorage holds
    // both TripContext and the JWT, so reload is loss-free.
    const reloadAfterAuth = () => {
        window.location.reload();
    };

    // Memoized so the GoogleSignInButton effect doesn't reinitialize the
    // Google client on every render. The mutation surfaces backend errors
    // (e.g. the 409 "email already has a password account" linking
    // refusal) into the form's error banner so the user sees one place
    // for all auth failures.
    //
    // MUST stay above the early returns below — every hook has to run on
    // every render. This `useCallback` previously lived after the
    // `isLoading` / `user` guards, so a render that bailed early called one
    // fewer hook than the form render; when auth flipped during the
    // post-login reload React saw the hook count change and threw
    // "rendered more hooks than during the previous render", crashing the
    // whole gated route (e.g. Start Planning → Google login → blank error).
    const handleGoogleCredential = useCallback(
        (credential: string) => {
            googleSignin.mutate(credential, {
                onSuccess: () => {
                    // FE can't yet distinguish a NEW Google account
                    // from a RETURNING login on the same response —
                    // backend would need to return an `is_new_user`
                    // flag for that. For now we always fire `login`
                    // here and accept some events that are really
                    // first-time signups; backend tracking (next
                    // pass) will emit a clean `signup_completed`
                    // for those.
                    captureEvent('login', { method: 'google' });
                    reloadAfterAuth();
                },
                onError: (err) =>
                    setError(
                        err instanceof Error
                            ? err.message
                            : t('auth.common.googleSignInFailed')
                    ),
            });
        },
        [googleSignin, t]
    );

    if (isLoading) return <PageLoader />;
    if (user) return <>{children}</>;

    const resetError = () => error && setError(null);

    const handleLogin = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            setError(t('auth.emailPasswordRequired'));
            return;
        }
        setSubmitting(true);
        try {
            await login(trimmed, password);
            // Fire BEFORE the reload — reloadAfterAuth() blows away the
            // JS context. method='email' distinguishes from the Google
            // path below.
            captureEvent('login', { method: 'email' });
            reloadAfterAuth();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.gate.loginFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignup = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            setError(t('auth.emailPasswordRequired'));
            return;
        }
        if (typeof birthYear !== 'number') {
            setError(t('auth.gate.selectBirthYear'));
            return;
        }
        if (yearsSinceBirthYear(birthYear) < MIN_SIGNUP_AGE) {
            setError(t('auth.gate.minAgeError', { age: MIN_SIGNUP_AGE }));
            return;
        }
        if (!confirmAge13Plus) {
            setError(t('auth.gate.confirmAgeError', { age: MIN_SIGNUP_AGE }));
            return;
        }
        setSubmitting(true);
        try {
            await signup({
                email: trimmed,
                password,
                birth_year: birthYear,
                confirm_age_13_plus: confirmAge13Plus,
                name: name.trim() || undefined,
                phone: phone.trim() || undefined,
            });
            // Fires before the reload so PostHog actually receives the
            // event — `reloadAfterAuth()` blows away the JS context.
            // Method = 'email' to differentiate from the Google path
            // (Google fires its own version below). Provider gap: we
            // can't yet distinguish a NEW Google account from a
            // RETURNING Google login on the FE — that would need a
            // backend `is_new_user` flag on the token response.
            captureEvent('signup_completed', { method: 'email' });
            reloadAfterAuth();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.common.signupFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (mode === AUTH_MODE.LOGIN) void handleLogin();
        else void handleSignup();
    };

    const toggleMode = () => {
        setMode((m) => (m === AUTH_MODE.LOGIN ? AUTH_MODE.SIGNUP : AUTH_MODE.LOGIN));
        setError(null);
    };

    // Hero photo rotates monthly through popular destinations (the same
    // backend set the homepage uses). Deterministic per month so it doesn't
    // flicker on reload, and the dead CloudFront host is filtered out.
    const { data: heroImages } = useHeroImages();
    const heroUrl = useMemo(() => pickMonthlyHeroUrl(heroImages), [heroImages]);

    const highlights = t('auth.gate.highlights', { returnObjects: true }) as string[];

    return (
        <div className="authgate-page">
            <aside
                className="authgate-hero"
                style={{ backgroundImage: `url(${heroUrl})` }}
            >
                <div className="authgate-hero-inner">
                    <IconLink
                        to="/"
                        icon={<img src={logoUrl} alt="" />}
                        ariaLabel={t('nav.homeLink')}
                        className="authgate-brand"
                    />
                    <h1 className="authgate-hero-title">
                        {title ?? t('auth.common.heroTitle')}
                    </h1>
                    <p className="authgate-hero-subtitle">
                        {subtitle ?? t('auth.gate.heroSubtitle')}
                    </p>
                    <ul className="authgate-hero-list">
                        {highlights.map((h) => (
                            <li key={h}>
                                <span aria-hidden="true">✓</span> {h}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="authgate-hero-back">
                    <IconLink
                        to="/"
                        label={t('auth.gate.backToHome')}
                        icon={<ArrowBackIcon />}
                        className="authgate-back-link"
                    />
                </div>
            </aside>

            <main className="authgate-panel">
                <div className="authgate-form-wrap">
                    <IconLink
                        to="/"
                        icon={<img src={logoUrl} alt="" />}
                        ariaLabel={t('nav.homeLink')}
                        className="authgate-brand authgate-brand-mobile"
                    />
                    <h2 className="authgate-form-title">
                        {mode === AUTH_MODE.LOGIN
                            ? t('auth.gate.welcomeBack')
                            : t('auth.gate.createYourAccount')}
                    </h2>
                    <p className="authgate-form-subtitle">
                        {mode === AUTH_MODE.LOGIN
                            ? t('auth.gate.loginSubtitle')
                            : t('auth.gate.signupSubtitle', { age: MIN_SIGNUP_AGE })}
                    </p>

                    <div className="authgate-google">
                        <GoogleSignInButton
                            text={
                                mode === AUTH_MODE.LOGIN
                                    ? 'continue_with'
                                    : 'signup_with'
                            }
                            // Omit `width` so the button auto-sizes to
                            // the host container — full panel width on
                            // phones, ~max-400 on wider cards. Google
                            // clamps to 200..400 internally.
                            onCredential={handleGoogleCredential}
                        />
                    </div>

                    <div className="authgate-divider">
                        <span>{t('auth.common.or')}</span>
                    </div>

                    <form className="authgate-form" onSubmit={handleSubmit}>
                        <div className="authgate-field">
                            <InputField
                                name="email"
                                label={t('auth.common.email')}
                                type="email"
                                defaultValue={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    resetError();
                                }}
                            />
                        </div>
                        <div className="authgate-field">
                            <InputField
                                name="password"
                                label={t('auth.common.password')}
                                type="password"
                                defaultValue={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    resetError();
                                }}
                            />
                        </div>

                        {mode === AUTH_MODE.SIGNUP && (
                            <>
                                <div className="authgate-field">
                                    <InputField
                                        name="name"
                                        label={t('auth.gate.fullNameOptional')}
                                        type="text"
                                        defaultValue={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            resetError();
                                        }}
                                    />
                                </div>
                                <div className="authgate-field">
                                    <DropDown
                                        label={t('auth.common.yearOfBirth')}
                                        options={yearOptions}
                                        valueKey="id"
                                        value={birthYear === '' ? null : birthYear}
                                        placeholder={t('auth.common.selectYear')}
                                        onChange={(opt) => {
                                            setBirthYear(
                                                opt && typeof opt.id === 'number'
                                                    ? opt.id
                                                    : ''
                                            );
                                            resetError();
                                        }}
                                    />
                                </div>
                                <div className="authgate-field">
                                    <label className="authgate-age-confirm">
                                        <input
                                            type="checkbox"
                                            checked={confirmAge13Plus}
                                            onChange={(e) => {
                                                setConfirmAge13Plus(e.target.checked);
                                                resetError();
                                            }}
                                        />
                                        <span>
                                            {t('auth.common.confirmAgeLabel', {
                                                age: MIN_SIGNUP_AGE,
                                            })}
                                        </span>
                                    </label>
                                </div>
                                <div className="authgate-field">
                                    <PhoneInput
                                        label={t('auth.gate.phoneOptional')}
                                        value={phone}
                                        onChange={(next) => {
                                            setPhone(next);
                                            resetError();
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {mode === AUTH_MODE.LOGIN && (
                            <p className="authgate-forgot">
                                <Link to="/forgot-password">
                                    {t('auth.gate.forgotPassword')}
                                </Link>
                            </p>
                        )}

                        {error && (
                            <p className="authgate-error" role="alert">
                                {error}
                            </p>
                        )}

                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            label={
                                submitting
                                    ? mode === AUTH_MODE.LOGIN
                                        ? t('auth.common.signingIn')
                                        : t('auth.common.creatingAccount')
                                    : mode === AUTH_MODE.LOGIN
                                        ? t('auth.common.continue')
                                        : t('auth.common.createAccount')
                            }
                            onClick={
                                handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>
                            }
                            disabled={submitting}
                        />
                    </form>

                    <p className="authgate-toggle">
                        {mode === AUTH_MODE.LOGIN ? (
                            <>
                                {t('auth.gate.newToDatryp')}{' '}
                                <ButtonCustom
                                    type="text"
                                    capitalizeType="none"
                                    className="authgate-link"
                                    label={t('auth.gate.createAnAccount')}
                                    onClick={toggleMode}
                                />
                            </>
                        ) : (
                            <>
                                {t('auth.common.alreadyHaveAccount')}{' '}
                                <ButtonCustom
                                    type="text"
                                    capitalizeType="none"
                                    className="authgate-link"
                                    label={t('nav.signIn')}
                                    onClick={toggleMode}
                                />
                            </>
                        )}
                    </p>
                </div>
                {/* Mobile-only footer pinned to the bottom of the form panel
                    (above the fixed bottom nav), filling the otherwise-empty
                    space below the sign-in form. Desktop hides it — the hero
                    column already carries the brand + links. */}
                <Footer showOnMobile />
            </main>
        </div>
    );
};

export default AuthGate;
