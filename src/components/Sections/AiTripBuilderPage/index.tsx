/**
 * `/plan-trip-ai` — Pro-only multi-step wizard.
 *
 * Two-phase flow (the "shopping" experience):
 *   Phase 1 — WIZARD: ask the user about budget, interests, duration,
 *             optional country. Submit calls `/me/plan-trip-ai/options`
 *             which returns 4 destination options.
 *   Phase 2 — OPTIONS: render the 4 options as image-led cards. The
 *             user picks one; we then call `/me/plan-trip-ai` with
 *             `countryHint` set to the chosen country so the full
 *             itinerary builds around it. Loader overlay during the
 *             build. Navigate to the saved trip on success.
 *
 * The legacy "Review" step is gone — its job (final confirmation)
 * is now the options grid, which is far more useful: instead of
 * confirming what they typed, the user sees actual destination
 * choices and picks one.
 *
 * Free + anonymous users get bounced to `/membership` via the
 * Pro-gate check below; route auth is handled by `Gated` in App.tsx.
 */
import {
    useEffect,
    useMemo,
    useState,
    type KeyboardEvent,
} from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useUser } from 'context/UserContext';
import { Chip } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CircularProgress from '@mui/material/CircularProgress';
import Layout from 'components/common/Layout/SubLayout';
import AiTripLoader from 'components/AiTripLoader';
import {
    generateTripOptions,
    planTripWithAi,
    type TripOption,
    type AiTripBuilderResult,
} from 'api/aiTripBuilderApi';
import { BucketListPaywallError } from 'api/bucketListApi';
import { capture as captureEvent } from 'lib/posthog';
import { TRIP_BASIC } from 'constants';
import './index.scss';

const SUGGESTED_INTERESTS = [
    'Beach',
    'Hiking',
    'Food tour',
    'Snorkeling',
    'Ski',
    'Ancient ruins',
    'Nightlife',
    'Spa',
    'Wildlife',
    'Wine country',
    'Surfing',
    'Photography',
    'Family-friendly',
    'Romantic',
];

const BUDGET_PRESETS = [
    { label: '$750', value: 750, note: 'Budget' },
    { label: '$1,500', value: 1500, note: 'Standard' },
    { label: '$3,500', value: 3500, note: 'Comfort' },
    { label: '$7,500', value: 7500, note: 'Premium' },
];

const DURATION_PRESETS = [3, 5, 7, 10, 14];

const MIN_BUDGET = 100;
const MAX_BUDGET = 50_000;

const WIZARD_STEPS = [
    { key: 'budget', label: 'Budget', Icon: PaymentsRoundedIcon },
    { key: 'interests', label: 'Interests', Icon: ExploreRoundedIcon },
    { key: 'duration', label: 'Duration', Icon: EventRoundedIcon },
] as const;

type WizardStepKey = (typeof WIZARD_STEPS)[number]['key'];

const formatCost = (n: number): string =>
    `$${Math.round(n).toLocaleString()}`;

const AiTripBuilderPage = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    const [stepIndex, setStepIndex] = useState(0);
    const [budget, setBudget] = useState<string>('1500');
    // Pre-seed the interests field with whatever the user picked during
    // onboarding. Empty means "user hasn't picked any" — we leave the
    // chip strip empty so they can pick fresh for this specific trip.
    // The chip strip is editable from here either way.
    const [interests, setInterests] = useState<string[]>(
        () => user?.interests ?? []
    );
    const [interestDraft, setInterestDraft] = useState('');
    const [countryHint, setCountryHint] = useState('');
    const [duration, setDuration] = useState<string>('');
    const [partySize, setPartySize] = useState<string>('2');
    const [error, setError] = useState<string | null>(null);
    // Options returned by the AI. Empty array = still in the wizard
    // phase; populated = options phase.
    const [options, setOptions] = useState<TripOption[] | null>(null);
    // Country code of the option the user is in the middle of
    // building. Drives the per-card "Building…" state without
    // blocking the other cards visually.
    const [buildingCode, setBuildingCode] = useState<string | null>(null);

    const wizardStepKey: WizardStepKey = WIZARD_STEPS[stepIndex].key;
    const inOptionsPhase = options !== null;

    const budgetNum = useMemo(() => {
        const n = Number(budget);
        return Number.isFinite(n) ? n : NaN;
    }, [budget]);

    const optionsMutation = useMutation({
        mutationFn: generateTripOptions,
        onSuccess: (result) => {
            setOptions(result);
            setError(null);
        },
        onError: (err: unknown) => {
            if (err instanceof BucketListPaywallError) {
                navigate('/membership');
                return;
            }
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not find options right now. Try again.',
            );
        },
    });

    const buildMutation = useMutation({
        mutationFn: planTripWithAi,
        onSuccess: (result: AiTripBuilderResult) => {
            // Coarse trip-generation signal — kind="ai" distinguishes
            // these from the manual-wizard "trip_saved" path. Only
            // non-PII fields go on the event so we can segment funnels
            // ("AI builds for couples vs solo travelers convert at...")
            // without sending the trip name or country choice content.
            captureEvent('trip_generated', {
                kind: 'ai',
                trip_type: result.tripType,
                duration_days: result.durationDays,
            });
            const route =
                result.tripType === 'multi'
                    ? TRIP_BASIC.MULTIPLE.route
                    : TRIP_BASIC.SINGLE.route;
            navigate(`${route}?id=${encodeURIComponent(result.itineraryId)}`);
        },
        onError: (err: unknown) => {
            setBuildingCode(null);
            if (err instanceof BucketListPaywallError) {
                navigate('/membership');
                return;
            }
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not build that trip right now. Try again.',
            );
        },
    });

    useEffect(() => {
        setError(null);
    }, [stepIndex]);

    if (!user || !isPro) {
        return <Navigate to="/membership" replace />;
    }

    const addInterest = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        if (interests.length >= 12) return;
        const lower = trimmed.toLowerCase();
        if (interests.some((i) => i.toLowerCase() === lower)) return;
        setInterests((prev) => [...prev, trimmed]);
        setInterestDraft('');
        setError(null);
    };

    const removeInterest = (label: string) =>
        setInterests((prev) => prev.filter((i) => i !== label));

    const handleDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addInterest(interestDraft);
        }
    };

    const validateStep = (key: WizardStepKey): string | null => {
        if (key === 'budget') {
            if (!Number.isFinite(budgetNum) || budgetNum < MIN_BUDGET) {
                return `Set a budget of at least $${MIN_BUDGET}.`;
            }
            if (budgetNum > MAX_BUDGET) {
                return `Budget caps at $${MAX_BUDGET.toLocaleString()}.`;
            }
        }
        if (key === 'interests' && interests.length === 0) {
            return 'Add at least one interest (try "beach" or "hiking").';
        }
        return null;
    };

    const goNext = () => {
        const err = validateStep(wizardStepKey);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setStepIndex((i) => Math.min(WIZARD_STEPS.length - 1, i + 1));
    };

    const goBack = () => {
        setError(null);
        setStepIndex((i) => Math.max(0, i - 1));
    };

    const goToStep = (idx: number) => {
        if (idx < stepIndex) {
            setError(null);
            setStepIndex(idx);
        }
    };

    const handleGenerateOptions = () => {
        // Validate everything that matters before kicking off the AI
        // call — saves a round-trip + bounces the user back to the
        // bad step rather than letting them stare at an empty result.
        const budgetErr = validateStep('budget');
        const interestsErr = validateStep('interests');
        if (budgetErr || interestsErr) {
            setStepIndex(budgetErr ? 0 : 1);
            setError(budgetErr ?? interestsErr);
            return;
        }
        const durationNum = duration.trim()
            ? Math.max(1, Math.min(21, Number(duration)))
            : undefined;
        const partySizeNum = Math.max(1, Math.min(20, Number(partySize) || 2));
        optionsMutation.mutate({
            budgetUsd: Math.round(budgetNum),
            interests,
            durationDays: durationNum,
            countryHint: countryHint.trim() || undefined,
            partySize: partySizeNum,
            // Fold in the user's saved traveler styles so the AI
            // personalizes even when the per-trip interests list is
            // empty. The backend treats these as low-priority bias
            // signals alongside the explicit `interests` list.
            travelerStyles: user?.travelerStyles?.length
                ? user.travelerStyles
                : undefined,
        });
    };

    const handlePickOption = (option: TripOption) => {
        if (buildMutation.isPending) return;
        setBuildingCode(option.countryCode);
        setError(null);
        const durationNum = duration.trim()
            ? Math.max(1, Math.min(21, Number(duration)))
            : undefined;
        const partySizeNum = Math.max(1, Math.min(20, Number(partySize) || 2));
        buildMutation.mutate({
            budgetUsd: Math.round(budgetNum),
            interests,
            durationDays: durationNum,
            partySize: partySizeNum,
            travelerStyles: user?.travelerStyles?.length
                ? user.travelerStyles
                : undefined,
            // Pin the destination to the chosen option's country name.
            // The existing /me/plan-trip-ai endpoint already honors
            // `country_hint` in its prompt.
            countryHint: option.countryName,
            // Forward the exact Unsplash photo the user saw on the
            // option card so the saved trip's hero matches what they
            // picked — no surprise different image once they land in
            // the editor.
            heroImageUrl: option.imageUrl ?? undefined,
        });
    };

    const handleEditInputs = () => {
        // Coming back to the wizard from the options screen — clear
        // the options state but keep all the typed inputs so the user
        // doesn't have to re-enter them.
        setOptions(null);
        setError(null);
    };

    return (
        <Layout title="Plan a trip with AI">
            <article className="ai-trip-builder-page">
                <header className="ai-trip-builder-page-hero">
                    <span className="ai-trip-builder-page-eyebrow">
                        <AutoAwesomeRoundedIcon
                            className="ai-trip-builder-page-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>Pro — AI Trip Builder</span>
                    </span>
                    <h1 className="ai-trip-builder-page-headline">
                        {inOptionsPhase
                            ? 'Pick the one that calls to you.'
                            : 'Tell us what you love. We’ll find the best matches.'}
                    </h1>
                    <p className="ai-trip-builder-page-sub">
                        {inOptionsPhase
                            ? 'Each option is a real trip we can build for you. Pick one and we’ll generate the full day-by-day plan.'
                            : 'Three quick questions. We’ll then suggest four destinations to choose from — pick one and we’ll build the full itinerary.'}
                    </p>
                </header>

                {!inOptionsPhase && (
                    <>
                        <nav
                            className="ai-trip-builder-page-stepper"
                            aria-label="Wizard steps"
                        >
                            {WIZARD_STEPS.map((step, idx) => {
                                const Icon = step.Icon;
                                const isActive = idx === stepIndex;
                                const isComplete = idx < stepIndex;
                                return (
                                    <button
                                        key={step.key}
                                        type="button"
                                        className={
                                            'ai-trip-builder-page-step' +
                                            (isActive ? ' is-active' : '') +
                                            (isComplete ? ' is-complete' : '')
                                        }
                                        aria-current={
                                            isActive ? 'step' : undefined
                                        }
                                        onClick={() => goToStep(idx)}
                                        disabled={idx > stepIndex}
                                    >
                                        <span className="ai-trip-builder-page-step-bullet">
                                            {isComplete ? (
                                                <CheckCircleRoundedIcon fontSize="inherit" />
                                            ) : (
                                                <Icon fontSize="inherit" />
                                            )}
                                        </span>
                                        <span className="ai-trip-builder-page-step-label">
                                            {step.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        <section className="ai-trip-builder-page-panel">
                            {wizardStepKey === 'budget' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2 className="ai-trip-builder-page-step-title">
                                        Roughly, how much do you want to spend?
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        Per traveler, in USD. Covers lodging,
                                        food, transit, and activities
                                        (international flights aren&rsquo;t
                                        included).
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <span className="ai-trip-builder-page-budget-symbol">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                value={budget}
                                                min={MIN_BUDGET}
                                                max={MAX_BUDGET}
                                                onChange={(e) => {
                                                    setBudget(e.target.value);
                                                    setError(null);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="ai-trip-builder-page-presets">
                                        {BUDGET_PRESETS.map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                className={
                                                    'ai-trip-builder-page-preset' +
                                                    (Number(budget) ===
                                                    preset.value
                                                        ? ' is-selected'
                                                        : '')
                                                }
                                                onClick={() => {
                                                    setBudget(
                                                        String(preset.value),
                                                    );
                                                    setError(null);
                                                }}
                                            >
                                                <span className="ai-trip-builder-page-preset-amount">
                                                    {preset.label}
                                                </span>
                                                <span className="ai-trip-builder-page-preset-note">
                                                    {preset.note}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wizardStepKey === 'interests' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2 className="ai-trip-builder-page-step-title">
                                        What do you want to do?
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        Pick a few activities or vibes — these
                                        drive what destinations show up.
                                    </p>
                                    <input
                                        type="text"
                                        className="ai-trip-builder-page-text"
                                        value={interestDraft}
                                        placeholder="Type and press Enter (e.g. fishing, beach, sunset)"
                                        onChange={(e) =>
                                            setInterestDraft(e.target.value)
                                        }
                                        onKeyDown={handleDraftKey}
                                    />
                                    {interests.length > 0 && (
                                        <div className="ai-trip-builder-page-chips">
                                            {interests.map((label) => (
                                                <Chip
                                                    key={label}
                                                    label={label}
                                                    onDelete={() =>
                                                        removeInterest(label)
                                                    }
                                                    className="ai-trip-builder-page-chip is-selected"
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <h3 className="ai-trip-builder-page-suggest-title">
                                        Or pick from these
                                    </h3>
                                    <div className="ai-trip-builder-page-suggestions">
                                        {SUGGESTED_INTERESTS.filter(
                                            (s) =>
                                                !interests.some(
                                                    (i) =>
                                                        i.toLowerCase() ===
                                                        s.toLowerCase(),
                                                ),
                                        ).map((label) => (
                                            <Chip
                                                key={label}
                                                label={`+ ${label}`}
                                                onClick={() => addInterest(label)}
                                                className="ai-trip-builder-page-chip is-suggestion"
                                            />
                                        ))}
                                    </div>
                                    <label className="ai-trip-builder-page-side-field">
                                        <span className="ai-trip-builder-page-side-label">
                                            Country or region (optional)
                                        </span>
                                        <input
                                            type="text"
                                            className="ai-trip-builder-page-text"
                                            value={countryHint}
                                            placeholder="e.g. Japan, anywhere in SE Asia, the Mediterranean"
                                            onChange={(e) =>
                                                setCountryHint(e.target.value)
                                            }
                                        />
                                    </label>
                                </div>
                            )}

                            {wizardStepKey === 'duration' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2 className="ai-trip-builder-page-step-title">
                                        How long should the trip be?
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        Optional — if you skip this we’ll
                                        pick a length that fits the budget.
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                value={duration}
                                                min={1}
                                                max={21}
                                                placeholder="7"
                                                onChange={(e) => {
                                                    setDuration(e.target.value);
                                                    setError(null);
                                                }}
                                            />
                                            <span className="ai-trip-builder-page-budget-symbol is-suffix">
                                                days
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ai-trip-builder-page-presets">
                                        {DURATION_PRESETS.map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                className={
                                                    'ai-trip-builder-page-preset' +
                                                    (Number(duration) === d
                                                        ? ' is-selected'
                                                        : '')
                                                }
                                                onClick={() => {
                                                    setDuration(String(d));
                                                    setError(null);
                                                }}
                                            >
                                                <span className="ai-trip-builder-page-preset-amount">
                                                    {d}
                                                </span>
                                                <span className="ai-trip-builder-page-preset-note">
                                                    {d === 1 ? 'day' : 'days'}
                                                </span>
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className={
                                                'ai-trip-builder-page-preset' +
                                                (!duration ? ' is-selected' : '')
                                            }
                                            onClick={() => {
                                                setDuration('');
                                                setError(null);
                                            }}
                                        >
                                            <span className="ai-trip-builder-page-preset-amount">
                                                Auto
                                            </span>
                                            <span className="ai-trip-builder-page-preset-note">
                                                Smart pick
                                            </span>
                                        </button>
                                    </div>

                                    {/* People count — sits on the same
                                        step because length + party size
                                        are both quick numerics and
                                        users naturally answer them
                                        together. */}
                                    <h2
                                        className="ai-trip-builder-page-step-title"
                                        style={{ marginTop: 28 }}
                                    >
                                        How many people are going?
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        We use this to size lodging
                                        suggestions and split the budget
                                        per-person.
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                value={partySize}
                                                min={1}
                                                max={20}
                                                placeholder="2"
                                                onChange={(e) => {
                                                    setPartySize(e.target.value);
                                                    setError(null);
                                                }}
                                            />
                                            <span className="ai-trip-builder-page-budget-symbol is-suffix">
                                                {Number(partySize) === 1
                                                    ? 'person'
                                                    : 'people'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ai-trip-builder-page-presets">
                                        {[1, 2, 4, 6].map((n) => (
                                            <button
                                                key={`party-${n}`}
                                                type="button"
                                                className={
                                                    'ai-trip-builder-page-preset' +
                                                    (Number(partySize) === n
                                                        ? ' is-selected'
                                                        : '')
                                                }
                                                onClick={() => {
                                                    setPartySize(String(n));
                                                    setError(null);
                                                }}
                                            >
                                                <span className="ai-trip-builder-page-preset-amount">
                                                    {n}
                                                </span>
                                                <span className="ai-trip-builder-page-preset-note">
                                                    {n === 1
                                                        ? 'solo'
                                                        : n === 2
                                                            ? 'couple'
                                                            : n === 4
                                                                ? 'family'
                                                                : 'group'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p
                                    className="ai-trip-builder-page-error"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            <div className="ai-trip-builder-page-actions">
                                <button
                                    type="button"
                                    className="ai-trip-builder-page-back"
                                    onClick={goBack}
                                    disabled={
                                        stepIndex === 0 ||
                                        optionsMutation.isPending
                                    }
                                >
                                    <ArrowBackRoundedIcon fontSize="small" />
                                    <span>Back</span>
                                </button>
                                {stepIndex === WIZARD_STEPS.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleGenerateOptions}
                                        disabled={optionsMutation.isPending}
                                        className="ai-trip-builder-page-submit"
                                    >
                                        <AutoAwesomeRoundedIcon
                                            fontSize="small"
                                            className="ai-trip-builder-page-submit-sparkle"
                                        />
                                        <span>
                                            {optionsMutation.isPending
                                                ? 'Finding your matches…'
                                                : 'Show me destination options'}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="ai-trip-builder-page-next"
                                        onClick={goNext}
                                    >
                                        <span>Next</span>
                                        <ArrowForwardRoundedIcon fontSize="small" />
                                    </button>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {inOptionsPhase && options && (
                    <section className="ai-trip-builder-page-options">
                        <div className="ai-trip-builder-page-options-toolbar">
                            <button
                                type="button"
                                className="ai-trip-builder-page-back"
                                onClick={handleEditInputs}
                                disabled={buildMutation.isPending}
                            >
                                <ArrowBackRoundedIcon fontSize="small" />
                                <span>Edit my inputs</span>
                            </button>
                        </div>

                        <div className="ai-trip-builder-page-options-grid">
                            {options.map((option) => {
                                const isThisBuilding =
                                    buildingCode === option.countryCode &&
                                    buildMutation.isPending;
                                const isOtherBuilding =
                                    buildMutation.isPending && !isThisBuilding;
                                return (
                                    <article
                                        key={option.countryCode}
                                        className={
                                            'ai-trip-builder-page-option' +
                                            (isThisBuilding
                                                ? ' is-building'
                                                : '') +
                                            (isOtherBuilding
                                                ? ' is-dimmed'
                                                : '')
                                        }
                                    >
                                        <div className="ai-trip-builder-page-option-media">
                                            {option.imageUrl ? (
                                                <img
                                                    src={option.imageUrl}
                                                    alt={option.countryName}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="ai-trip-builder-page-option-fallback">
                                                    <LocationOnRoundedIcon />
                                                </span>
                                            )}
                                            <span className="ai-trip-builder-page-option-country">
                                                {option.countryName}
                                            </span>
                                            {option.photographerName && (
                                                <span className="ai-trip-builder-page-option-attribution">
                                                    Photo by{' '}
                                                    {option.photographerUrl ? (
                                                        <a
                                                            href={
                                                                option.photographerUrl
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {option.photographerName}
                                                        </a>
                                                    ) : (
                                                        option.photographerName
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <div className="ai-trip-builder-page-option-body">
                                            <h3 className="ai-trip-builder-page-option-headline">
                                                {option.headline}
                                            </h3>
                                            <p className="ai-trip-builder-page-option-why">
                                                {option.whyThisFits}
                                            </p>
                                            <ul className="ai-trip-builder-page-option-highlights">
                                                {option.highlights
                                                    .slice(0, 4)
                                                    .map((h) => (
                                                        <li key={h}>{h}</li>
                                                    ))}
                                            </ul>
                                            <div className="ai-trip-builder-page-option-meta">
                                                <span>
                                                    <PaymentsRoundedIcon fontSize="inherit" />
                                                    {' '}
                                                    {formatCost(
                                                        option.estimatedCostUsd,
                                                    )}
                                                </span>
                                                <span>
                                                    <AccessTimeRoundedIcon fontSize="inherit" />
                                                    {' '}
                                                    {option.durationDays}{' '}
                                                    {option.durationDays === 1
                                                        ? 'day'
                                                        : 'days'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="ai-trip-builder-page-option-cta"
                                                onClick={() =>
                                                    handlePickOption(option)
                                                }
                                                disabled={
                                                    buildMutation.isPending
                                                }
                                            >
                                                {isThisBuilding ? (
                                                    <>
                                                        <CircularProgress
                                                            size={16}
                                                            thickness={5}
                                                            sx={{
                                                                color: 'inherit',
                                                            }}
                                                        />
                                                        <span>
                                                            Building this trip…
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AutoAwesomeRoundedIcon className="ai-trip-builder-page-option-cta-icon" />
                                                        <span>
                                                            Build this trip
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {error && (
                            <p
                                className="ai-trip-builder-page-error"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                    </section>
                )}
            </article>

            {/* Full-overlay loader for both AI phases.
                - `options` phase: fires from "Show me destination options"
                   (preference matching → destination shortlist).
                - `build` phase: fires after the user picks a destination
                   (day-by-day itinerary generation).
                Friend-testing showed the options call needed the same
                overlay as the build — a label-only button change wasn't
                obvious enough; users thought nothing was happening. */}
            <AiTripLoader open={optionsMutation.isPending} phase="options" />
            <AiTripLoader open={buildMutation.isPending} phase="build" />
        </Layout>
    );
};

export default AiTripBuilderPage;
