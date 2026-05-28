import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { CircularProgress } from '@mui/material';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import IconLink from 'components/common/IconLink';
import GoogleSignInButton from 'components/GoogleSignInButton';
import { useUser } from 'context/UserContext';
import { useGoogleSignin } from 'api/hooks/useAuth';
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

const DEFAULT_HIGHLIGHTS = [
    'AI-picked destinations from a single sentence',
    'Plan day-by-day with friends',
    'Track flights, activities, and budget in one place',
];

/**
 * Split-screen auth page. Renders children straight through when the user is
 * authenticated; otherwise shows a hero/form layout with login + signup
 * toggleable inline. Backed by `useUser().login` / `useUser().signup`.
 */
const AuthGate = ({
    children,
    title = 'Plan your next adventure',
    subtitle = 'Sign in to save trips, invite friends and pick up where you left off.',
}: AuthGateProps) => {
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

    if (isLoading) {
        // Plain centered loader — NOT the split-grid `.authgate-page`
        // shell, which would pin the spinner inside the left grid
        // column (top-left of the viewport) instead of dead center.
        return (
            <div
                className="authgate-loading-screen"
                role="status"
                aria-live="polite"
            >
                <CircularProgress size={44} thickness={4} />
                <p className="authgate-loading-text">Loading…</p>
            </div>
        );
    }
    if (user) return <>{children}</>;

    const resetError = () => error && setError(null);

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

    const handleLogin = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            setError('Email and password are required.');
            return;
        }
        setSubmitting(true);
        try {
            await login(trimmed, password);
            reloadAfterAuth();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignup = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            setError('Email and password are required.');
            return;
        }
        if (typeof birthYear !== 'number') {
            setError('Please select your year of birth.');
            return;
        }
        if (yearsSinceBirthYear(birthYear) < MIN_SIGNUP_AGE) {
            setError(
                `You must be at least ${MIN_SIGNUP_AGE} years old to create an account.`
            );
            return;
        }
        if (!confirmAge13Plus) {
            setError(
                `Please confirm you are at least ${MIN_SIGNUP_AGE} years old.`
            );
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
            reloadAfterAuth();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed.');
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

    // Memoized so the GoogleSignInButton effect doesn't reinitialize the
    // Google client on every render. The mutation surfaces backend errors
    // (e.g. the 409 "email already has a password account" linking
    // refusal) into the form's error banner so the user sees one place
    // for all auth failures.
    const handleGoogleCredential = useCallback(
        (credential: string) => {
            googleSignin.mutate(credential, {
                onSuccess: reloadAfterAuth,
                onError: (err) =>
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Google sign-in failed.'
                    ),
            });
        },
        [googleSignin]
    );

    return (
        <div className="authgate-page">
            <aside className="authgate-hero">
                <div className="authgate-hero-inner">
                    <IconLink
                        to="/"
                        icon={<img src={logoUrl} alt="" />}
                        ariaLabel="DaTryp.com home"
                        className="authgate-brand"
                    />
                    <h1 className="authgate-hero-title">{title}</h1>
                    <p className="authgate-hero-subtitle">{subtitle}</p>
                    <ul className="authgate-hero-list">
                        {DEFAULT_HIGHLIGHTS.map((h) => (
                            <li key={h}>
                                <span aria-hidden="true">✓</span> {h}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="authgate-hero-back">
                    <IconLink
                        to="/"
                        label="Back to home"
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
                        ariaLabel="DaTryp.com home"
                        className="authgate-brand authgate-brand-mobile"
                    />
                    <h2 className="authgate-form-title">
                        {mode === AUTH_MODE.LOGIN ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="authgate-form-subtitle">
                        {mode === AUTH_MODE.LOGIN
                            ? 'Sign in with your email and password.'
                            : `Free to use. You must be at least ${MIN_SIGNUP_AGE} years old.`}
                    </p>

                    <div className="authgate-google">
                        <GoogleSignInButton
                            text={
                                mode === AUTH_MODE.LOGIN
                                    ? 'continue_with'
                                    : 'signup_with'
                            }
                            // 320 fits inside the narrowest common phone
                            // viewport (360px) once the panel's mobile
                            // padding is subtracted. Google clamps to
                            // 200..400, so this stays inside the band.
                            width={320}
                            onCredential={handleGoogleCredential}
                        />
                    </div>

                    <div className="authgate-divider">
                        <span>or</span>
                    </div>

                    <form className="authgate-form" onSubmit={handleSubmit}>
                        <div className="authgate-field">
                            <InputField
                                name="email"
                                label="Email"
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
                                label="Password"
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
                                        label="Full name (optional)"
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
                                        label="Year of birth"
                                        options={yearOptions}
                                        valueKey="id"
                                        value={birthYear === '' ? null : birthYear}
                                        placeholder="Select a year"
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
                                            I confirm I am at least{' '}
                                            {MIN_SIGNUP_AGE} years old.
                                        </span>
                                    </label>
                                </div>
                                <div className="authgate-field">
                                    <InputField
                                        name="phone"
                                        label="Phone (optional)"
                                        type="tel"
                                        defaultValue={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            resetError();
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {mode === AUTH_MODE.LOGIN && (
                            <p className="authgate-forgot">
                                <Link to="/forgot-password">
                                    Forgot your password?
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
                                        ? 'Signing in…'
                                        : 'Creating account…'
                                    : mode === AUTH_MODE.LOGIN
                                        ? 'Continue'
                                        : 'Create account'
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
                                New to DaTryp.com?{' '}
                                <ButtonCustom
                                    type="text"
                                    capitalizeType="none"
                                    className="authgate-link"
                                    label="Create an account"
                                    onClick={toggleMode}
                                />
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <ButtonCustom
                                    type="text"
                                    capitalizeType="none"
                                    className="authgate-link"
                                    label="Sign in"
                                    onClick={toggleMode}
                                />
                            </>
                        )}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default AuthGate;
