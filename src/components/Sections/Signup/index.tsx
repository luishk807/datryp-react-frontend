/**
 * Full-page, step-by-step signup at `/signup`. Replaces the old modal-
 * based `SignUpBtn` and folds the post-login onboarding wizard into the
 * same flow — by the time the user lands on `/`, the account exists
 * AND every onboarding field they wanted to fill is set.
 *
 * Layout: split-screen on ≥900px (left photo panel rotates through the
 * month's top cities; right form panel holds the current step). Below
 * 900px the photo collapses to a short banner so the form gets the
 * full viewport.
 *
 * Flow split:
 *   Steps 1-4 (account creation): draft state held locally; final step
 *   submits to /auth/signup and receives a token.
 *   Steps 5-8 (onboarding): persist as the user advances. Each step is
 *   skippable. After Step 8 (or Skip-all), PATCH /me/preferences
 *   { mark_complete: true } and navigate to "/".
 *
 * Why no animations: scope creep. The layout already feels alive
 * thanks to the rotating photo and progress bar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconLink from 'components/common/IconLink';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useGoogleSignin, useSignup } from 'api/hooks/useAuth';
import { useUpdateMyPreferences } from 'api/hooks/useMyPreferences';
import { useMonthlyTopCities } from 'api/hooks/useMonthlyTopCities';
import { useUser } from 'context/UserContext';
import { MIN_SIGNUP_AGE, yearsSinceBirthYear } from 'utils/age';
import { AuthError } from 'api/authApi';
import logoUrl from 'assets/logo.svg';
import StepName from './StepName';
import StepEmail from './StepEmail';
import StepPassword from './StepPassword';
import StepAge from './StepAge';
import StepCountry from './StepCountry';
import StepGender from './StepGender';
import StepInterests from './StepInterests';
import StepFavorites from './StepFavorites';
import StepBucketList from './StepBucketList';
import './index.scss';

const TOTAL_STEPS = 9;

interface DraftAccount {
    name: string;
    email: string;
    password: string;
    birthYear: number | '';
    confirmAge: boolean;
}

const Signup = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const signupMutation = useSignup();
    const googleSignin = useGoogleSignin();
    const updatePrefs = useUpdateMyPreferences();
    const { data: monthly } = useMonthlyTopCities();

    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftAccount>({
        name: '',
        email: '',
        password: '',
        birthYear: '',
        confirmAge: false,
    });

    // If the user reaches /signup already signed in (e.g. came from a
    // bookmark after completing onboarding), don't dump them back into the
    // funnel — bounce them home.
    useEffect(() => {
        if (user && user.onboardingCompletedAt) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    // Hero photo rotates WEEKLY through the month's top cities (not per
    // signup step). Same visitor sees the same hero throughout a
    // session, and across sessions within the same ISO week — feels
    // editorial, not random. Index = ISO-week-of-year mod cities.length
    // so the pick is deterministic and stable across page reloads.
    const cities = monthly?.cities ?? [];
    const isoWeekOfYear = (() => {
        const d = new Date();
        // ISO-week calculation (Mon-based): copy date, shift to Thursday
        // of current week, find first Thursday of year, count weeks.
        const target = new Date(
            Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
        );
        const dayNum = (target.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(
            Date.UTC(target.getUTCFullYear(), 0, 4)
        );
        return Math.ceil(
            ((target.getTime() - firstThursday.getTime()) / 86_400_000 + 1) / 7
        );
    })();
    const heroIndex =
        cities.length > 0 ? isoWeekOfYear % cities.length : 0;
    const hero = cities[heroIndex];

    const setDraftField = <K extends keyof DraftAccount>(
        key: K,
        value: DraftAccount[K]
    ) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        if (error) setError(null);
    };

    const goNext = () => {
        setError(null);
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    };

    const goBack = () => {
        setError(null);
        setStep((s) => Math.max(s - 1, 1));
    };

    // Step 4's "Create account" submits to the backend, swaps the
    // anonymous session for a real user, and advances to step 5. Errors
    // surface inline on the age step (validation, dup email, etc.).
    const submitAccount = async () => {
        if (!draft.email.trim() || !draft.password) {
            setError('Email and password are required.');
            return;
        }
        if (typeof draft.birthYear !== 'number') {
            setError('Pick your year of birth.');
            return;
        }
        if (yearsSinceBirthYear(draft.birthYear) < MIN_SIGNUP_AGE) {
            setError(`You must be at least ${MIN_SIGNUP_AGE} to sign up.`);
            return;
        }
        if (!draft.confirmAge) {
            setError(`Please confirm you're at least ${MIN_SIGNUP_AGE}.`);
            return;
        }
        try {
            await signupMutation.mutateAsync({
                email: draft.email.trim(),
                password: draft.password,
                birth_year: draft.birthYear,
                confirm_age_13_plus: true,
                name: draft.name.trim() || undefined,
            });
            goNext();
        } catch (err) {
            setError(
                err instanceof AuthError || err instanceof Error
                    ? err.message
                    : 'Signup failed.'
            );
        }
    };

    // Last step + "Skip rest" both land here: flip the completion flag
    // and exit to home. A failure here isn't fatal — the per-step
    // PATCHes already persisted whatever the user actually entered.
    const finishOnboarding = async () => {
        try {
            await updatePrefs.mutateAsync({ markComplete: true });
        } catch {
            /* best-effort; the flag will flip on a later attempt */
        }
        navigate('/', { replace: true });
    };

    const handleGoogleCredential = (credential: string) => {
        setError(null);
        googleSignin.mutate(credential, {
            onSuccess: () => {
                // Google sign-in covers Steps 1-4 in one shot; jump
                // straight to the onboarding portion.
                setStep(5);
            },
            onError: (err) =>
                setError(
                    err instanceof Error ? err.message : 'Google sign-in failed.'
                ),
        });
    };

    const stepNode = useMemo(() => {
        switch (step) {
            case 1:
                return (
                    <StepName
                        value={draft.name}
                        onChange={(v) => setDraftField('name', v)}
                        onContinue={goNext}
                        onGoogleCredential={handleGoogleCredential}
                        googlePending={googleSignin.isPending}
                    />
                );
            case 2:
                return (
                    <StepEmail
                        value={draft.email}
                        onChange={(v) => setDraftField('email', v)}
                        onContinue={goNext}
                        onGoogleCredential={handleGoogleCredential}
                        googlePending={googleSignin.isPending}
                    />
                );
            case 3:
                return (
                    <StepPassword
                        value={draft.password}
                        onChange={(v) => setDraftField('password', v)}
                        onContinue={goNext}
                    />
                );
            case 4:
                return (
                    <StepAge
                        birthYear={draft.birthYear}
                        confirmAge={draft.confirmAge}
                        onBirthYearChange={(v) => setDraftField('birthYear', v)}
                        onConfirmChange={(v) => setDraftField('confirmAge', v)}
                        onSubmit={submitAccount}
                        submitting={signupMutation.isPending}
                    />
                );
            case 5:
                return <StepCountry onContinue={goNext} onSkip={goNext} />;
            case 6:
                return <StepGender onContinue={goNext} onSkip={goNext} />;
            case 7:
                return <StepInterests onContinue={goNext} onSkip={goNext} />;
            case 8:
                return <StepFavorites cities={cities} onContinue={goNext} onSkip={goNext} />;
            case 9:
                return (
                    <StepBucketList
                        onFinish={finishOnboarding}
                        onSkip={finishOnboarding}
                    />
                );
            default:
                return null;
        }
        // Wide deps list is intentional — step nodes read all draft fields
        // and pending flags, so they must re-render when those change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        step,
        draft,
        signupMutation.isPending,
        googleSignin.isPending,
        cities,
    ]);

    const onboardingStep = step >= 5;
    const isFirstStep = step === 1;

    return (
        <div className="signup-page">
            <aside
                className="signup-hero"
                style={
                    hero?.imageUrl
                        ? { backgroundImage: `url(${hero.imageUrl})` }
                        : undefined
                }
            >
                <div className="signup-hero-overlay" aria-hidden="true" />
                <div className="signup-hero-content">
                    <IconLink
                        to="/"
                        icon={<img src={logoUrl} alt="" />}
                        ariaLabel="DaTryp.com home"
                        className="signup-hero-brand"
                    />
                    <div className="signup-hero-copy">
                        <h2 className="signup-hero-title">
                            Plan your next adventure
                        </h2>
                        <p className="signup-hero-subtitle">
                            A few quick steps and we'll start tailoring trips to
                            you.
                        </p>
                    </div>
                    {hero && (
                        <div className="signup-hero-credit">
                            <span className="signup-hero-place">
                                {hero.name}, {hero.country}
                            </span>
                            {hero.photographerName && (
                                <span className="signup-hero-photographer">
                                    Photo:{' '}
                                    {hero.photographerUrl ? (
                                        <a
                                            href={hero.photographerUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {hero.photographerName}
                                        </a>
                                    ) : (
                                        hero.photographerName
                                    )}{' '}
                                    on Unsplash
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <main className="signup-panel">
                <div className="signup-panel-top">
                    {!isFirstStep ? (
                        <button
                            type="button"
                            className="signup-back"
                            onClick={goBack}
                            disabled={signupMutation.isPending}
                        >
                            <ArrowBackIcon fontSize="small" />
                            <span>Back</span>
                        </button>
                    ) : (
                        <Link to="/" className="signup-back">
                            <ArrowBackIcon fontSize="small" />
                            <span>Home</span>
                        </Link>
                    )}
                    <div className="signup-step-label">
                        Step {step} of {TOTAL_STEPS}
                    </div>
                </div>

                <div
                    className="signup-progress"
                    role="progressbar"
                    aria-valuenow={step}
                    aria-valuemin={1}
                    aria-valuemax={TOTAL_STEPS}
                >
                    <span
                        className="signup-progress-bar"
                        style={{
                            width: `${(step / TOTAL_STEPS) * 100}%`,
                        }}
                    />
                </div>

                <div className="signup-step-body">
                    {stepNode}
                    {error && (
                        <p className="signup-error" role="alert">
                            {error}
                        </p>
                    )}
                </div>

                {onboardingStep && step < TOTAL_STEPS && (
                    <button
                        type="button"
                        className="signup-skip-rest"
                        onClick={() => void finishOnboarding()}
                    >
                        Skip the rest
                    </button>
                )}

                <p className="signup-footer">
                    Already have an account?{' '}
                    <Link to="/" className="signup-footer-link">
                        Sign in
                    </Link>
                </p>
            </main>
        </div>
    );
};

export default Signup;
