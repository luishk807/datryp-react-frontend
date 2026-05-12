import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useUser } from 'context/UserContext';
import { MIN_SIGNUP_AGE, yearsSince } from 'utils/age';

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
                    <Link to="/" className="authgate-brand">
                        <img src="/images/logo.svg" alt="daTryp" />
                    </Link>
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
                    <Link to="/" className="authgate-back-link">
                        ← Back to home
                    </Link>
                </div>
            </aside>

            <main className="authgate-panel">
                <div className="authgate-form-wrap">
                    <Link to="/" className="authgate-brand authgate-brand-mobile">
                        <img src="/images/logo.svg" alt="daTryp" />
                    </Link>
                    <h2 className="authgate-form-title">
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="authgate-form-subtitle">
                        {mode === 'login'
                            ? 'Sign in with your email and password.'
                            : `Free to use. You must be at least ${MIN_SIGNUP_AGE} years old.`}
                    </p>

                    <form className="authgate-form" onSubmit={handleSubmit}>
                        <label className="authgate-field">
                            <span className="authgate-label">Email</span>
                            <input
                                className="authgate-input"
                                type="email"
                                value={email}
                                autoComplete="email"
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    resetError();
                                }}
                                placeholder="you@example.com"
                            />
                        </label>
                        <label className="authgate-field">
                            <span className="authgate-label">Password</span>
                            <input
                                className="authgate-input"
                                type="password"
                                value={password}
                                autoComplete={
                                    mode === 'login' ? 'current-password' : 'new-password'
                                }
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    resetError();
                                }}
                                placeholder={mode === 'login' ? '••••••••' : 'At least 8 characters'}
                            />
                        </label>

                        {mode === 'signup' && (
                            <>
                                <label className="authgate-field">
                                    <span className="authgate-label">
                                        Full name <span className="authgate-optional">(optional)</span>
                                    </span>
                                    <input
                                        className="authgate-input"
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            resetError();
                                        }}
                                    />
                                </label>
                                <label className="authgate-field">
                                    <span className="authgate-label">Date of birth</span>
                                    <input
                                        className="authgate-input"
                                        type="date"
                                        value={dob}
                                        onChange={(e) => {
                                            setDob(e.target.value);
                                            resetError();
                                        }}
                                    />
                                </label>
                                <label className="authgate-field">
                                    <span className="authgate-label">
                                        Phone <span className="authgate-optional">(optional)</span>
                                    </span>
                                    <input
                                        className="authgate-input"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            resetError();
                                        }}
                                    />
                                </label>
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
                                <button
                                    type="button"
                                    className="authgate-link"
                                    onClick={toggleMode}
                                >
                                    Create an account
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    className="authgate-link"
                                    onClick={toggleMode}
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default AuthGate;
