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
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
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
    useGenerateTripFromBucket,
} from 'api/hooks/useBucketList';
import { useUser } from 'context/UserContext';
import { formatDate } from 'utils/date';
import { TRIP_BASIC } from 'constants';
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
            body: 'DaTryp.com Pro removes the limit so you can keep dreaming. Pro also unlocks "Create trip" — turn any bucket-list goal into a real itinerary with AI.',
        };
    }
    return {
        title: 'Pro feature',
        headline: <>Turning a bucket-list goal into a real trip is a Pro feature.</>,
        body: 'DaTryp.com Pro builds an AI itinerary from any of your bucket-list entries — picking a country, planning days, suggesting activities — saved as a draft trip ready for you to tweak.',
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

    const isPro = Boolean(user && (user.isPaidMember || isAdmin));
    const atCap = !isPro && items.length >= FREE_TIER_BUCKET_LIST_LIMIT;

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

    const handleCreateTrip = async (id: string, text: string) => {
        setError(null);
        // Short-circuit for free users — no need to hit the backend just
        // to receive a 402. Opens the same paywall the backend would
        // surface, with the "Pro feature" copy.
        if (!isPro) {
            openPaywall({
                kind: 'bucket_list_generate',
                currentCount: items.length,
                cap: FREE_TIER_BUCKET_LIST_LIMIT,
            });
            return;
        }
        setGeneratingText(text);
        try {
            const result = await generate.mutateAsync(id);
            // Route to the editor for the trip type the AI picked. Edit
            // mode renders the just-saved trip with all fields filled in
            // so the user can review, tweak, and confirm.
            const route =
                result.tripType === 'multi'
                    ? TRIP_BASIC.MULTIPLE.route
                    : TRIP_BASIC.SINGLE.route;
            navigate(`${route}?id=${encodeURIComponent(result.itineraryId)}`);
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
            setError(
                err instanceof Error
                    ? err.message
                    : "Couldn't build that trip right now. Please try again."
            );
        } finally {
            setGeneratingText(null);
        }
    };

    return (
        <Layout title="Bucket list">
            <div className="bucket-page">
                <header className="bucket-page-header">
                    <h1 className="bucket-page-title">Your travel goals</h1>
                    <p className="bucket-page-subtitle">
                        Travel goals you want to check off. Add a few — we'll
                        turn them into trips when you're ready.
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

                {/* Wrap in <form> so Enter inside the input submits naturally
                    via the browser's default form behavior — no manual
                    keydown plumbing through InputField. */}
                <form
                    className="bucket-add"
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
                        {items.map((item) => (
                            <li key={item.id} className="bucket-card">
                                <div className="bucket-card-main">
                                    <span className="bucket-card-text">
                                        {item.text}
                                    </span>
                                    <span className="bucket-card-meta">
                                        Added{' '}
                                        {formatDate(item.createdAt, 'MMM D, YYYY')}
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
                                            void handleCreateTrip(
                                                item.id,
                                                item.text
                                            )
                                        }
                                        disabled={generate.isPending}
                                        aria-label={
                                            isPro
                                                ? `Create trip from "${item.text}"`
                                                : `Pro only — upgrade to create a trip from "${item.text}"`
                                        }
                                    >
                                        {isPro ? (
                                            <FlightTakeoffRoundedIcon fontSize="small" />
                                        ) : (
                                            <LockRoundedIcon fontSize="small" />
                                        )}
                                        <span>Create trip</span>
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
                                            void remove.mutateAsync(item.id)
                                        }
                                    >
                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Layout>
    );
};

export default BucketList;
