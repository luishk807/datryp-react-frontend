import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import _ from 'lodash';
import classnames from 'classnames';
import MultipleTrips from 'components/DestinationDetail/Multiple';
import SingleTrips from 'components/DestinationDetail/Single';
import { formatDate, isSameDay, isSingleTrip } from 'utils';
import './index.scss';
import { TRIP_STATUS } from 'constants';
import type { ActionType, Activity, Destination, Friend } from 'types';

interface DateBlockProps {
    startDate: string;
    endDate: string;
    tripMaxDate?: string | null;
    destinations?: Destination[];
    participants?: Friend[];
    index?: number;
    typeId?: number;
    onChangeBudget: (type: ActionType, value: any, destinationIndx?: number) => void;
    onChangePlace: (type: ActionType, value: any) => void;
    onChangeDestination?: (type: ActionType, value: any) => void;
    isViewMode?: boolean;
    /** Disable the per-activity status pill (new-trip flow only). */
    lockActivityStatus?: boolean;
    /** Opt-in override for the status pill — forwarded unchanged. */
    allowStatusToggle?: boolean;
    /** Forwarded to Activities so post-planning UI (Complete button,
     *  hidden status pill, dim-when-completed cards) can light up. */
    tripStatusName?: string;
}

const DateBlock = ({
    startDate,
    endDate,
    tripMaxDate,
    destinations = [],
    participants = [],
    index = 0,
    typeId,
    onChangeBudget,
    onChangePlace,
    onChangeDestination,
    isViewMode = false,
    lockActivityStatus = false,
    allowStatusToggle,
    tripStatusName,
}: DateBlockProps) => {
    const showsRange = useMemo(
        () => !isSameDay(startDate, endDate),
        [startDate, endDate]
    );

    const isSingle = isSingleTrip(typeId);

    const trips: Activity[] | Destination[] | null = useMemo(() => {
        if (isSingle) {
            const itinerary = _.get(destinations, '0.itinerary');
            const matchingDay = itinerary
                ? itinerary.filter((day: { date?: string }) =>
                      isSameDay(startDate, day?.date)
                  )
                : [];
            return matchingDay.length ? matchingDay[0].activities : null;
        }

        const matchingDest = destinations.length
            ? destinations.filter((d) => isSameDay(startDate, d?.startDate))
            : [];
        return matchingDest.length ? matchingDest : null;
    }, [destinations, startDate, isSingle]);

    // Confirmed trips trim empty day blocks from the timeline. The user
    // opted in via the Planning → Confirmed flow (gated by the empty-days
    // warning modal in TripStatusBadge); flipping back to Planning brings
    // the empty blocks back automatically. View-mode (read-only renders
    // on /trip-detail) retains the original "hide empties" behavior so
    // shared / printed trips stay tidy regardless of status.
    const isConfirmed = tripStatusName === TRIP_STATUS.CONFIRMED;
    const hideWhenEmpty = isViewMode || isConfirmed;
    const hideEmpty = useMemo(() => {
        if (!hideWhenEmpty) return false;
        if (!trips) return true;
        if (isSingle) {
            return (trips as Activity[]).length === 0;
        }
        return false;
    }, [hideWhenEmpty, trips, isSingle]);

    if (hideEmpty) return null;

    // Status-driven theme class. The dot + content-tint pick their
    // color from this so the timeline reads at a glance — soft orange
    // while still in Planning, brand green once Confirmed, and a quiet
    // gray once the trip is Completed. Cancelled uses the same gray
    // treatment so the dead-trip case doesn't fight for attention.
    // TRIP_STATUS values are TitleCase ("Planning", "Confirmed", …) —
    // don't lowercase before comparing, otherwise every branch misses
    // and we silently default to Confirmed.
    const statusClass = (() => {
        const name = tripStatusName ?? '';
        if (name === TRIP_STATUS.PLANNING) return 'status-planning';
        if (name === TRIP_STATUS.CONFIRMED) return 'status-confirmed';
        if (name === TRIP_STATUS.COMPLETED) return 'status-completed';
        if (name === TRIP_STATUS.CANCELLED) return 'status-cancelled';
        return 'status-confirmed';
    })();

    return (
        <Grid item key={`destination-${index}`} lg={12} md={12} xs={12} className={classnames('date-block', statusClass)}>
            <Grid container>
                <Grid
                    item
                    lg={12}
                    md={12}
                    xs={12}
                    className="header"
                    data-tour={index === 0 ? 'trip-day-header' : undefined}
                >
                    <Grid container>
                        <Grid item className="icon">
                            <span className="dot"></span>
                        </Grid>
                        <Grid item className="title">
                            <span className="title">{formatDate(startDate, 'LL')} </span>
                            {showsRange && (
                                <span className="title">
                                    &#45;&nbsp;&nbsp;{formatDate(endDate, 'LL')}{' '}
                                </span>
                            )}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} xs={12} className="content item-border">
                    <Grid container>
                        {isSingle ? (
                            <SingleTrips
                                isViewMode={isViewMode}
                                onChangePlace={onChangePlace}
                                participants={participants}
                                onChangeBudget={onChangeBudget}
                                trips={trips as Activity[] | null}
                                destinations={destinations}
                                date={startDate}
                                country={destinations[0]?.country?.name ?? ''}
                                lockActivityStatus={lockActivityStatus}
                                allowStatusToggle={allowStatusToggle}
                                tripStatusName={tripStatusName}
                            />
                        ) : (
                            <MultipleTrips
                                defaultDate={startDate}
                                isViewMode={isViewMode}
                                trips={trips as Destination[] | null}
                                allDestinations={destinations}
                                tripMaxDate={tripMaxDate}
                                onChangePlace={onChangePlace}
                                onChangeDestination={onChangeDestination}
                                participants={participants}
                                onChangeBudget={onChangeBudget}
                                lockActivityStatus={lockActivityStatus}
                                allowStatusToggle={allowStatusToggle}
                                tripStatusName={tripStatusName}
                            />
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default DateBlock;
