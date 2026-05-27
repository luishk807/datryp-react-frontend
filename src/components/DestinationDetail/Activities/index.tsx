import './index.scss';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { useNow } from 'hooks/useNow';
import {
    getActivityProgress,
    getActivityTiming,
    safeFormatTime,
    type ActivityTimingState,
} from 'utils/activityTiming';
import { Grid, IconButton } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import FlightTakeoffOutlinedIcon from '@mui/icons-material/FlightTakeoffOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ImageBlock from 'components/DestinationDetail/ImageBlock';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import AddBudget from 'components/DestinationDetail/AddBudget';
import DraggableActivity from 'components/DestinationDetail/Activities/DraggableActivity';
import IconConfirmButton from 'components/common/IconConfirmButton';
import { convertMoney } from 'utils';
import { useTripStatuses } from 'api/hooks/useLookups';
import { ACTIVITY_KIND, TRIP_STATUS } from 'constants';
import type { ActionType, Activity, ActivityStatus, Friend } from 'types';

export interface ActivitiesProps {
    onChangePlace: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown) => void;
    activities?: Activity[] | null;
    participants?: Friend[];
    tripTypeId?: number;
    isViewMode?: boolean;
    /** Source destination index for any activity dragged out of this list.
     *  Defaults to 0 (single-trip case). */
    destIdx?: number;
    /** Date string identifying this day's drop target. Empty string means
     *  callers haven't wired drag-and-drop yet; the cards still render but
     *  without sortable/droppable behaviour. */
    date?: string;
    /** Country name for this day's destination — used to scope the
     *  AddPlace AI autocomplete so suggestions stay in-country. */
    country?: string;
    /** When true, the per-activity status pill (Planning/Confirmed toggle)
     *  is disabled. Used during new-trip creation so brand-new activities
     *  stay locked to Planning until the trip is actually saved. */
    lockActivityStatus?: boolean;
    /** Current trip status name. When `'confirmed'`, the activity card
     *  switches into post-planning UI: status pill is hidden, the X
     *  delete button is replaced with a "Complete" button, and
     *  activities with their own `'completed'` status render dimmed +
     *  non-interactive. */
    tripStatusName?: string;
}

const isConfirmedStatus = (status: Activity['status']): boolean => {
    if (status && typeof status === 'object') {
        return (status as ActivityStatus).name === TRIP_STATUS.CONFIRMED;
    }
    return false;
};

const isCompletedStatus = (status: Activity['status']): boolean => {
    if (status && typeof status === 'object') {
        return (status as ActivityStatus).name === TRIP_STATUS.COMPLETED;
    }
    return false;
};

/** Icon to show on the left of an activity title, based on its kind:
 *   - flight → angled takeoff plane (reads as "flight" at a glance)
 *   - hotel check-in → bed icon
 *   - hotel check-out → outbound-arrow (departure) icon
 *   - train → transit/train icon
 *   - bus → bus icon
 *   - note → lined notepad (reads as "note" — a sticky-note icon is
 *     too generic to differentiate)
 *   - place WITHOUT an image → map pin (the image was the visual cue
 *     for places; without one the icon takes over)
 *   - place WITH an image → no icon (the thumbnail says "place")
 *  Returns `null` when no icon should render. */
const titleIconFor = (a: Activity) => {
    const kind = a.kind ?? ACTIVITY_KIND.PLACE;
    if (kind === ACTIVITY_KIND.FLIGHT) return FlightTakeoffRoundedIcon;
    if (kind === ACTIVITY_KIND.HOTEL_CHECKIN) return HotelRoundedIcon;
    if (kind === ACTIVITY_KIND.HOTEL_CHECKOUT) return LogoutRoundedIcon;
    if (kind === ACTIVITY_KIND.TRAIN) return DirectionsTransitRoundedIcon;
    if (kind === ACTIVITY_KIND.BUS) return DirectionsBusRoundedIcon;
    if (kind === ACTIVITY_KIND.NOTE) return EditNoteRoundedIcon;
    if (!a.image?.url) return PlaceRoundedIcon;
    return null;
};

const Activities = ({
    onChangePlace,
    onChangeBudget,
    activities = [],
    participants = [],
    tripTypeId,
    isViewMode = false,
    destIdx = 0,
    date = '',
    country = '',
    lockActivityStatus = false,
    tripStatusName,
}: ActivitiesProps) => {
    // Post-planning UI: once the trip itself is Confirmed (or beyond),
    // each activity gets a "Complete" button instead of delete and
    // the status pill is hidden. After Completed/Cancelled the actions
    // disappear entirely — the trip is locked in.
    const isTripConfirmed = tripStatusName === TRIP_STATUS.CONFIRMED;

    // Trip id pulled from the URL — present on /trip-detail?id=, /single?id=,
    // /multiple?id=. Drives the place-name → /place link in PLACE activities
    // (skipped during the new-trip create flow where there is no saved trip
    // to scope the detail page to). Reading from the URL keeps the
    // Activities component free of a `tripId` prop that two ancestors would
    // otherwise have to thread through.
    const [searchParams] = useSearchParams();
    const tripId = searchParams.get('id');

    // Live "now" for activity timing — re-renders every 30s so the
    // past/current/upcoming bin flips as time passes. Cheap: just a
    // setInterval; no external date lib.
    const now = useNow(30_000);
    // Day-level drop target — accepts drops onto empty space when there
    // are no sortable cards to land on. dnd-kit needs both the sortable
    // items AND a droppable container to support the empty-day case.
    const dndEnabled = Boolean(date) && !isViewMode;
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `day-${destIdx}-${date}`,
        data: { type: 'day', destIdx, date },
        disabled: !dndEnabled,
    });

    // Container ref for the activities list. Merged with dnd-kit's
    // `setDroppableRef` via the combined setter below. Used by the
    // continuous-slide NOW line to measure activity card positions
    // and place the line at a Y coord that matches the current clock.
    const containerRef = useRef<HTMLDivElement | null>(null);
    const setContainerRef = useCallback(
        (el: HTMLDivElement | null) => {
            containerRef.current = el;
            setDroppableRef(el);
        },
        [setDroppableRef]
    );

    // Auto-sort timed activities by start time within the day. Notes
    // are timeless, so they keep the exact index the user dragged them
    // to — the sort fills the remaining slots with the timed activities
    // in chronological order. Flight activities sort by the first
    // segment's depart time (currently `flightInfo.departTime`).
    const sortedActivities = useMemo(() => {
        if (!activities?.length) return activities ?? [];
        const startTimeOf = (a: Activity): string | undefined =>
            a.kind === ACTIVITY_KIND.FLIGHT
                ? a.flightSegments?.[0]?.departTime
                : a.startTime;
        const timed = activities
            .map((a, originalIndex) => ({ a, originalIndex }))
            .filter(({ a }) => a.kind !== ACTIVITY_KIND.NOTE)
            .sort((x, y) => {
                const tx = startTimeOf(x.a) ?? '99:99';
                const ty = startTimeOf(y.a) ?? '99:99';
                if (tx === ty) return x.originalIndex - y.originalIndex;
                return tx.localeCompare(ty);
            })
            .map(({ a }) => a);
        const result: Activity[] = new Array(activities.length);
        activities.forEach((a, i) => {
            if (a.kind === ACTIVITY_KIND.NOTE) result[i] = a;
        });
        let ti = 0;
        for (let i = 0; i < result.length; i++) {
            if (!result[i]) result[i] = timed[ti++];
        }
        return result;
    }, [activities]);

    const activityIds = useMemo(
        () => sortedActivities.map((a) => `act-${a.id}`),
        [sortedActivities]
    );

    // Activities share the same `trip_statuses` lookup as trips, so toggling
    // the badge resolves the real backend UUID here. If the lookup hasn't
    // loaded yet (cold cache, transient network blip), we fall back to a
    // name-only object — `activityStatusIdOf` in tripMapper just drops the
    // non-UUID id on save, so this is a safe no-op fallback.
    const { data: tripStatuses = [] } = useTripStatuses();
    const { plannedStatus, confirmedStatus, completedStatus } = useMemo(() => {
        const byName = (n: string): ActivityStatus | undefined => {
            const row = tripStatuses.find((s) => s.name === n);
            return row ? { id: row.id, name: row.name } : undefined;
        };
        return {
            plannedStatus: byName(TRIP_STATUS.PLANNING) ?? { id: 0, name: TRIP_STATUS.PLANNING },
            confirmedStatus: byName(TRIP_STATUS.CONFIRMED) ?? { id: 0, name: TRIP_STATUS.CONFIRMED },
            completedStatus: byName(TRIP_STATUS.COMPLETED) ?? { id: 0, name: TRIP_STATUS.COMPLETED },
        };
    }, [tripStatuses]);

    // Auto-complete past-due activities. When the trip is in Confirmed
    // state and an activity's end time slips into the past, flip its
    // status to Completed exactly the way the tick button does. We
    // gate on:
    //   - trip is Confirmed (Planning trips don't auto-complete —
    //     they aren't "live" yet)
    //   - completedStatus resolved to a real UUID (cold-cache guard
    //     mirroring the click-handler in handleChangePlace)
    //   - activity isn't already Completed
    //   - timing state is `past`
    // `autoMarkedRef` tracks ids we've already dispatched for in this
    // session so a re-render with the same data doesn't fire a flood
    // of save mutations.
    const autoMarkedRef = useRef(new Set<number>());
    useEffect(() => {
        if (!isTripConfirmed) return;
        if (typeof completedStatus.id !== 'string') return;
        if (!date) return;
        for (const activity of activities ?? []) {
            if (autoMarkedRef.current.has(activity.id)) continue;
            if (isCompletedStatus(activity.status)) continue;
            const timing = getActivityTiming(activity, date, now);
            if (timing !== 'past') continue;
            autoMarkedRef.current.add(activity.id);
            onChangePlace('edit', {
                index: 0,
                value: { id: activity.id, status: completedStatus },
            });
        }
    }, [
        activities,
        completedStatus,
        date,
        isTripConfirmed,
        now,
        onChangePlace,
    ]);

    const isEmpty = !activities || activities.length === 0;

    return (
        <div
            ref={setContainerRef}
            className={classNames('activities-droppable', {
                'is-drop-target': dndEnabled && isOver,
                'is-empty': isEmpty,
            })}
        >
            {dndEnabled && isEmpty && (
                <p className="activities-empty-hint">
                    Drop a place here, or add one below.
                </p>
            )}
            <SortableContext
                items={activityIds}
                strategy={verticalListSortingStrategy}
            >
            {sortedActivities.map((activity, indx) => {
                    const activityKind = activity.kind ?? ACTIVITY_KIND.PLACE;
                    const isNote = activityKind === ACTIVITY_KIND.NOTE;
                    const isFlight = activityKind === ACTIVITY_KIND.FLIGHT;
                    // Live timing bin used for the past/current/upcoming
                    // CSS class on the card. Notes (no time) return null
                    // and skip the live-state styling. The full now/date
                    // pair recomputes every 30s via useNow above.
                    const activityTiming: ActivityTimingState = isNote
                        ? null
                        : getActivityTiming(activity, date, now);
                    const activityProgress = isNote
                        ? null
                        : getActivityProgress(activity, date, now);
                    const isTransit =
                        activityKind === ACTIVITY_KIND.TRAIN ||
                        activityKind === ACTIVITY_KIND.BUS;
                    const isHotel =
                        activityKind === ACTIVITY_KIND.HOTEL_CHECKIN ||
                        activityKind === ACTIVITY_KIND.HOTEL_CHECKOUT;
                    // Notes are timeless; flights and transit show their
                    // depart→arrival datetime; hotel check-in/out show a
                    // single time (the check-in or check-out time). Places
                    // use start/end as before.
                    // Flight schedule spans the FIRST segment's depart →
                    // LAST segment's arrival, regardless of how many
                    // stopovers in between.
                    const flightSegments = activity.flightSegments ?? [];
                    const firstSeg = flightSegments[0];
                    const lastSeg = flightSegments[flightSegments.length - 1];
                    const transitSegments = activity.transitSegments ?? [];
                    const firstTransit = transitSegments[0];
                    const lastTransit =
                        transitSegments[transitSegments.length - 1];
                    // `safeFormatTime` returns '' for missing / malformed
                    // HH:mm input — that keeps the activity card from
                    // surfacing moment's "Invalid date" placeholder when
                    // an upstream code path (notably the AI trip builder
                    // before bug fixes) leaks a non-HH:mm value into
                    // `activity.startTime`. The display joins the two
                    // ends with " - " only when both ends formatted to
                    // something visible; a one-sided time still renders
                    // (e.g. "9:00 AM").
                    const joinTimes = (a: string, b: string, sep: string): string => {
                        if (a && b) return `${a}${sep}${b}`;
                        return a || b;
                    };
                    let activityTime: string;
                    if (isFlight) {
                        activityTime = joinTimes(
                            safeFormatTime(firstSeg?.departTime),
                            safeFormatTime(lastSeg?.arrivalTime),
                            ' → '
                        );
                    } else if (isTransit) {
                        activityTime = joinTimes(
                            safeFormatTime(
                                firstTransit?.departTime ?? activity.startTime
                            ),
                            safeFormatTime(
                                lastTransit?.arrivalTime ?? activity.endTime
                            ),
                            ' → '
                        );
                    } else if (isHotel) {
                        activityTime = safeFormatTime(activity.startTime);
                    } else {
                        activityTime = joinTimes(
                            safeFormatTime(activity.startTime),
                            safeFormatTime(activity.endTime),
                            ' - '
                        );
                    }
                    // Hide the time row entirely when the activity has no
                    // valid time anchors AND isn't a flight (flights show
                    // the row even when times are TBD so the user has a
                    // visual placeholder to fill in).
                    const showTimeRow = !isNote && Boolean(activityTime);
                    const budgetEntries = activity.budget ?? [];
                    const hasBudget = budgetEntries.length > 0;
                    const isActivityCompleted = isCompletedStatus(activity.status);
                    // Per-activity edit lock. True when the trip is in view-mode
                    // OR this specific place is already Confirmed — locking
                    // edit, delete-by-edit, and AddBudget all at once. Also
                    // locked when the activity itself is Completed (post-
                    // confirmation tick): clicking edit on a done activity
                    // shouldn't reopen the modal.
                    const isPlaceLocked =
                        isViewMode ||
                        isConfirmedStatus(activity.status) ||
                        isActivityCompleted;
                    const hasImage = Boolean(activity.image?.url);
                    const TitleIcon = titleIconFor(activity);
                    // Icon for the location/meta row at the top of the
                    // activity body. For flights we swap the pin for a
                    // plane; for notes we use a note icon; otherwise
                    // the default location pin.
                    const LocationIcon = isFlight
                        ? FlightTakeoffOutlinedIcon
                        : isNote
                          ? NotesOutlinedIcon
                          : LocationOnOutlinedIcon;
                    // Cost + budget are coupled: a non-money activity (just
                    // a note like "checkout at 10am") shouldn't show either
                    // row. We surface them only when there's an actual cost
                    // to split (>0). Existing budget without a cost is still
                    // respected so legacy rows don't disappear.
                    const numericCost = Number(activity.cost);
                    const hasCost =
                        Number.isFinite(numericCost) && numericCost !== 0;
                    const showBudgetRow = hasBudget || hasCost;
                    const card = (
                        <Grid
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className={classNames(
                                'activity-content-trip border-trip',
                                {
                                    'is-completed': isActivityCompleted,
                                    'is-view-mode': isViewMode,
                                    [`kind-${activityKind}`]: true,
                                    [`is-time-${activityTiming}`]:
                                        activityTiming !== null,
                                }
                            )}
                            aria-disabled={isActivityCompleted || undefined}
                        >
                            {/* Live "happening now" stripe — grows along
                                the top edge of the card from 0 → 100% as
                                the activity's start→end window elapses.
                                When the activity has no endTime (hotel
                                check-in, note-like place), we still
                                render the stripe at full width with a
                                pulse so "currently happening" reads
                                visually — the bar just doesn't grow.
                                Past cards show the static dimmed
                                treatment; upcoming cards are unmarked. */}
                            {activityTiming === 'current' && (
                                <div
                                    className={classNames('activity-now-stripe', {
                                        'is-indeterminate':
                                            activityProgress === null,
                                    })}
                                    role="progressbar"
                                    aria-label="Currently happening"
                                    aria-valuenow={
                                        activityProgress !== null
                                            ? Math.round(activityProgress * 100)
                                            : undefined
                                    }
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div
                                        className="activity-now-stripe-fill"
                                        style={{
                                            width:
                                                activityProgress !== null
                                                    ? `${activityProgress * 100}%`
                                                    : '100%',
                                        }}
                                    />
                                </div>
                            )}
                            {isTripConfirmed ? (
                                // Trip is past planning — replace the X
                                // delete with a tick toggle. Outlined tick
                                // when the activity is still actionable;
                                // filled tick when it's already completed.
                                // Clicking the filled tick reverts the
                                // activity back to Confirmed so the user
                                // can undo an accidental check.
                                //
                                // GUARD: disable the tick until the
                                // tripStatuses lookup has resolved the
                                // real UUIDs. Otherwise the save sends
                                // `tripStatusId: null` (the cold-cache
                                // fallback `{ id: 0, … }` doesn't resolve
                                // by name when the lookup itself is
                                // empty), and the post-save refetch
                                // reverts the activity to Planning — the
                                // "checkmark flicks but doesn't update"
                                // bug reported on mobile cold loads.
                                isActivityCompleted ? (
                                    (() => {
                                        // Once the activity's own time
                                        // window is in the past, the tick
                                        // locks in place — un-checking a
                                        // by-then-elapsed activity is
                                        // never the right outcome and
                                        // racks up notification spam if
                                        // accidental. Tick remains
                                        // visible for the visual cue.
                                        const isPastLocked =
                                            activityTiming === 'past';
                                        return (
                                            <IconButton
                                                size="small"
                                                className={classNames(
                                                    'activity-card-complete-btn is-checked',
                                                    { 'is-past-locked': isPastLocked }
                                                )}
                                                aria-label={
                                                    isPastLocked
                                                        ? `${activity.name} is locked — its time has passed`
                                                        : `Uncheck ${activity.name} (reverts to Confirmed)`
                                                }
                                                title={
                                                    isPastLocked
                                                        ? 'This activity has already passed and is locked'
                                                        : confirmedStatus.id === 0
                                                            ? 'Loading status options…'
                                                            : 'Uncheck — reverts to Confirmed'
                                                }
                                                disabled={
                                                    isPastLocked ||
                                                    confirmedStatus.id === 0
                                                }
                                                onClick={() =>
                                                    onChangePlace('edit', {
                                                        index: indx,
                                                        value: {
                                                            id: activity.id,
                                                            status: confirmedStatus,
                                                        },
                                                    })
                                                }
                                            >
                                                <CheckCircleRoundedIcon fontSize="small" />
                                            </IconButton>
                                        );
                                    })()
                                ) : (
                                    <IconButton
                                        size="small"
                                        className="activity-card-complete-btn"
                                        aria-label={`Mark ${activity.name} as completed`}
                                        title={
                                            completedStatus.id === 0
                                                ? 'Loading status options…'
                                                : 'Mark as completed'
                                        }
                                        disabled={completedStatus.id === 0}
                                        onClick={() =>
                                            onChangePlace('edit', {
                                                index: indx,
                                                value: {
                                                    id: activity.id,
                                                    status: completedStatus,
                                                },
                                            })
                                        }
                                    >
                                        <TaskAltRoundedIcon fontSize="small" />
                                    </IconButton>
                                )
                            ) : (
                                <IconConfirmButton
                                    icon={<CloseRoundedIcon fontSize="small" />}
                                    ariaLabel={`Delete ${activity.name}`}
                                    title="Delete this activity"
                                    onConfirm={() =>
                                        onChangePlace('delete', activity.id)
                                    }
                                    className="activity-card-close-btn"
                                    isViewMode={
                                        isViewMode || isActivityCompleted
                                    }
                                >
                                    You are about to delete {activity.name}. Are
                                    you sure?
                                </IconConfirmButton>
                            )}
                            <Grid container>
                                {hasImage && (
                                    <Grid item lg={2} md={2} xs={12} className="content-image">
                                        <ImageBlock image={activity.image} />
                                    </Grid>
                                )}
                                <Grid
                                    item
                                    lg={hasImage ? 10 : 12}
                                    md={hasImage ? 10 : 12}
                                    xs={12}
                                    className="content-detail"
                                >
                                    <Grid container>
                                        <Grid item lg={12} md={12} xs={12} className="info">
                                            <div className="activity-title-row">
                                                {TitleIcon && (
                                                    <TitleIcon className="activity-title-icon" />
                                                )}
                                                {tripId && activityKind === ACTIVITY_KIND.PLACE ? (
                                                    <a
                                                        className="title title-link"
                                                        // `q=<name>&i=0` matches the rest of the
                                                        // app's /place URL convention (Saved,
                                                        // Visited, NearbyGrid, PlaceResultCard).
                                                        // Verbose `name,city,country` queries
                                                        // 500'd /place-details on places whose
                                                        // ISO country name carries parenthetical
                                                        // suffixes. The location subtitle below
                                                        // already shows city/country to the user.
                                                        href={`/place?q=${encodeURIComponent(
                                                            activity.name
                                                        )}&i=0&id=${tripId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={`Open ${activity.name} details in a new tab`}
                                                    >
                                                        <span className="title-link-text">
                                                            {activity.name}
                                                        </span>
                                                        <OpenInNewRoundedIcon
                                                            className="title-link-icon"
                                                            fontSize="small"
                                                            aria-hidden="true"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="title">{activity.name}</span>
                                                )}
                                                <AddPlaceBtn
                                                    isViewMode={isPlaceLocked}
                                                    type="edit"
                                                    data={activity}
                                                    countryScope={country}
                                                    triggerIcon={EditRoundedIcon}
                                                    triggerClassName="activity-edit-btn"
                                                    defaultDate={date}
                                                    onChange={(e) =>
                                                        onChangePlace('edit', {
                                                            index: indx,
                                                            value: e,
                                                        })
                                                    }
                                                />
                                                {/* Status pill is hidden once the trip is past
                                                    Planning — no purpose toggling an
                                                    activity's "Confirmed" once the whole
                                                    trip is locked. */}
                                                {!isTripConfirmed && (() => {
                                                    const confirmed = isConfirmedStatus(activity.status);
                                                    const nextStatus = confirmed
                                                        ? plannedStatus
                                                        : confirmedStatus;
                                                    return (
                                                        <button
                                                            type="button"
                                                            className={
                                                                'status-toggle ' +
                                                                (confirmed ? 'is-confirmed' : 'is-pending')
                                                            }
                                                            disabled={isViewMode || lockActivityStatus}
                                                            aria-label={`Status: ${confirmed ? 'Confirmed' : 'Planning'}. Click to toggle.`}
                                                            onClick={() =>
                                                                onChangePlace('edit', {
                                                                    index: indx,
                                                                    value: {
                                                                        id: activity.id,
                                                                        status: nextStatus,
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            {confirmed ? 'Confirmed' : 'Planning'}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            <div className="activity-meta">
                                                {(() => {
                                                    // AI-built activities frequently leave the
                                                    // free-text `location` blank but still carry
                                                    // structured `placeCity` / `placeCountry` /
                                                    // lat-lng from the prompt's required place
                                                    // fields. Fall back through those so the
                                                    // meta-row + directions icon both render for
                                                    // AI activities — not just user-entered ones.
                                                    const displayLocation =
                                                        activity.location ||
                                                        [activity.placeCity, activity.placeCountry]
                                                            .filter(Boolean)
                                                            .join(', ');
                                                    if (!displayLocation) return null;
                                                    const hasCoords =
                                                        activity.latitude != null &&
                                                        activity.longitude != null;
                                                    const mapsDestination = hasCoords
                                                        ? `${activity.latitude},${activity.longitude}`
                                                        : [activity.name, displayLocation]
                                                              .filter(Boolean)
                                                              .join(', ');
                                                    return (
                                                        <div className="meta-row">
                                                            <LocationIcon className="meta-icon" />
                                                            <span className="meta-text location">
                                                                {displayLocation}
                                                            </span>
                                                            <IconButton
                                                                size="small"
                                                                className="meta-directions-btn"
                                                                component="a"
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDestination)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                aria-label="Get directions on Google Maps"
                                                                title="Get directions"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <DirectionsRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </div>
                                                    );
                                                })()}
                                                {isFlight &&
                                                    flightSegments.map((seg, segIdx) => {
                                                        if (!seg.flightNumber) return null;
                                                        const route =
                                                            seg.departAirport && seg.arrivalAirport
                                                                ? `${seg.departAirport} → ${seg.arrivalAirport}`
                                                                : '';
                                                        return (
                                                            <div
                                                                key={segIdx}
                                                                className="meta-row"
                                                            >
                                                                <NotesOutlinedIcon className="meta-icon" />
                                                                <span className="meta-text flight-number">
                                                                    {`Flight ${seg.flightNumber}`}
                                                                    {route && (
                                                                        <span className="flight-segment-route">
                                                                            {` · ${route}`}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                {showTimeRow && (
                                                    <div className="meta-row">
                                                        <ScheduleOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">{activityTime}</span>
                                                    </div>
                                                )}
                                                {hasCost && (
                                                    <div className="meta-row">
                                                        <PaymentsOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">
                                                            {convertMoney(activity.cost)}
                                                        </span>
                                                    </div>
                                                )}
                                                {showBudgetRow && (
                                                    <div
                                                        className={classNames(
                                                            'meta-row meta-row-budget',
                                                            { 'meta-row-budget-empty': !hasBudget }
                                                        )}
                                                    >
                                                        <GroupOutlinedIcon className="meta-icon" />
                                                        {hasBudget && (
                                                            <div className="budget-chips">
                                                                {budgetEntries.map((item) => (
                                                                    <span
                                                                        key={item.id}
                                                                        className="budget-chip"
                                                                    >
                                                                        <span className="budget-chip-name">
                                                                            {item.user.label}
                                                                        </span>
                                                                        <span className="budget-chip-amount">
                                                                            {convertMoney(item.budget)}
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <AddBudget
                                                            isViewMode={isPlaceLocked}
                                                            budget={activity.budget}
                                                            cost={activity.cost}
                                                            onSubmit={(e) =>
                                                                onChangeBudget('add', {
                                                                    activityId: activity.id,
                                                                    value: e,
                                                                })
                                                            }
                                                            participants={participants}
                                                        />
                                                    </div>
                                                )}
                                                {activity.note && (
                                                    <div className="meta-row meta-row-note">
                                                        <NotesOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">
                                                            {activity.note}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                    return (
                        <div
                            key={`activity-${activity.id}`}
                            className="activity-card-slot"
                        >
                            <DraggableActivity
                                activityId={activity.id}
                                destIdx={destIdx}
                                date={date}
                                disabled={!dndEnabled || isPlaceLocked}
                            >
                                {card}
                            </DraggableActivity>
                        </div>
                    );
                })}
            </SortableContext>
            <Grid item lg={12} className="content-trip">
                <Grid container>
                    <Grid
                        item
                        lg={12}
                        className="add-place-item"
                        data-tour="trip-add-activity"
                    >
                        <AddPlaceBtn
                            isViewMode={isViewMode}
                            tripTypeId={tripTypeId}
                            countryScope={country}
                            defaultDate={date}
                            onChange={(e) => onChangePlace('add', e)}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default Activities;
