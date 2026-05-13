import { useState, type ReactNode } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import IconLink from 'components/common/IconLink';
import { useUser } from 'context/UserContext';
import { MIN_SIGNUP_AGE, yearsSince } from 'utils/age';
import logoUrl from 'assets/logo.svg';

type Mode = 'login' | 'signup';

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
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="authgate-page">
                <p className="authgate-loading">Loading…</p>
            </div>
        );
    }
    if (user) return <>{children}</>;

    const resetError = () => error && setError(null);

    const handleLogin = async () => {
        const trimmed = email.trim();
        if (!trimmed || !password) {
            setError('Email and password are required.');
            return;
        }
        setSubmitting(true);
        try {
            await login(trimmed, password);
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
        if (!dob) {
            setError('Date of birth is required.');
            return;
        }
        if (yearsSince(dob) < MIN_SIGNUP_AGE) {
            setError(
                `You must be at least ${MIN_SIGNUP_AGE} years old to create an account.`
            );
            return;
        }
        setSubmitting(true);
        try {
            await signup({
                email: trimmed,
                password,
                dob,
                name: name.trim() || undefined,
                phone: phone.trim() || undefined,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (mode === 'login') void handleLogin();
        else void handleSignup();
    };

    const toggleMode = () => {
        setMode((m) => (m === 'login' ? 'signup' : 'login'));
        setError(null);
    };

    return (
        <div className="authgate-page">
            <aside className="authgate-hero">
                <div className="authgate-hero-inner">
                    <IconLink
                        to="/"
                        icon={<img src={logoUrl} alt="" />}
                        ariaLabel="daTryp home"
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
                        ariaLabel="daTryp home"
                        className="authgate-brand authgate-brand-mobile"
                    />
                    <h2 className="authgate-form-title">
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="authgate-form-subtitle">
                        {mode === 'login'
                            ? 'Sign in with your email and password.'
                            : `Free to use. You must be at least ${MIN_SIGNUP_AGE} years old.`}
                    </p>

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

                        {mode === 'signup' && (
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
                                    <InputField
                                        name="dob"
                                        label="Date of birth"
                                        type="date"
                                        defaultValue={dob}
                                        onChange={(e) => {
                                            setDob(e.target.value);
                                            resetError();
                                        }}
                                    />
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
                                    ? mode === 'login'
                                        ? 'Signing in…'
                                        : 'Creating account…'
                                    : mode === 'login'
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
                        {mode === 'login' ? (
                            <>
                                New to daTryp?{' '}
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
