/**
 * `/discover` — Pro-only multi-step wizard.
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
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import './index.scss';

// `value` is the actual interest sent to the AI (data — kept in English so
// the backend prompt stays stable); `key` only selects the translated chip
// label shown to the user.
const SUGGESTED_INTERESTS: { key: string; value: string }[] = [
    { key: 'beach', value: 'Beach' },
    { key: 'hiking', value: 'Hiking' },
    { key: 'foodTour', value: 'Food tour' },
    { key: 'snorkeling', value: 'Snorkeling' },
    { key: 'ski', value: 'Ski' },
    { key: 'ancientRuins', value: 'Ancient ruins' },
    { key: 'nightlife', value: 'Nightlife' },
    { key: 'spa', value: 'Spa' },
    { key: 'wildlife', value: 'Wildlife' },
    { key: 'wineCountry', value: 'Wine country' },
    { key: 'surfing', value: 'Surfing' },
    { key: 'photography', value: 'Photography' },
    { key: 'familyFriendly', value: 'Family-friendly' },
    { key: 'romantic', value: 'Romantic' },
];

const BUDGET_PRESETS = [
    { label: '$750', value: 750, tier: 'budget' },
    { label: '$1,500', value: 1500, tier: 'standard' },
    { label: '$3,500', value: 3500, tier: 'comfort' },
    { label: '$7,500', value: 7500, tier: 'premium' },
] as const;

const DURATION_PRESETS = [3, 5, 7, 10, 14];

const MIN_BUDGET = 100;
const MAX_BUDGET = 50_000;

// Quick-pick destinations under the (optional) destination input. A mix of
// regions and vibes so a user who doesn't have a specific country in mind can
// still steer the suggestions with one tap. `value` is dropped straight into
// the `countryHint` the AI already honors; "Anywhere" clears it.
const QUICK_DESTINATIONS: { key: string; value: string }[] = [
    { key: 'anywhere', value: '' },
    { key: 'europe', value: 'Europe' },
    { key: 'asia', value: 'Asia' },
    { key: 'latinAmerica', value: 'Latin America' },
    { key: 'beach', value: 'somewhere with great beaches' },
    { key: 'mountains', value: 'somewhere in the mountains' },
    { key: 'cities', value: 'a vibrant city destination' },
];

// `key` doubles as the i18n key for the stepper label (`aiTrip.steps.<key>`).
// The `duration` step holds duration + party size — two quick inputs — so its
// label reads as "Trip details" rather than implying only one question.
const WIZARD_STEPS = [
    { key: 'budget', Icon: PaymentsRoundedIcon },
    { key: 'interests', Icon: ExploreRoundedIcon },
    { key: 'destination', Icon: LocationOnRoundedIcon },
    { key: 'duration', Icon: EventRoundedIcon },
] as const;

type WizardStepKey = (typeof WIZARD_STEPS)[number]['key'];

const formatCost = (n: number): string =>
    `$${Math.round(n).toLocaleString()}`;

const AiTripBuilderPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    // The create-flow "Let us plan it for you" card forwards the country the
    // user had already pinned (if any) so the wizard opens pre-aimed at it.
    const navCountryHint =
        location.state &&
        typeof (location.state as { countryHint?: unknown }).countryHint ===
            'string'
            ? (location.state as { countryHint: string }).countryHint
            : '';
    // …and `lockDestination` means we already KNOW where they're going, so we
    // keep collecting budget/interests/dates but skip the "where to?" step and
    // the destination-options grid — submit builds that country's itinerary
    // directly and drops the user on the finished trip.
    const lockedDestination =
        (location.state as { lockDestination?: unknown } | null)
            ?.lockDestination === true && navCountryHint.length > 0;

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
    const [countryHint, setCountryHint] = useState(navCountryHint);
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

    // Drop the "destination" step entirely when the destination is locked.
    const wizardSteps = useMemo(
        () =>
            lockedDestination
                ? WIZARD_STEPS.filter((s) => s.key !== 'destination')
                : WIZARD_STEPS,
        [lockedDestination]
    );
    const wizardStepKey: WizardStepKey = wizardSteps[stepIndex].key;
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
                    : t('aiTrip.errors.optionsFailed'),
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
            // Land on the trip-detail page — its modern header + inline,
            // auto-saving Planning editor are the single source of truth for
            // viewing/tweaking a trip. (The standalone /single|/multiple
            // stepper stays for the manual create flow + "Edit Trip".)
            navigate(`/trip-detail?id=${encodeURIComponent(result.itineraryId)}`);
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
                    : t('aiTrip.errors.buildFailed'),
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
                return t('aiTrip.budget.errorMin', {
                    min: `$${MIN_BUDGET}`,
                });
            }
            if (budgetNum > MAX_BUDGET) {
                return t('aiTrip.budget.errorMax', {
                    max: `$${MAX_BUDGET.toLocaleString()}`,
                });
            }
        }
        if (key === 'interests' && interests.length === 0) {
            return t('aiTrip.interests.errorEmpty');
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
        setStepIndex((i) => Math.min(wizardSteps.length - 1, i + 1));
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

    // Locked-destination submit: we already know the country, so skip the
    // options grid and build its itinerary straight away (lands on the saved
    // trip via buildMutation's onSuccess).
    const handleBuildLockedDestination = () => {
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
        setError(null);
        buildMutation.mutate({
            budgetUsd: Math.round(budgetNum),
            interests,
            durationDays: durationNum,
            countryHint: navCountryHint,
            partySize: partySizeNum,
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
        <Layout title={t('aiTrip.title')}>
            <article className="ai-trip-builder-page">
                <header className="ai-trip-builder-page-hero">
                    <span className="ai-trip-builder-page-eyebrow">
                        <AutoAwesomeRoundedIcon
                            className="ai-trip-builder-page-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>{t('aiTrip.eyebrow')}</span>
                    </span>
                    <h1 className="ai-trip-builder-page-headline">
                        {inOptionsPhase
                            ? t('aiTrip.hero.optionsTitle')
                            : t('aiTrip.hero.title')}
                    </h1>
                    <p className="ai-trip-builder-page-sub">
                        {inOptionsPhase
                            ? t('aiTrip.hero.optionsSub')
                            : t('aiTrip.hero.sub')}
                    </p>
                </header>

                {!inOptionsPhase && (
                    <>
                        <nav
                            className="ai-trip-builder-page-stepper"
                            aria-label={t('aiTrip.stepperAria')}
                        >
                            {wizardSteps.map((step, idx) => {
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
                                            {t(`aiTrip.steps.${step.key}`)}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        <section className="ai-trip-builder-page-panel">
                            {wizardStepKey === 'budget' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2
                                        className="ai-trip-builder-page-step-title"
                                        id="aitb-budget-q"
                                    >
                                        {t('aiTrip.budget.question')}
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        {t('aiTrip.budget.hint')}
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <span className="ai-trip-builder-page-budget-symbol">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                aria-labelledby="aitb-budget-q"
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
                                                    {t(
                                                        `aiTrip.tier.${preset.tier}`,
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wizardStepKey === 'interests' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2
                                        className="ai-trip-builder-page-step-title"
                                        id="aitb-interests-q"
                                    >
                                        {t('aiTrip.interests.question')}
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        {t('aiTrip.interests.hint')}
                                    </p>
                                    <input
                                        type="text"
                                        className="ai-trip-builder-page-text"
                                        aria-labelledby="aitb-interests-q"
                                        value={interestDraft}
                                        placeholder={t(
                                            'aiTrip.interests.placeholder',
                                        )}
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
                                        {t('aiTrip.interests.orPick')}
                                    </h3>
                                    <div className="ai-trip-builder-page-suggestions">
                                        {SUGGESTED_INTERESTS.filter(
                                            (s) =>
                                                !interests.some(
                                                    (i) =>
                                                        i.toLowerCase() ===
                                                        s.value.toLowerCase(),
                                                ),
                                        ).map((s) => (
                                            <Chip
                                                key={s.key}
                                                label={`+ ${t(
                                                    `aiTrip.interestOptions.${s.key}`,
                                                    { defaultValue: s.value },
                                                )}`}
                                                onClick={() =>
                                                    addInterest(s.value)
                                                }
                                                className="ai-trip-builder-page-chip is-suggestion"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wizardStepKey === 'destination' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2
                                        className="ai-trip-builder-page-step-title"
                                        id="aitb-destination-q"
                                    >
                                        {t('aiTrip.destination.question')}
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        {t('aiTrip.destination.hint')}
                                    </p>
                                    <input
                                        type="text"
                                        className="ai-trip-builder-page-text"
                                        aria-labelledby="aitb-destination-q"
                                        value={countryHint}
                                        placeholder={t(
                                            'aiTrip.destination.placeholder',
                                        )}
                                        onChange={(e) =>
                                            setCountryHint(e.target.value)
                                        }
                                    />
                                    <h3 className="ai-trip-builder-page-suggest-title">
                                        {t('aiTrip.destination.orQuickPick')}
                                    </h3>
                                    <div className="ai-trip-builder-page-quickpicks">
                                        {QUICK_DESTINATIONS.map((q) => (
                                            <Chip
                                                key={q.key}
                                                label={t(
                                                    `aiTrip.destination.quick.${q.key}`,
                                                )}
                                                onClick={() =>
                                                    setCountryHint(q.value)
                                                }
                                                className={
                                                    'ai-trip-builder-page-chip' +
                                                    (countryHint.trim() ===
                                                    q.value
                                                        ? ' is-selected'
                                                        : ' is-suggestion')
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wizardStepKey === 'duration' && (
                                <div className="ai-trip-builder-page-step-body">
                                    <h2
                                        className="ai-trip-builder-page-step-title"
                                        id="aitb-duration-q"
                                    >
                                        {t('aiTrip.duration.question')}
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        {t('aiTrip.duration.hint')}
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                aria-labelledby="aitb-duration-q"
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
                                                {t('aiTrip.duration.daysSuffix')}
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
                                                    {t('aiTrip.duration.dayUnit', {
                                                        count: d,
                                                    })}
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
                                                {t('aiTrip.duration.auto')}
                                            </span>
                                            <span className="ai-trip-builder-page-preset-note">
                                                {t('aiTrip.duration.smartPick')}
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
                                        id="aitb-party-q"
                                    >
                                        {t('aiTrip.party.question')}
                                    </h2>
                                    <p className="ai-trip-builder-page-step-hint">
                                        {t('aiTrip.party.hint')}
                                    </p>
                                    <div className="ai-trip-builder-page-budget-row">
                                        <div className="ai-trip-builder-page-budget-input">
                                            <input
                                                type="number"
                                                className="ai-trip-builder-page-budget-field"
                                                aria-labelledby="aitb-party-q"
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
                                                {t('aiTrip.party.peopleSuffix', {
                                                    count: Number(partySize) || 0,
                                                })}
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
                                                    {t(
                                                        `aiTrip.party.size.${
                                                            n === 1
                                                                ? 'solo'
                                                                : n === 2
                                                                    ? 'couple'
                                                                    : n === 4
                                                                        ? 'family'
                                                                        : 'group'
                                                        }`,
                                                    )}
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
                                    <span>{t('aiTrip.back')}</span>
                                </button>
                                {stepIndex === wizardSteps.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={
                                            lockedDestination
                                                ? handleBuildLockedDestination
                                                : handleGenerateOptions
                                        }
                                        disabled={
                                            optionsMutation.isPending ||
                                            buildMutation.isPending
                                        }
                                        className="ai-trip-builder-page-submit"
                                    >
                                        <AutoAwesomeRoundedIcon
                                            fontSize="small"
                                            className="ai-trip-builder-page-submit-sparkle"
                                        />
                                        <span>
                                            {lockedDestination
                                                ? buildMutation.isPending
                                                    ? t('aiTrip.options.building')
                                                    : t('aiTrip.submit.build')
                                                : optionsMutation.isPending
                                                    ? t('aiTrip.submit.pending')
                                                    : t('aiTrip.submit.idle')}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="ai-trip-builder-page-next"
                                        onClick={goNext}
                                    >
                                        <span>{t('aiTrip.next')}</span>
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
                                <span>{t('aiTrip.options.editInputs')}</span>
                            </button>
                        </div>

                        <div className="ai-trip-builder-page-options-grid">
                            {options.map((option, idx) => {
                                const isThisBuilding =
                                    buildingCode === option.countryCode &&
                                    buildMutation.isPending;
                                const isOtherBuilding =
                                    buildMutation.isPending && !isThisBuilding;
                                // The first option is the top-ranked match —
                                // flag it in our own voice (no "AI" / no number)
                                // so the user gets a gentle steer toward it.
                                const isTopPick = idx === 0;
                                // "Why this matches you" — derived client-side
                                // so it needs no backend change: surface the
                                // user's own interests that show up in this
                                // option's copy, plus a budget-fit tick. Gives
                                // each card a concrete, trust-building rationale
                                // beyond the single `whyThisFits` sentence.
                                const optionText = `${option.headline} ${
                                    option.whyThisFits
                                } ${option.highlights.join(' ')}`.toLowerCase();
                                const matchReasons = [
                                    ...interests.filter((i) =>
                                        optionText.includes(i.toLowerCase()),
                                    ),
                                    ...(Number.isFinite(budgetNum) &&
                                    option.estimatedCostUsd <= budgetNum
                                        ? [
                                              t('aiTrip.options.fitsBudget', {
                                                  amount: formatCost(budgetNum),
                                              }),
                                          ]
                                        : []),
                                ].slice(0, 5);
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
                                                    {t('aiTrip.options.photoBy')}{' '}
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
                                            {isTopPick && (
                                                <span className="ai-trip-builder-page-option-bestfit">
                                                    <AutoAwesomeRoundedIcon fontSize="inherit" />
                                                    {t('aiTrip.options.bestFit')}
                                                </span>
                                            )}
                                            <h3 className="ai-trip-builder-page-option-headline">
                                                {option.headline}
                                            </h3>
                                            <p className="ai-trip-builder-page-option-why">
                                                {option.whyThisFits}
                                            </p>
                                            {matchReasons.length > 0 && (
                                                <div className="ai-trip-builder-page-option-match">
                                                    <span className="ai-trip-builder-page-option-match-title">
                                                        {t(
                                                            'aiTrip.options.whyMatches',
                                                        )}
                                                    </span>
                                                    <ul className="ai-trip-builder-page-option-match-list">
                                                        {matchReasons.map((r) => (
                                                            <li key={r}>
                                                                <CheckCircleRoundedIcon fontSize="inherit" />
                                                                <span>{r}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
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
                                                    {t('aiTrip.options.dayCount', {
                                                        count: option.durationDays,
                                                    })}
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
                                                            {t(
                                                                'aiTrip.options.building',
                                                            )}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AutoAwesomeRoundedIcon className="ai-trip-builder-page-option-cta-icon" />
                                                        <span>
                                                            {t(
                                                                'aiTrip.options.build',
                                                            )}
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Let the undecided hand the choice back to us — picks
                            the top-ranked option (first card) and builds it. */}
                        {options.length > 0 && (
                            <div className="ai-trip-builder-page-surprise">
                                <button
                                    type="button"
                                    className="ai-trip-builder-page-surprise-btn"
                                    onClick={() => handlePickOption(options[0])}
                                    disabled={buildMutation.isPending}
                                >
                                    🎲 {t('aiTrip.options.surprise')}
                                </button>
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
            <AiTripLoader
                open={optionsMutation.isPending}
                phase="options"
                title={t('aiTrip.loader.options.title')}
                subtitle={t('aiTrip.loader.options.subtitle')}
            />
            <AiTripLoader
                open={buildMutation.isPending}
                phase="build"
                title={t('aiTrip.loader.build.title')}
                subtitle={t('aiTrip.loader.build.subtitle')}
            />
        </Layout>
    );
};

export default AiTripBuilderPage;
