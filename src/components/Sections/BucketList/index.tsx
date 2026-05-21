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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import { IconButton } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import AiTripLoader from 'components/AiTripLoader';
import { BucketListBlockedError } from 'api/bucketListApi';
import {
    useAddBucketListItem,
    useBucketList,
    useDeleteBucketListItem,
    useGenerateTripFromBucket,
} from 'api/hooks/useBucketList';
import { formatDate } from 'utils/date';
import { TRIP_BASIC } from 'constants';
import './index.scss';

const BucketList = () => {
    const navigate = useNavigate();
    const { data: items = [], isLoading } = useBucketList();
    const add = useAddBucketListItem();
    const remove = useDeleteBucketListItem();
    const generate = useGenerateTripFromBucket();
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Goal text of the row currently being AI-built. Drives the loader
    // headline so the user sees what we're working on.
    const [generatingText, setGeneratingText] = useState<string | null>(null);

    const handleAdd = async () => {
        const text = draft.trim();
        if (!text) return;
        setError(null);
        try {
            await add.mutateAsync(text);
            setDraft('');
        } catch (err) {
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
                    <h1 className="bucket-page-title">Bucket list</h1>
                    <p className="bucket-page-subtitle">
                        Travel goals you want to check off. Add a few — we'll
                        turn them into trips when you're ready.
                    </p>
                </header>

                <section className="bucket-add">
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
                        capitalizeType="none"
                        className="bucket-add-btn"
                        label={add.isPending ? 'Saving…' : 'Add'}
                        onClick={handleAdd}
                        disabled={add.isPending || !draft.trim()}
                    />
                </section>

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
                                        className="bucket-card-cta"
                                        onClick={() =>
                                            void handleCreateTrip(
                                                item.id,
                                                item.text
                                            )
                                        }
                                        disabled={generate.isPending}
                                    >
                                        <FlightTakeoffRoundedIcon fontSize="small" />
                                        <span>Create trip</span>
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
