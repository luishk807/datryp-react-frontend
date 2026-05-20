import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import _ from 'lodash';
import MultipleTrips from 'components/DestinationDetail/Multiple';
import SingleTrips from 'components/DestinationDetail/Single';
import { formatDate, isSameDay, isSingleTrip } from 'utils';
import './index.scss';
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

    const hideEmpty = useMemo(() => {
        if (!isViewMode) return false;
        if (!trips) return true;
        if (isSingle) {
            return (trips as Activity[]).length === 0;
        }
        return false;
    }, [isViewMode, trips, isSingle]);

    if (hideEmpty) return null;

    return (
        <Grid item key={`destination-${index}`} lg={12} md={12} xs={12} className="date-block">
            <Grid container>
                <Grid item lg={12} md={12} xs={12} className="header">
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
                                date={startDate}
                                country={destinations[0]?.country?.name ?? ''}
                                lockActivityStatus={lockActivityStatus}
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
