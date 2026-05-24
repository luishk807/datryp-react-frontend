import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Snackbar,
    Alert,
} from '@mui/material';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import classnames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import TripBox, { type TripBoxData } from 'components/common/TripBox';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlacesYouMightLove from 'components/PlacesYouMightLove';
import {
    useDeleteItinerary,
    useMyItineraries,
} from 'api/hooks/useItineraries';
import { apiToTripEntry } from 'utils/itineraryAdapter';
import './index.scss';

type FilterValue = 'all' | 'planning' | 'confirmed' | 'completed';

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'planning', label: 'Planning' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
];

export const Trips = () => {
    const [filter, setFilter] = useState<FilterValue>('all');
    const navigate = useNavigate();
    const { data: apiItineraries = [], isLoading, isError } = useMyItineraries();
    const deleteMutation = useDeleteItinerary();

    // Multi-select state. `selectMode` flips card behavior from
    // navigate-on-click to toggle-selection; `selectedIds` tracks the
    // picked trip UUIDs. Both reset when the user exits select mode.
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<{
        msg: string;
        severity: 'success' | 'error';
    } | null>(null);

    // Convert API itineraries to the legacy TripBoxData shape. Each entry
    // carries an `apiId` (UUID) so TripDetail can look it up later.
    const allTrips = useMemo(() => {
        return apiItineraries.map((it) => {
            const entry = apiToTripEntry(it) as TripBoxData & { apiId: string };
            return entry;
        });
    }, [apiItineraries]);

    const counts = useMemo(() => {
        const c: Record<FilterValue, number> = {
            all: allTrips.length,
            planning: 0,
            confirmed: 0,
            completed: 0,
        };
        allTrips.forEach((t) => {
            const key = t.status.name.toLowerCase() as FilterValue;
            if (key in c) c[key]++;
        });
        return c;
    }, [allTrips]);

    const filteredTrips = useMemo(() => {
        if (filter === 'all') return allTrips;
        return allTrips.filter((t) => t.status.name.toLowerCase() === filter);
    }, [filter, allTrips]);

    const tripIdOf = (trip: TripBoxData) =>
        (trip as { apiId?: string }).apiId ?? String(trip.id);

    const enterSelectMode = () => {
        setSelectedIds(new Set());
        setSelectMode(true);
    };

    const exitSelectMode = () => {
        setSelectedIds(new Set());
        setSelectMode(false);
    };

    const toggleSelected = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllVisible = () => {
        const ids = filteredTrips.map(tripIdOf);
        setSelectedIds(new Set(ids));
    };

    const handleConfirmDelete = async () => {
        if (selectedIds.size === 0) {
            setConfirmOpen(false);
            return;
        }
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        // Parallel deletes — the useDeleteItinerary mutation handles
        // cache invalidation, but we settle all of them before
        // surfacing the toast so partial failures are visible.
        const results = await Promise.allSettled(
            ids.map((id) => deleteMutation.mutateAsync(id)),
        );
        setIsDeleting(false);
        setConfirmOpen(false);

        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - ok;
        if (failed === 0) {
            setToast({
                msg:
                    ok === 1
                        ? 'Trip deleted.'
                        : `${ok} trips deleted.`,
                severity: 'success',
            });
            exitSelectMode();
        } else {
            setToast({
                msg: `Deleted ${ok} of ${results.length} trips. ${failed} couldn't be removed — try again.`,
                severity: 'error',
            });
            // Keep the failed ones selected so the user can retry; drop
            // the successfully deleted ones from the selection set so
            // they don't get re-attempted on retry.
            const successfulIds = new Set(
                ids.filter((_, idx) => results[idx].status === 'fulfilled'),
            );
            setSelectedIds(
                new Set(ids.filter((id) => !successfulIds.has(id))),
            );
        }
    };

    return (
        <Layout title="My Trips">
            <div className="trips-page">
                <div className="trips-header">
                    <div className="trips-summary">
                        <span className="trips-count">
                            {allTrips.length} trip{allTrips.length === 1 ? '' : 's'}
                        </span>
                        {counts.planning > 0 && (
                            <span className="trips-summary-item">
                                · {counts.planning} planning
                            </span>
                        )}
                        {counts.confirmed > 0 && (
                            <span className="trips-summary-item">
                                · {counts.confirmed} confirmed
                            </span>
                        )}
                        {counts.completed > 0 && (
                            <span className="trips-summary-item">
                                · {counts.completed} completed
                            </span>
                        )}
                    </div>
                    <div className="trips-cta">
                        {!selectMode && allTrips.length > 0 && (
                            <button
                                type="button"
                                className="trips-select-toggle"
                                onClick={enterSelectMode}
                            >
                                <CheckBoxOutlinedIcon fontSize="small" />
                                <span>Select</span>
                            </button>
                        )}
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            label="+ Plan new trip"
                            onClick={() => navigate('/')}
                        />
                    </div>
                </div>

                {selectMode && (
                    <div
                        className="trips-select-bar"
                        role="region"
                        aria-label="Selection actions"
                    >
                        <div className="trips-select-bar-meta">
                            <strong>
                                {selectedIds.size} selected
                            </strong>
                            <span>
                                · {filteredTrips.length} on this view
                            </span>
                        </div>
                        <div className="trips-select-bar-actions">
                            <button
                                type="button"
                                className="trips-select-bar-secondary"
                                onClick={selectAllVisible}
                                disabled={
                                    selectedIds.size === filteredTrips.length
                                }
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                className="trips-select-bar-danger"
                                onClick={() => setConfirmOpen(true)}
                                disabled={selectedIds.size === 0}
                            >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                                <span>
                                    Delete{selectedIds.size > 1
                                        ? ` ${selectedIds.size}`
                                        : ''}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="trips-select-bar-cancel"
                                onClick={exitSelectMode}
                                aria-label="Cancel selection"
                            >
                                <CloseRoundedIcon fontSize="small" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="trips-filters">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            className={classnames('trips-filter', {
                                active: filter === f.value,
                            })}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                            <span className="trips-filter-count">
                                {counts[f.value]}
                            </span>
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="trips-empty">
                        <p>Loading trips…</p>
                    </div>
                ) : isError ? (
                    <div className="trips-empty">
                        <p>Couldn't load your trips. Is the backend running?</p>
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <>
                        <div className="trips-empty">
                            <p>No trips in this category yet.</p>
                        </div>
                        {/* When the user is fully tripless (not just filtered to
                            an empty bucket), surface the personalized
                            recommendations so they have something to act on. */}
                        {allTrips.length === 0 && (
                            <PlacesYouMightLove variant="empty-trips" />
                        )}
                    </>
                ) : (
                    <Grid container id="trip-container">
                        {filteredTrips.map((trip) => {
                            const id = tripIdOf(trip);
                            return (
                                <Grid
                                    key={id}
                                    item
                                    lg={4}
                                    md={6}
                                    xs={12}
                                    className="trip-item"
                                >
                                    <TripBox
                                        data={trip}
                                        to={`/trip-detail?id=${id}`}
                                        selectable={selectMode}
                                        selected={selectedIds.has(id)}
                                        onToggleSelect={() =>
                                            toggleSelected(id)
                                        }
                                    />
                                </Grid>
                            );
                        })}
                    </Grid>
                )}

                <Dialog
                    open={confirmOpen}
                    onClose={() => !isDeleting && setConfirmOpen(false)}
                    aria-labelledby="trips-delete-confirm-title"
                >
                    <DialogTitle id="trips-delete-confirm-title">
                        Delete {selectedIds.size}{' '}
                        {selectedIds.size === 1 ? 'trip' : 'trips'}?
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            This will remove the{' '}
                            {selectedIds.size === 1 ? 'trip' : 'trips'}{' '}
                            from your list. Participants you invited
                            will be notified, and the data is removed
                            from your account.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <button
                            type="button"
                            className="trips-dialog-cancel"
                            onClick={() => setConfirmOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="trips-dialog-confirm"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting
                                ? 'Deleting…'
                                : `Delete ${selectedIds.size}`}
                        </button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={Boolean(toast)}
                    autoHideDuration={4000}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    onClose={() => setToast(null)}
                >
                    {toast ? (
                        <Alert
                            severity={toast.severity}
                            variant="filled"
                            onClose={() => setToast(null)}
                            sx={{ width: '100%' }}
                        >
                            {toast.msg}
                        </Alert>
                    ) : undefined}
                </Snackbar>
            </div>
        </Layout>
    );
};

export default Trips;
