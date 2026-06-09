/**
 * Standalone bucket-list section page (`/bucket-list`). Same data as the
 * onboarding step (Step 4 — Bucket list) but as a long-running surface
 * the user can return to.
 *
 * Each row has a "Create trip" button that POSTs to
 * `/me/bucket-list/{id}/itinerary`. The backend runs OpenAI to plan a
 * full itinerary (single OR multi destination, days + activities, budget,
 * caller as organizer + participant), saves it as a Planning trip, and
 * returns the new trip id. The UI shows an AI loading overlay while the
 * call runs, then navigates the user straight into the trip's edit page
 * so they can review and tweak before confirming.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { IconButton } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import AiTripLoader from 'components/AiTripLoader';
import PaywallModal from 'components/PaywallModal';
import type { ModalButtonHandle } from 'components/ModalButton';
import {
    BucketListBlockedError,
    BucketListPaywallError,
    type BucketListPaywallKind,
} from 'api/bucketListApi';
import {
    useAddBucketListItem,
    useBucketList,
    useDeleteBucketListItem,
    useEnrichExistingBucketList,
    useGenerateTripFromBucket,
} from 'api/hooks/useBucketList';
import { useUser } from 'context/UserContext';
import { formatDate } from 'utils/date';
import { getUserFirstName } from 'utils/userName';
import { enrichBucketGoal } from 'utils/bucketGoalEnrich';
import Pagination from 'components/common/Pagination';
import { LIST_PAGE_SIZE } from 'constants';
import './index.scss';

// Mirrors the backend `FREE_TIER_BUCKET_LIST_LIMIT`. Kept in sync manually
// so the "X / 10 used" counter can render before the user hits the cap; if
// the backend changes the limit we'll surface it via the 402 anyway.
const FREE_TIER_BUCKET_LIST_LIMIT = 10;

interface PaywallState {
    kind: BucketListPaywallKind;
    currentCount: number;
    cap: number;
}

const paywallCopy = (
    state: PaywallState
): { title: string; headline: React.ReactNode; body: string } => {
    if (state.kind === 'bucket_list_cap') {
        return {
            title: 'Bucket list full',
            headline: (
                <>
                    You&rsquo;ve added{' '}
                    <strong>{state.currentCount}</strong> of{' '}
                    <strong>{state.cap}</strong> bucket-list entries on the
                    free plan.
                </>
            ),
            body: 'DaTryp.com Pro removes the limit so you can keep dreaming. Pro also unlocks "Create trip" — turn any bucket-list goal into a real itinerary.',
        };
    }
    return {
        title: 'Pro feature',
        headline: <>Turning a bucket-list goal into a real trip is a Pro feature.</>,
        body: 'DaTryp.com Pro builds an itinerary from any of your bucket-list entries — picking a country, planning days, suggesting activities — saved as a draft trip ready for you to tweak.',
    };
};

const BucketList = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useUser();
    const { data: items = [], isLoading } = useBucketList();
    const add = useAddBucketListItem();
    const remove = useDeleteBucketListItem();
    const generate = useGenerateTripFromBucket();
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Goal text of the row currently being AI-built. Drives the loader
    // headline so the user sees what we're working on.
    const [generatingText, setGeneratingText] = useState<string | null>(null);
    const paywallRef = useRef<ModalButtonHandle>(null);
    const [paywall, setPaywall] = useState<PaywallState | null>(null);
    // The add-goal <form>; the two-path entry header's "have a dream"
    // tile scrolls here and focuses the input rather than navigating
    // away (the user is already on the bucket-list page).
    const addFormRef = useRef<HTMLFormElement>(null);
    // Brief highlight pulse on the add-goal input when the "Already
    // dreaming?" entry tile is clicked. Without it the tile feels dead on
    // desktop, where the input is already on-screen so scroll + focus
    // produce no visible change.
    const [addPulse, setAddPulse] = useState(false);
    const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const focusAddInput = () => {
        const form = addFormRef.current;
        if (!form) return;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.querySelector<HTMLInputElement>('input')?.focus();
        if (pulseTimer.current) clearTimeout(pulseTimer.current);
        setAddPulse(true);
        pulseTimer.current = setTimeout(() => setAddPulse(false), 900);
    };

    // Slice the list into LIST_PAGE_SIZE chunks. Shared with the
    // other list pages (Notifications, Trips, Friends, Recent
    // Searches) so the UX is consistent.
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE));
    const pagedItems = useMemo(() => {
        const start = (page - 1) * LIST_PAGE_SIZE;
        return items.slice(start, start + LIST_PAGE_SIZE);
    }, [items, page]);

    const isPro = Boolean(user && (user.isPaidMember || isAdmin));
    const atCap = !isPro && items.length >= FREE_TIER_BUCKET_LIST_LIMIT;

    // One-time enrichment backfill for Pro users: when the list still holds
    // goals that were never enriched (added while free, or before the
    // feature shipped), kick off the backfill pass and show a loader so the
    // user knows their existing cards are being polished. Guarded by a ref
    // so it fires once per mount; the server skips already-attempted rows,
    // so even if it re-ran it would be a no-op (and cost nothing).
    const { mutate: runBackfill, isPending: isBackfilling } =
        useEnrichExistingBucketList();
    const backfillTriedRef = useRef(false);
    const needsBackfill =
        isPro && items.some((i) => !i.enrichmentAttempted);

    useEffect(() => {
        if (needsBackfill && !backfillTriedRef.current) {
            backfillTriedRef.current = true;
            runBackfill();
        }
    }, [needsBackfill, runBackfill]);

    const openPaywall = (state: PaywallState) => {
        setPaywall(state);
        paywallRef.current?.openModel();
    };

    const handleAdd = async () => {
        const text = draft.trim();
        if (!text) return;
        setError(null);
        try {
            await add.mutateAsync(text);
            setDraft('');
        } catch (err) {
            if (err instanceof BucketListPaywallError) {
                openPaywall({
                    kind: err.kind,
                    currentCount:
                        err.currentCount ?? items.length,
                    cap: err.cap ?? FREE_TIER_BUCKET_LIST_LIMIT,
                });
                return;
            }
            if (err instanceof BucketListBlockedError) {
                setError(err.message);
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Could not add that one — try again.'
                );
            }
        }
    };

    // Two-step inline build flow: clicking "AI-build trip" on a card
    // expands that card to reveal a small wizard — step 1 asks party
    // size, step 2 asks trip length (or "let us decide"). The expand
    // happens INSIDE the card rather than opening a modal dialog
    // because the user said the popup felt heavy for a single
    // question per screen. Inline keeps the bucket goal visible while
    // they answer.
    const [wizardItemId, setWizardItemId] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [wizardParty, setWizardParty] = useState<string>('2');
    const [wizardDuration, setWizardDuration] = useState<string>('');

    const openBuildWizard = (id: string) => {
        setError(null);
        if (!isPro) {
            openPaywall({
                kind: 'bucket_list_generate',
                currentCount: items.length,
                cap: FREE_TIER_BUCKET_LIST_LIMIT,
            });
            return;
        }
        setWizardParty('2');
        setWizardDuration('');
        setWizardStep(1);
        setWizardItemId(id);
    };

    const closeBuildWizard = () => {
        setWizardItemId(null);
        setWizardStep(1);
    };

    const handleCreateTrip = async (id: string, text: string) => {
        setError(null);
        closeBuildWizard();
        const partySizeNum = Math.max(
            1,
            Math.min(20, Number(wizardParty) || 2)
        );
        const durationNum = wizardDuration.trim()
            ? Math.max(1, Math.min(21, Number(wizardDuration)))
            : undefined;
        setGeneratingText(text);
        try {
            const result = await generate.mutateAsync({
                id,
                input: {
                    partySize: partySizeNum,
                    durationDays: durationNum,
                    // Fold in the user's saved traveler styles so the
                    // AI personalizes the trip mix even when the bucket
                    // entry itself only carries a short headline.
                    travelerStyles: user?.travelerStyles?.length
                        ? user.travelerStyles
                        : undefined,
                },
            });
            // The trip is already saved in Planning — land on the trip-detail
            // page, whose modern header + inline, auto-saving editor let the
            // user review, tweak, and confirm without a separate stepper.
            navigate(
                `/trip-detail?id=${encodeURIComponent(result.itineraryId)}`
            );
        } catch (err) {
            if (err instanceof BucketListPaywallError) {
                // Belt + suspenders — if a stale user-context says we're
                // Pro but the server disagrees, still respect the 402.
                openPaywall({
                    kind: err.kind,
                    currentCount:
                        err.currentCount ?? items.length,
                    cap: err.cap ?? FREE_TIER_BUCKET_LIST_LIMIT,
                });
                return;
            }
            // Moderation gate — backend has structured copy meant for the
            // user ("This goal includes content we can't help with…"). Show
            // it verbatim.
            if (err instanceof BucketListBlockedError) {
                setError(err.message);
                return;
            }
            // Everything else (422, 500, network drops, etc.) — surface a
            // single friendly fallback. The raw `err.message` reads like
            // a stack trace ("generate trip from bucket-list 422
            // Unprocessable Entity") and means nothing to a traveler.
            // Log the dev-facing detail for debugging.
            // eslint-disable-next-line no-console
            console.error('[bucket-list] generate trip failed:', err);
            setError(
                "Sorry, we couldn't build your trip right now. Please try again in a moment."
            );
        } finally {
            setGeneratingText(null);
        }
    };

    return (
        <Layout title="Bucket list">
            <div className="bucket-page">
                <header className="bucket-page-header">
                    <h1 className="bucket-page-title">
                        {getUserFirstName(user)}&rsquo;s travel goals
                    </h1>
                    <p className="bucket-page-subtitle">
                        Your bucket list is the wishlist of things you want to
                        experience while traveling — a concert, a stadium, a
                        hike, a meal, a festival. Keep them here, and when
                        you&rsquo;re ready, turn any goal into a full trip in
                        one tap.
                    </p>
                    {!isPro && (
                        <p
                            className={
                                atCap
                                    ? 'bucket-cap-meter is-full'
                                    : 'bucket-cap-meter'
                            }
                        >
                            {atCap ? (
                                <>
                                    <LockRoundedIcon
                                        fontSize="inherit"
                                        className="bucket-cap-icon"
                                    />
                                    You&rsquo;ve filled all{' '}
                                    {FREE_TIER_BUCKET_LIST_LIMIT} free slots —{' '}
                                    <button
                                        type="button"
                                        className="bucket-cap-upgrade"
                                        onClick={() =>
                                            openPaywall({
                                                kind: 'bucket_list_cap',
                                                currentCount: items.length,
                                                cap: FREE_TIER_BUCKET_LIST_LIMIT,
                                            })
                                        }
                                    >
                                        upgrade to Pro
                                    </button>{' '}
                                    for unlimited entries.
                                </>
                            ) : (
                                <>
                                    <strong>{items.length}</strong> of{' '}
                                    <strong>
                                        {FREE_TIER_BUCKET_LIST_LIMIT}
                                    </strong>{' '}
                                    free slots used.
                                </>
                            )}
                        </p>
                    )}
                </header>

                <section
                    className="bucket-paths"
                    aria-label="Two ways to start a trip"
                >
                    <button
                        type="button"
                        className="bucket-path bucket-path--matcher"
                        onClick={() => navigate('/discover')}
                    >
                        <span className="bucket-path-icon">
                            <TravelExploreRoundedIcon />
                        </span>
                        <span className="bucket-path-body">
                            <span className="bucket-path-eyebrow">
                                Not sure where to go?
                            </span>
                            <span className="bucket-path-title">
                                Get AI destination ideas
                            </span>
                        </span>
                        <ArrowForwardRoundedIcon className="bucket-path-arrow" />
                    </button>
                    <button
                        type="button"
                        className="bucket-path bucket-path--bucket"
                        onClick={focusAddInput}
                    >
                        <span className="bucket-path-icon">
                            <TrackChangesRoundedIcon />
                        </span>
                        <span className="bucket-path-body">
                            <span className="bucket-path-eyebrow">
                                Already have a dream in mind?
                            </span>
                            <span className="bucket-path-title">
                                Add it to your bucket list
                            </span>
                        </span>
                        <ArrowForwardRoundedIcon className="bucket-path-arrow" />
                    </button>
                </section>

                <section
                    className="bucket-howto"
                    aria-label="How the bucket list works"
                >
                    <div className="bucket-howto-step">
                        <span className="bucket-howto-icon">
                            <EditNoteRoundedIcon />
                        </span>
                        <div className="bucket-howto-content">
                            <h3>1. Capture the dream</h3>
                            <p>
                                Jot down anything you want to experience — a
                                stadium match, a hike, a tasting menu, a
                                festival. Phrase it like you&rsquo;d tell a
                                friend.
                            </p>
                        </div>
                    </div>
                    <div className="bucket-howto-step">
                        <span className="bucket-howto-icon is-ai">
                            <AutoAwesomeRoundedIcon />
                        </span>
                        <div className="bucket-howto-content">
                            <h3>2. We build the trip</h3>
                            <p>
                                Tap <strong>Build trip</strong> on any
                                goal. We pick the destination, plan days
                                and activities around it, and save it as
                                a draft Planning trip.
                            </p>
                        </div>
                    </div>
                    <div className="bucket-howto-step">
                        <span className="bucket-howto-icon">
                            <FlightTakeoffRoundedIcon />
                        </span>
                        <div className="bucket-howto-content">
                            <h3>3. Tweak &amp; go</h3>
                            <p>
                                Review the draft, swap activities, invite
                                friends, then confirm when you&rsquo;re ready.
                                Nothing is locked in until you say so.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Wrap in <form> so Enter inside the input submits naturally
                    via the browser's default form behavior — no manual
                    keydown plumbing through InputField. */}
                <form
                    ref={addFormRef}
                    className={classNames('bucket-add', {
                        'is-pulsing': addPulse,
                    })}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleAdd();
                    }}
                >
                    <InputField
                        name="bucket-list-draft"
                        variant="bare"
                        label={null}
                        required={false}
                        type="text"
                        value={draft}
                        placeholder="e.g. Watch an FC Barcelona game at Camp Nou"
                        onChange={(e) => {
                            setDraft(e.target.value);
                            if (error) setError(null);
                        }}
                    />
                    <ButtonCustom
                        type="standard"
                        nativeType="submit"
                        capitalizeType="none"
                        className="bucket-add-btn"
                        label={add.isPending ? 'Saving…' : 'Add'}
                        disabled={add.isPending || !draft.trim()}
                    />
                </form>

                {error && (
                    <p className="bucket-error" role="alert">
                        {error}
                    </p>
                )}

                {isLoading && items.length === 0 && (
                    <p className="bucket-loading">Loading your list…</p>
                )}

                {!isLoading && items.length === 0 && (
                    <div className="bucket-empty">
                        <AutoAwesomeRoundedIcon className="bucket-empty-icon" />
                        <p>Your bucket list is empty.</p>
                        <p className="bucket-empty-hint">
                            Add a goal above — phrase it like you would tell a
                            friend ("watch the Barcelona game", "see the Northern
                            Lights").
                        </p>
                    </div>
                )}

                <AiTripLoader
                    open={generate.isPending}
                    title={
                        generatingText
                            ? `Building "${generatingText}"…`
                            : undefined
                    }
                />

                {/* One-time "polishing" loader for the Pro enrichment
                    backfill of existing goals. Distinct `enrich` phase so
                    the rotating messages talk about the goals, not trip
                    planning. */}
                <AiTripLoader open={isBackfilling} phase="enrich" />

                <PaywallModal
                    ref={paywallRef}
                    currentCount={paywall?.currentCount ?? items.length}
                    cap={paywall?.cap ?? FREE_TIER_BUCKET_LIST_LIMIT}
                    title={paywall ? paywallCopy(paywall).title : undefined}
                    headline={
                        paywall ? paywallCopy(paywall).headline : undefined
                    }
                    body={paywall ? paywallCopy(paywall).body : undefined}
                    onDismiss={() => setPaywall(null)}
                />

                {items.length > 0 && (
                    <ul className="bucket-list">
                        {pagedItems.map((item) => {
                            const isWizardOpen = wizardItemId === item.id;
                            // Pro rows arrive AI-enriched (titled card). Free
                            // rows fall back to the lightweight client-side
                            // heuristic — emoji + category tags, no rewrite.
                            const isEnriched = Boolean(item.title);
                            const heuristic = isEnriched
                                ? null
                                : enrichBucketGoal(item.text);
                            const emoji =
                                item.emoji || heuristic?.emoji || '✈️';
                            const headline = item.title || item.text;
                            const tags =
                                item.tags && item.tags.length
                                    ? item.tags
                                    : heuristic?.tags ?? [];
                            return (
                                <li
                                    key={item.id}
                                    className={classNames('bucket-card', {
                                        'is-wizard-open': isWizardOpen,
                                    })}
                                >
                                    <div className="bucket-card-row">
                                        <span
                                            className="bucket-card-emoji"
                                            aria-hidden="true"
                                        >
                                            {emoji}
                                        </span>
                                        <div className="bucket-card-main">
                                            <span className="bucket-card-text">
                                                {headline}
                                            </span>
                                            {item.description && (
                                                <span className="bucket-card-desc">
                                                    {item.description}
                                                </span>
                                            )}
                                            {tags.length > 0 && (
                                                <span className="bucket-card-tags">
                                                    {tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="bucket-card-tag"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                            <span className="bucket-card-meta">
                                                Added{' '}
                                                {formatDate(
                                                    item.createdAt,
                                                    'MMM D, YYYY'
                                                )}
                                                {!isPro && (
                                                    <span className="bucket-card-pro-hint">
                                                        <AutoAwesomeRoundedIcon fontSize="inherit" />
                                                        Pro polishes goals into
                                                        titled cards
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="bucket-card-actions">
                                            <ButtonCustom
                                                type="none"
                                                capitalizeType="none"
                                                className={
                                                    isPro
                                                        ? 'bucket-card-cta'
                                                        : 'bucket-card-cta is-pro-locked'
                                                }
                                                onClick={() =>
                                                    openBuildWizard(item.id)
                                                }
                                                disabled={generate.isPending}
                                                aria-label={
                                                    isPro
                                                        ? `Create trip from "${item.text}"`
                                                        : `Pro only — upgrade to create a trip from "${item.text}"`
                                                }
                                            >
                                                {isPro ? (
                                                    <AutoAwesomeRoundedIcon
                                                        fontSize="small"
                                                        className="bucket-card-cta-sparkle"
                                                    />
                                                ) : (
                                                    <LockRoundedIcon fontSize="small" />
                                                )}
                                                <span>
                                                    {isPro
                                                        ? 'Build trip'
                                                        : 'Create trip'}
                                                </span>
                                                {!isPro && (
                                                    <span className="bucket-card-pro-tag">
                                                        Pro
                                                    </span>
                                                )}
                                            </ButtonCustom>
                                            <IconButton
                                                size="small"
                                                className="bucket-card-delete"
                                                aria-label={`Remove "${item.text}"`}
                                                title="Remove from bucket list"
                                                onClick={() =>
                                                    void remove.mutateAsync(
                                                        item.id
                                                    )
                                                }
                                            >
                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                    </div>

                                    {isWizardOpen && (
                                        <div className="bucket-wizard">
                                            {/* Step header — dots + close.
                                                Step 1 dot fills when on
                                                step 1; both fill on step 2
                                                so the user reads
                                                progression. */}
                                            <div className="bucket-wizard-head">
                                                <div className="bucket-wizard-progress">
                                                    <span
                                                        className={classNames(
                                                            'bucket-wizard-dot',
                                                            { 'is-active': true }
                                                        )}
                                                    />
                                                    <span
                                                        className={classNames(
                                                            'bucket-wizard-dot',
                                                            {
                                                                'is-active':
                                                                    wizardStep ===
                                                                    2,
                                                            }
                                                        )}
                                                    />
                                                </div>
                                                <span className="bucket-wizard-step-label">
                                                    Step {wizardStep} of 2
                                                </span>
                                                <button
                                                    type="button"
                                                    className="bucket-wizard-cancel"
                                                    onClick={closeBuildWizard}
                                                    aria-label="Cancel"
                                                >
                                                    Cancel
                                                </button>
                                            </div>

                                            {wizardStep === 1 && (
                                                <>
                                                    <h4 className="bucket-wizard-question">
                                                        How many people are going?
                                                    </h4>
                                                    <p className="bucket-wizard-hint">
                                                        Sizes lodging
                                                        suggestions and splits
                                                        the budget per person.
                                                    </p>
                                                    <div className="bucket-wizard-chips">
                                                        {[
                                                            {
                                                                value: 1,
                                                                label: '1',
                                                                note: 'Solo',
                                                            },
                                                            {
                                                                value: 2,
                                                                label: '2',
                                                                note: 'Couple',
                                                            },
                                                            {
                                                                value: 4,
                                                                label: '4',
                                                                note: 'Family',
                                                            },
                                                            {
                                                                value: 6,
                                                                label: '6',
                                                                note: 'Group',
                                                            },
                                                        ].map((opt) => (
                                                            <button
                                                                key={`party-${opt.value}`}
                                                                type="button"
                                                                className={classNames(
                                                                    'bucket-wizard-chip',
                                                                    {
                                                                        'is-selected':
                                                                            Number(
                                                                                wizardParty
                                                                            ) ===
                                                                            opt.value,
                                                                    }
                                                                )}
                                                                onClick={() =>
                                                                    setWizardParty(
                                                                        String(
                                                                            opt.value
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <span className="bucket-wizard-chip-amount">
                                                                    {opt.label}
                                                                </span>
                                                                <span className="bucket-wizard-chip-note">
                                                                    {opt.note}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="bucket-wizard-custom">
                                                        <label
                                                            htmlFor={`party-custom-${item.id}`}
                                                            className="bucket-wizard-custom-label"
                                                        >
                                                            Or enter a number:
                                                        </label>
                                                        <input
                                                            id={`party-custom-${item.id}`}
                                                            type="number"
                                                            min={1}
                                                            max={20}
                                                            value={wizardParty}
                                                            onChange={(e) =>
                                                                setWizardParty(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="bucket-wizard-custom-input"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {wizardStep === 2 && (
                                                <>
                                                    <h4 className="bucket-wizard-question">
                                                        How long should the trip be?
                                                    </h4>
                                                    <p className="bucket-wizard-hint">
                                                        Pick a length, or let us
                                                        decide based on the
                                                        budget + activity mix.
                                                    </p>
                                                    <div className="bucket-wizard-chips">
                                                        {[3, 5, 7, 10, 14].map(
                                                            (d) => (
                                                                <button
                                                                    key={`dur-${d}`}
                                                                    type="button"
                                                                    className={classNames(
                                                                        'bucket-wizard-chip',
                                                                        {
                                                                            'is-selected':
                                                                                Number(
                                                                                    wizardDuration
                                                                                ) ===
                                                                                d,
                                                                        }
                                                                    )}
                                                                    onClick={() =>
                                                                        setWizardDuration(
                                                                            String(d)
                                                                        )
                                                                    }
                                                                >
                                                                    <span className="bucket-wizard-chip-amount">
                                                                        {d}
                                                                    </span>
                                                                    <span className="bucket-wizard-chip-note">
                                                                        {d === 1
                                                                            ? 'day'
                                                                            : 'days'}
                                                                    </span>
                                                                </button>
                                                            )
                                                        )}
                                                        <button
                                                            type="button"
                                                            className={classNames(
                                                                'bucket-wizard-chip',
                                                                {
                                                                    'is-selected':
                                                                        !wizardDuration,
                                                                }
                                                            )}
                                                            onClick={() =>
                                                                setWizardDuration(
                                                                    ''
                                                                )
                                                            }
                                                        >
                                                            <span className="bucket-wizard-chip-amount">
                                                                Auto
                                                            </span>
                                                            <span className="bucket-wizard-chip-note">
                                                                Smart picks
                                                            </span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* Confidence builder — reminds
                                                the user the AI isn't starting
                                                from scratch; it folds in
                                                everything we already know
                                                about them. */}
                                            <div className="bucket-wizard-summary">
                                                <span className="bucket-wizard-summary-title">
                                                    We&rsquo;ll build it using:
                                                </span>
                                                <ul className="bucket-wizard-summary-list">
                                                    <li>
                                                        <CheckCircleRoundedIcon fontSize="inherit" />
                                                        {(user?.travelerStyles
                                                            ?.length ?? 0) > 0
                                                            ? `Your travel style (${(
                                                                  user?.travelerStyles ??
                                                                  []
                                                              ).join(', ')})`
                                                            : 'Your saved travel style'}
                                                    </li>
                                                    <li>
                                                        <CheckCircleRoundedIcon fontSize="inherit" />
                                                        This bucket-list goal
                                                    </li>
                                                    <li>
                                                        <CheckCircleRoundedIcon fontSize="inherit" />
                                                        Your budget preferences
                                                    </li>
                                                    <li>
                                                        <CheckCircleRoundedIcon fontSize="inherit" />
                                                        Your previous trips
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="bucket-wizard-actions">
                                                {wizardStep === 2 && (
                                                    <button
                                                        type="button"
                                                        className="bucket-wizard-back"
                                                        onClick={() =>
                                                            setWizardStep(1)
                                                        }
                                                    >
                                                        <ArrowBackRoundedIcon fontSize="small" />
                                                        <span>Back</span>
                                                    </button>
                                                )}
                                                {wizardStep === 1 ? (
                                                    <ButtonCustom
                                                        type="standard"
                                                        capitalizeType="none"
                                                        label="Next"
                                                        onClick={() =>
                                                            setWizardStep(2)
                                                        }
                                                    />
                                                ) : (
                                                    <ButtonCustom
                                                        type="standard"
                                                        capitalizeType="none"
                                                        label="Build trip"
                                                        onClick={() =>
                                                            void handleCreateTrip(
                                                                item.id,
                                                                item.text
                                                            )
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {items.length > 0 && (
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={(p) => {
                            setPage(p);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        ariaLabel="Bucket list pagination"
                    />
                )}
            </div>
        </Layout>
    );
};

export default BucketList;
