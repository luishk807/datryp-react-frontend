import { useEffect, useState } from 'react';
import moment from 'moment'; // computeDatesRange iterates moment objects directly (clone/add/isAfter/isBefore); kept on raw moment
import { Grid, Snackbar } from '@mui/material';
import _ from 'lodash';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { formatDate, isAfter, isBefore, isSameDay } from 'utils';
import { ACTIVITY_KIND } from 'constants';
import {
    movePlace as movePlaceAction,
    useTripDispatch,
} from 'context/TripContext';
import './index.scss';
import DateBlock from './DateBlock';
import type {
    ActionType,
    Activity,
    Destination,
    Friend,
    TripBasicType,
    TripDestinationEvent,
    TripPlaceEvent,
} from 'types';

interface DateRange {
    startDate: string;
    endDate: string;
}

/** Derive a destination's end date from its transport. A FLIGHT lives in the
 *  destination header (`flightInfo`), so prefer its last segment's arrival
 *  (then its flat `arrivalDate`) first. Fall back to a legacy/ground transport
 *  activity's last-segment arrival, then to the destination's start date. */
const deriveDestinationEndDate = (
    value: Destination | undefined,
    startDate: string,
): string => {
    const flightInfo = value?.flightInfo;
    const headerArrival =
        flightInfo?.segments?.slice(-1)[0]?.arrivalDate ??
        flightInfo?.arrivalDate;
    if (headerArrival) return formatDate(headerArrival);

    const activities = value?.itinerary?.[0]?.activities ?? [];

    const flight = activities.find(
        (a) => a.kind === ACTIVITY_KIND.FLIGHT && a.flightSegments?.length,
    );
    const flightArrival = flight?.flightSegments?.slice(-1)[0]?.arrivalDate;
    if (flightArrival) return formatDate(flightArrival);

    const transit = activities.find(
        (a) =>
            (a.kind === ACTIVITY_KIND.TRAIN ||
                a.kind === ACTIVITY_KIND.BUS ||
                a.kind === ACTIVITY_KIND.RENTAL_CAR) &&
            a.transitSegments?.length,
    );
    const transitArrival = transit?.transitSegments?.slice(-1)[0]?.arrivalDate;
    if (transitArrival) return formatDate(transitArrival);

    return startDate;
};

interface DestinationDetailProps {
    destinations?: Destination[];
    type?: TripBasicType;
    startDate?: string | null;
    endDate?: string | null;
    participants?: Friend[];
    onChangeBudget: (event: TripPlaceEvent) => void;
    onChangePlace: (event: TripPlaceEvent) => void;
    onChangeDestination?: (event: TripDestinationEvent) => void;
    isViewMode?: boolean;
    /** Disable the per-activity status pill (new-trip flow only). */
    lockActivityStatus?: boolean;
    /** Opt-in override for the per-activity status pill — forwarded
     *  unchanged to Activities. Set on /trip-detail so the
     *  Planning↔Confirmed quick-toggle is live without first dropping
     *  into the stepper editor. */
    allowStatusToggle?: boolean;
    /** Opt-in override for Mark-as-paid / edit-paid — forwarded to
     *  Activities. Same pattern: set on /trip-detail for organizers
     *  so they can settle payments without entering the stepper. */
    allowPaidEdits?: boolean;
    /** Current trip status name (e.g. "confirmed", "completed"). Drives
     *  the activity card's post-planning UI: when the trip is Confirmed
     *  each activity gets a "Complete" button in place of delete and
     *  the per-activity status pill is hidden. */
    tripStatusName?: string;
    /** True while the parent's auto-save mutation is in flight.
     *  Forwarded down to Activities so the one-tap status pill
     *  disables itself for the round-trip — prevents the user from
     *  firing a second click that would hit the in-flight guard
     *  and surface the "Still saving" toast. */
    isAutoSaving?: boolean;
}

const fmt = (m: moment.Moment) => m.format('MM/DD/YYYY');

const computeDatesRange = (
    startDate?: string | null,
    endDate?: string | null,
    destinations: Destination[] = []
): DateRange[] => {
    const date1 = moment(startDate);
    const date2 = moment(endDate);
    if (!date1.isValid() || !date2.isValid()) return [];

    if (date1.isSame(date2, 'day')) {
        return [{ startDate: fmt(date1), endDate: fmt(date1) }];
    }

    let date = date1.clone();
    const dateArry: DateRange[] = [{ startDate: fmt(date), endDate: fmt(date) }];
    let flagDate: moment.MomentInput = null;
    let destinationDateFlag: moment.MomentInput = null;

    do {
        if (!flagDate) {
            const tripData = destinations.filter((item) =>
                moment(item.startDate).isSame(date, 'day')
            );
            destinationDateFlag = _.get(tripData, '0.startDate') ?? null;
            const destinationDateEnd = _.get(tripData, '0.endDate') ?? null;
            if (
                destinationDateFlag &&
                !moment(destinationDateFlag).isSame(destinationDateEnd, 'day')
            ) {
                flagDate = destinationDateEnd;
            }
        }

        date = date.clone().add(1, 'day');

        if (flagDate) {
            dateArry.forEach((item) => {
                if (moment(item.startDate).isSame(destinationDateFlag, 'day')) {
                    item.endDate = moment(flagDate).format('MM/DD/YYYY');
                }
            });
            if (date.isAfter(flagDate)) {
                dateArry.push({ startDate: fmt(date), endDate: fmt(date) });
                flagDate = null;
            }
        } else {
            dateArry.push({ startDate: fmt(date), endDate: fmt(date) });
        }
    } while (date.isBefore(date2));

    return dateArry;
};

const DestinationDetail = ({
    destinations = [],
    type = undefined,
    startDate = null,
    endDate = null,
    participants = [],
    onChangeBudget,
    onChangePlace,
    onChangeDestination = undefined,
    isViewMode = false,
    lockActivityStatus = false,
    allowStatusToggle,
    allowPaidEdits,
    isAutoSaving = false,
    tripStatusName,
}: DestinationDetailProps) => {
    const [dates, setDates] = useState<DateRange[]>([]);
    const [dndError, setDndError] = useState<string | null>(null);
    const dispatch = useTripDispatch();

    useEffect(() => {
        setDates(computeDatesRange(startDate, endDate, destinations));
    }, [startDate, endDate, destinations]);

    // Split sensors so desktop and mobile both feel right:
    //   - MouseSensor: 8px distance threshold so clicks on edit/X buttons
    //     inside a card aren't hijacked as drags.
    //   - TouchSensor: 200ms press-and-hold delay with a 5px tolerance so a
    //     casual swipe scrolls the page (cancelling the pending drag), and
    //     only a deliberate long-press picks up the activity card.
    //   - KeyboardSensor: arrow-key reordering for accessibility.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /** Locate the source destination for a dragged activity by scanning the
     *  whole tree. Activity ids are unique within a trip. */
    const findSourceDest = (
        activityId: number
    ): { destIdx: number; activity: Activity } | null => {
        for (let i = 0; i < destinations.length; i++) {
            const itin = destinations[i]?.itinerary;
            if (!itin) continue;
            for (const day of itin) {
                const found = day.activities.find((a) => a.id === activityId);
                if (found) return { destIdx: i, activity: found };
            }
        }
        return null;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (isViewMode) return;
        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;
        if (!activeData || activeData.type !== 'activity') return;

        const activityId = Number(activeData.activityId);
        if (!Number.isFinite(activityId)) return;

        // Resolve target destIdx + date from either a day-droppable or
        // another activity card (sortable items report their own id when
        // hovered, the wrapping container reports day-... when not).
        let toDestIdx: number | undefined;
        let toDate: string | undefined;
        if (overData?.type === 'day') {
            toDestIdx = Number(overData.destIdx);
            toDate = String(overData.date ?? '');
        } else if (overData?.type === 'activity') {
            toDestIdx = Number(overData.destIdx);
            toDate = String(overData.date ?? '');
        }
        if (toDate === undefined || toDestIdx === undefined || !toDate) return;

        const source = findSourceDest(activityId);
        if (!source) return;

        // Cross-destination guard: target date must fall within target
        // destination's start..end range. Snap back with a toast otherwise.
        if (source.destIdx !== toDestIdx) {
            const toDest = destinations[toDestIdx];
            const start = toDest?.startDate;
            const end = toDest?.endDate;
            const inRange =
                !!start &&
                !!end &&
                !isBefore(toDate, start) &&
                !isAfter(toDate, end);
            if (!inRange) {
                setDndError(
                    `${toDest?.country?.name ?? 'That destination'} doesn't cover ${formatDate(toDate, 'MMM D')}.`
                );
                return;
            }
        }

        // No-op if dropped back exactly where it came from.
        const fromDay = destinations[source.destIdx]?.itinerary?.find((d) =>
            d.activities.some((a) => a.id === activityId)
        );
        if (
            source.destIdx === toDestIdx &&
            fromDay &&
            isSameDay(fromDay.date, toDate)
        ) {
            return;
        }

        dispatch(
            movePlaceAction({
                activityId,
                fromDestIndx: source.destIdx,
                toDestIndx: toDestIdx,
                toDate,
            })
        );
    };

    const handleChangeDestination = (obj: TripDestinationEvent) => {
        const ignoreId = _.get(obj, 'activity.value.id');
        const { startDate: flagStart, endDate: flagEnd } = obj;

        const indxList: number[] = [];
        for (let i = 0; i < destinations.length; i++) {
            const dest = destinations[i];
            const startsInRange =
                isAfter(dest.startDate, flagStart) ||
                isSameDay(dest.startDate, flagStart);
            const endsInRange =
                isBefore(dest.endDate, flagEnd) ||
                isSameDay(dest.endDate, flagEnd);
            if (ignoreId !== dest.id && startsInRange && endsInRange) {
                indxList.push(dest.id);
            }
        }

        onChangeDestination?.({ ...obj, removeIndexes: indxList });
    };

    const handleChangePlace = (obj: TripPlaceEvent) => {
        const { activity, date } = obj;
        let destIndx: number | null = null;
        for (let i = 0; i < destinations.length; i++) {
            if (isSameDay(destinations[i].startDate, date)) {
                destIndx = i;
                break;
            }
        }

        onChangePlace?.({
            activity: {
                destinationIndx: destIndx,
                index: 0,
                ...activity,
            },
            date,
        });
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <Grid container>
                {dates.map((date, indx) => {
                const dateStr = formatDate(date.startDate);
                return (
                    <DateBlock
                        isViewMode={isViewMode}
                        lockActivityStatus={lockActivityStatus}
                        allowStatusToggle={allowStatusToggle}
                        allowPaidEdits={allowPaidEdits}
                        isAutoSaving={isAutoSaving}
                        tripStatusName={tripStatusName}
                        key={indx}
                        index={indx}
                        tripMaxDate={endDate}
                        participants={participants}
                        typeId={type?.id}
                        startDate={date.startDate}
                        endDate={date.endDate}
                        destinations={destinations}
                        onChangeBudget={(type: ActionType, value: any, destinationIndx?: number) =>
                            onChangeBudget({
                                activity: { type, value, index: indx, destinationIndx },
                                date: dateStr,
                            })
                        }
                        onChangePlace={(type: ActionType, value: any) =>
                            handleChangePlace({
                                activity: { type, value },
                                date: dateStr,
                            })
                        }
                        onChangeDestination={(type: ActionType, value: any) =>
                            handleChangeDestination({
                                activity: { type, value, index: indx },
                                startDate: dateStr,
                                endDate: deriveDestinationEndDate(
                                    value,
                                    dateStr,
                                ),
                            })
                        }
                    />
                );
            })}
            </Grid>
            <Snackbar
                open={Boolean(dndError)}
                onClose={() => setDndError(null)}
                autoHideDuration={2400}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={dndError}
            />
        </DndContext>
    );
};

export default DestinationDetail;
