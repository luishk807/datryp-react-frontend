import { useState } from "react";
import {
    Alert,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Snackbar,
} from "@mui/material";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import { useTripSuggestions } from "api/hooks/useTripSuggestions";
import { TripSuggestionsBackendError } from "api/tripSuggestionsApi";
import { capture } from "lib/posthog";
import type { TripSuggestionItem } from "api/tripSuggestionsApi";
import type { Activity, Destination, TripPlaceEvent } from "types";
import "./index.scss";

interface TripSuggestionsCardProps {
    /** Backend trip UUID. The lightbulb POST uses this in the URL. */
    tripId: string;
    /** Hide the entire card when the viewer isn't on a Pro tier (or admin).
     *  Lets the FE skip the AI call AND the upgrade-modal round-trip
     *  for free users. Server still gates with 402, so this is purely
     *  about not advertising a feature the user can't use. */
    isPro: boolean;
    /** Lightbulb is Planning-only. Mounting at TripDetail already
     *  enforces this, but we keep the prop so the parent doesn't
     *  re-derive the check. */
    isPlanning: boolean;
    /** Add CTA dispatches to handleChangePlace which is organizer-only
     *  per the existing TripDetail rules. Non-organizers can still
     *  see the suggestions for inspiration but the Add button stays
     *  disabled. */
    isOrganizer: boolean;
    /** Day picker draws from these. We flatten across destinations so
     *  a multi-trip's days are all selectable from one dialog. */
    destinations: Destination[];
    /** TripDetail's handleChangePlace — same callback the activity
     *  cards use. We send `type: 'add'` events with the suggestion
     *  shape mapped to a Partial<Activity>. */
    onAddPlace: (event: TripPlaceEvent) => void;
}

interface PickerDay {
    destinationIndx: number;
    date: string;
    dayNumber: number;
    countryName: string | null;
    activityCount: number;
}

const flattenDays = (destinations: Destination[]): PickerDay[] => {
    const out: PickerDay[] = [];
    let runningDay = 0;
    destinations.forEach((dest, destIdx) => {
        const days = dest.itinerary ?? [];
        days.forEach((day) => {
            runningDay += 1;
            if (!day.date) return;
            out.push({
                destinationIndx: destIdx,
                date: day.date,
                dayNumber: runningDay,
                countryName: dest.country?.name ?? null,
                activityCount: day.activities?.length ?? 0,
            });
        });
    });
    return out;
};

const suggestionToActivityDraft = (
    s: TripSuggestionItem,
): Partial<Activity> => {
    // Map the lightbulb shape onto a Partial<Activity> the parent's
    // `handleChangePlace` add branch already knows how to merge into a
    // day. Everything the AI returned that has a place on the Activity
    // schema rides through — name, place, cost, image, and the "why"
    // as the note. Duration appends to the note since the schema has
    // no dedicated duration field.
    const noteBits = [s.why];
    if (s.durationHours != null) {
        noteBits.push(`~${s.durationHours}h on site`);
    }
    return {
        kind: "place",
        name: s.name,
        place: s.place ?? undefined,
        // Address mirrors place for now — the BE flat lookup uses
        // `location` for the searchable text and `place` for the
        // display label. Setting both keeps the saved row consistent
        // with manually-added places.
        location: s.place ?? undefined,
        cost: s.estimatedCostUsd ?? undefined,
        // Image carries the Unsplash hero photo + the activity name
        // as the alt-text "name" the ImageRef schema requires.
        image: s.imageUrl ? { url: s.imageUrl, name: s.name } : undefined,
        note: noteBits.join(" · "),
    };
};

const formatDayLabel = (dateIso: string): string => {
    const d = new Date(dateIso);
    if (Number.isNaN(d.getTime())) return dateIso;
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
};

const TripSuggestionsCard = ({
    tripId,
    isPro,
    isPlanning,
    isOrganizer,
    destinations,
    onAddPlace,
}: TripSuggestionsCardProps) => {
    const mutation = useTripSuggestions();
    const [pickerSuggestion, setPickerSuggestion] =
        useState<TripSuggestionItem | null>(null);
    const [addedToast, setAddedToast] = useState<string | null>(null);
    // Local collapse state. Defaults to false (visible) so a fresh
    // generate auto-expands; the user can hide once they're satisfied
    // and unhide later without re-firing the AI call. Reset on every
    // new generation by the handleGenerate flow below.
    const [isHidden, setIsHidden] = useState(false);

    // Pro-gating + lifecycle: lightbulb is wasted real estate on free
    // accounts and on trips past Planning. Server also enforces both
    // (402 for free, 409 for non-Planning); hiding client-side avoids
    // a button users can't actually use.
    if (!isPro || !isPlanning) return null;

    const days = flattenDays(destinations);
    // Empty trip (no days yet) has nothing to add a suggestion to.
    // Wait for the user to set dates in the stepper first.
    if (days.length === 0) return null;

    const handleGenerate = () => {
        capture("lightbulb_clicked", { trip_id: tripId });
        setIsHidden(false);
        mutation.mutate({ tripId });
    };

    const handleClosePanel = () => {
        capture("lightbulb_toggled", {
            trip_id: tripId,
            next_hidden: true,
        });
        setIsHidden(true);
    };

    const handlePickDay = (suggestion: TripSuggestionItem, day: PickerDay) => {
        onAddPlace({
            date: day.date,
            activity: {
                type: "add",
                value: suggestionToActivityDraft(suggestion),
                destinationIndx: day.destinationIndx,
            },
        });
        capture("lightbulb_suggestion_added", {
            trip_id: tripId,
            category: suggestion.category ?? null,
            destination_index: day.destinationIndx,
        });
        setPickerSuggestion(null);
        setAddedToast(
            `Added "${suggestion.name}" to ${formatDayLabel(day.date)}`,
        );
    };

    const renderError = () => {
        const err = mutation.error;
        let message = "Couldn't fetch suggestions. Try again in a moment.";
        if (err instanceof TripSuggestionsBackendError) {
            // 409 means the trip moved past Planning between the page
            // load and the click. Quietly hide on next render — the
            // outer guard will short-circuit on the parent's next
            // `isPlanning` value.
            if (err.kind === "trip_suggestions_not_planning") {
                message =
                    "This trip is no longer in Planning. Move it back to Planning to get new ideas.";
            } else if (err.kind === "trip_suggestions_quota") {
                message =
                    "You've used today's lightbulb runs. Resets at UTC midnight.";
            } else if (err.status === 402) {
                message =
                    "Lightbulb suggestions are a Pro feature. Upgrade to unlock.";
            } else if (err.message) {
                message = err.message;
            }
        } else if (err?.message) {
            message = err.message;
        }
        return (
            <Alert
                severity="error"
                variant="outlined"
                className="trip-suggestions-error"
                action={
                    <ButtonCustom
                        type="text"
                        label="Retry"
                        onClick={handleGenerate}
                    />
                }
            >
                {message}
            </Alert>
        );
    };

    const hasResults = !!mutation.data && !mutation.isPending;
    // Whenever the panel has something to show (in-flight call, an
    // error from a previous attempt, or successful results), expose a
    // Hide toggle. Hiding just collapses the panel — it doesn't abort
    // an in-flight mutation, so an unhide right after restores the
    // same content without a re-fetch.
    const hasPanelContent =
        mutation.isPending || mutation.isError || hasResults;
    const showPanel = hasPanelContent && !isHidden;
    const triggerLabel = mutation.isPending
        ? "Conjuring ideas…"
        : hasResults
          ? "More ideas"
          : "Get activity ideas";

    return (
        <>
            <div className="trip-suggestions-trigger-row">
                <button
                    type="button"
                    className="trip-suggestions-trigger"
                    onClick={handleGenerate}
                    disabled={mutation.isPending}
                    aria-label={triggerLabel}
                >
                    <LightbulbRoundedIcon
                        className="trip-suggestions-trigger-icon"
                        fontSize="small"
                    />
                    <span>{triggerLabel}</span>
                </button>
            </div>

            {showPanel && (
                <section
                    className="trip-suggestions-card"
                    aria-label="Lightbulb activity suggestions"
                >
                    <button
                        type="button"
                        className="trip-suggestions-close"
                        onClick={handleClosePanel}
                        aria-label="Hide suggestions"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </button>
                    {mutation.isPending && (
                        <div className="trip-suggestions-loading">
                            <CircularProgress size={20} />
                            <span>
                                Asking the AI for ideas that fit your trip…
                            </span>
                        </div>
                    )}

                    {mutation.isError && renderError()}

                    {hasResults &&
                        mutation.data!.quota.remaining >= 0 &&
                        mutation.data!.quota.remaining <= 10 && (
                            <p className="trip-suggestions-quota">
                                {mutation.data!.quota.remaining === 0
                                    ? `That was your last run today — resets at UTC midnight.`
                                    : `${mutation.data!.quota.remaining} run${
                                          mutation.data!.quota.remaining === 1
                                              ? ''
                                              : 's'
                                      } left today (cap ${mutation.data!.quota.cap}/day).`}
                            </p>
                        )}

                    {hasResults && (
                        <>
                            <div className="trip-suggestions-grid">
                                {mutation.data!.suggestions.map((s, i) => (
                                    <article
                                        key={`${s.name}-${i}`}
                                        className="trip-suggestion-card"
                                    >
                                        <div className="trip-suggestion-card-media">
                                            {s.imageUrl ? (
                                                <img
                                                    src={s.imageUrl}
                                                    alt={s.name}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div
                                                    className="trip-suggestion-card-media-fallback"
                                                    aria-hidden="true"
                                                >
                                                    <LightbulbOutlinedIcon
                                                        fontSize="large"
                                                    />
                                                </div>
                                            )}
                                            {s.category && (
                                                <span className="trip-suggestion-card-chip">
                                                    {s.category}
                                                </span>
                                            )}
                                            {s.photographerName && s.photographerUrl && (
                                                <a
                                                    href={s.photographerUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="trip-suggestion-card-credit"
                                                >
                                                    © {s.photographerName}
                                                </a>
                                            )}
                                        </div>
                                        <div className="trip-suggestion-card-body">
                                            <h4 className="trip-suggestion-card-name">
                                                {s.name}
                                            </h4>
                                            {s.place && (
                                                <p className="trip-suggestion-card-place">
                                                    {s.place}
                                                </p>
                                            )}
                                            <p className="trip-suggestion-card-why">
                                                {s.why}
                                            </p>
                                            <div className="trip-suggestion-card-meta">
                                                {s.estimatedCostUsd != null && (
                                                    <span>
                                                        ~${s.estimatedCostUsd}
                                                    </span>
                                                )}
                                                {s.durationHours != null && (
                                                    <span>
                                                        ~{s.durationHours}h
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="trip-suggestion-card-add"
                                                onClick={() =>
                                                    setPickerSuggestion(s)
                                                }
                                                disabled={!isOrganizer}
                                                aria-label={`Add ${s.name} to trip`}
                                            >
                                                <AddRoundedIcon fontSize="small" />
                                                <span>Add to trip</span>
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <aside
                                className="trip-suggestions-dont-forget"
                                aria-label="Don't forget tip"
                            >
                                <LightbulbOutlinedIcon className="trip-suggestions-dont-forget-icon" />
                                <div>
                                    <span className="trip-suggestions-dont-forget-label">
                                        Don&rsquo;t forget
                                    </span>
                                    <span className="trip-suggestions-dont-forget-text">
                                        {mutation.data!.dontForget}
                                    </span>
                                </div>
                            </aside>
                        </>
                    )}
                </section>
            )}

            <Dialog
                open={pickerSuggestion !== null}
                onClose={() => setPickerSuggestion(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle className="trip-suggestions-picker-title">
                    Add to which day?
                    <button
                        type="button"
                        className="trip-suggestions-picker-close"
                        onClick={() => setPickerSuggestion(null)}
                        aria-label="Close day picker"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </button>
                </DialogTitle>
                <DialogContent>
                    {pickerSuggestion && (
                        <p className="trip-suggestions-picker-sub">
                            Pick a day to drop&nbsp;
                            <strong>{pickerSuggestion.name}</strong> onto.
                        </p>
                    )}
                    <div className="trip-suggestions-picker-list">
                        {days.map((d) => (
                            <button
                                key={`${d.destinationIndx}-${d.date}`}
                                type="button"
                                className="trip-suggestions-picker-day"
                                onClick={() =>
                                    pickerSuggestion &&
                                    handlePickDay(pickerSuggestion, d)
                                }
                            >
                                <span className="trip-suggestions-picker-day-num">
                                    Day {d.dayNumber}
                                </span>
                                <span className="trip-suggestions-picker-day-date">
                                    {formatDayLabel(d.date)}
                                </span>
                                {d.countryName && (
                                    <span className="trip-suggestions-picker-day-country">
                                        {d.countryName}
                                    </span>
                                )}
                                <span className="trip-suggestions-picker-day-count">
                                    {d.activityCount === 0
                                        ? "Empty"
                                        : d.activityCount === 1
                                          ? "1 activity"
                                          : `${d.activityCount} activities`}
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Snackbar
                open={!!addedToast}
                autoHideDuration={3200}
                onClose={() => setAddedToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={addedToast}
            />
        </>
    );
};

export default TripSuggestionsCard;
