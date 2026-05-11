import React, { useMemo } from 'react';
import { Grid } from '@mui/material';
import moment from 'moment';
import _ from 'lodash';
import MultipleTrips from 'components/DestinationDetail/Multiple';
import SingleTrips from 'components/DestinationDetail/Single';
import { isSingleTrip } from 'utils';
import './index.css';
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
}: DateBlockProps) => {
    const showsRange = useMemo(
        () => !moment(startDate).isSame(endDate, 'day'),
        [startDate, endDate]
    );

    const isSingle = isSingleTrip(typeId);

    const trips: Activity[] | Destination[] | null = useMemo(() => {
        if (isSingle) {
            const itinerary = _.get(destinations, '0.itinerary');
            const matchingDay = itinerary
                ? itinerary.filter((day: { date?: string }) =>
                      moment(startDate).isSame(moment(day?.date), 'day')
                  )
                : [];
            return matchingDay.length ? matchingDay[0].activities : null;
        }

        const matchingDest = destinations.length
            ? destinations.filter((d) =>
                  moment(startDate).isSame(moment(d?.startDate), 'day')
              )
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
                            <span className="title">{moment(startDate).format('LL')} </span>
                            {showsRange && (
                                <span className="title">
                                    &#45;&nbsp;&nbsp;{moment(endDate).format('LL')}{' '}
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
                            />
                        ) : (
                            <MultipleTrips
                                defaultDate={startDate}
                                isViewMode={isViewMode}
                                trips={trips as Destination[] | null}
                                tripMaxDate={tripMaxDate}
                                onChangePlace={onChangePlace}
                                onChangeDestination={onChangeDestination}
                                participants={participants}
                                onChangeBudget={onChangeBudget}
                            />
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default DateBlock;
