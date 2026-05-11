import { useEffect, useState } from 'react';
import moment from 'moment';
import { Grid } from '@mui/material';
import _ from 'lodash';
import './index.css';
import DateBlock from './DateBlock';
import type {
    ActionType,
    Destination,
    Friend,
    TripBasicType,
} from 'types/trip.types';

interface DateRange {
    startDate: string;
    endDate: string;
}

interface ActivityPayload {
    type: ActionType;
    value: any;
    index?: number;
    destinationIndx?: number | null;
}

interface PlaceEvent {
    date: string;
    activity: ActivityPayload;
}

interface DestinationEvent {
    startDate: string;
    endDate: string;
    activity: ActivityPayload;
    removeIndexes?: number[];
}

interface DestinationDetailProps {
    destinations?: Destination[];
    type?: TripBasicType;
    startDate?: string | null;
    endDate?: string | null;
    participants?: Friend[];
    onChangeBudget: (event: PlaceEvent) => void;
    onChangePlace: (event: PlaceEvent) => void;
    onChangeDestination?: (event: DestinationEvent) => void;
    isViewMode?: boolean;
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
}: DestinationDetailProps) => {
    const [dates, setDates] = useState<DateRange[]>([]);

    useEffect(() => {
        setDates(computeDatesRange(startDate, endDate, destinations));
    }, [startDate, endDate, destinations]);

    const handleChangeDestination = (obj: DestinationEvent) => {
        const ignoreId = _.get(obj, 'activity.value.id');
        const { startDate: flagStart, endDate: flagEnd } = obj;

        const indxList: number[] = [];
        for (let i = 0; i < destinations.length; i++) {
            const dest = destinations[i];
            const startsInRange =
                moment(dest.startDate).isAfter(flagStart) ||
                moment(dest.startDate).isSame(flagStart, 'day');
            const endsInRange =
                moment(dest.endDate).isBefore(flagEnd) ||
                moment(dest.endDate).isSame(flagEnd, 'day');
            if (ignoreId !== dest.id && startsInRange && endsInRange) {
                indxList.push(dest.id);
            }
        }

        onChangeDestination?.({ ...obj, removeIndexes: indxList });
    };

    const handleChangePlace = (obj: PlaceEvent) => {
        const { activity, date } = obj;
        let destIndx: number | null = null;
        for (let i = 0; i < destinations.length; i++) {
            if (moment(destinations[i].startDate).isSame(date, 'day')) {
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
        <Grid container>
            {dates.map((date, indx) => {
                const dateStr = moment(date.startDate).format('YYYY-MM-DD').toString();
                return (
                    <DateBlock
                        isViewMode={isViewMode}
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
                                endDate: moment(value?.flightInfo?.arrivalDate).format('YYYY-MM-DD').toString(),
                            })
                        }
                    />
                );
            })}
        </Grid>
    );
};

export default DestinationDetail;
