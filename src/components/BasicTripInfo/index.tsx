import { useMemo } from 'react';
import './index.css';
import moment from 'moment';
import _ from 'lodash';
import { Grid } from '@mui/material';
import { convertMoney } from 'utils';
import Status from 'components/common/Status';
import type { TripState } from 'types/trip';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    isViewMode?: boolean;
}

export const BasicTripInfo = ({
    data,
    onChangeStep,
    isViewMode = false,
}: BasicTripInfoProps) => {
    const tripDate = useMemo(() => {
        const date1 = moment(data.startDate).format('MMMM Do YYYY').toString();
        const date2 = moment(data.endDate).format('MMMM Do YYYY').toString();
        return `From ${date1} to ${date2}`;
    }, [data]);

    const organizer = useMemo(
        () => (data.organizer ?? []).map((item) => item.label).join(', '),
        [data]
    );

    return (
        <Grid container className="basic-trip-info">
            <Grid item lg={10} md={10} xs={12}>
                <Grid container>
                    <Grid item lg={12} md={12} xs={12} className="item title">
                        <div className="data">
                            Trip Information
                            <span className="type">({_.get(data, 'type.name')})</span>
                        </div>
                    </Grid>
                    <Grid
                        className="status"
                        item
                        lg={12}
                        md={12}
                        xs={12}
                        sx={{ display: { xs: 'flex', lg: 'none', md: 'none' } }}
                    >
                        <Status data={data.status} onClick={() => onChangeStep(0)} />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="item name">
                        <div className="label">Name for trip:</div>
                        <div className="data">{data.name}</div>
                    </Grid>
                    <Grid item lg={6} md={6} xs={12}>
                        <Grid container>
                            <Grid item lg={12} md={12} xs={12} className="item">
                                <div className="label">Organizer:</div>
                                <div className="data">{organizer}</div>
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="item">
                                <div className="label">When?:</div>
                                <div className="data">{tripDate}</div>
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="item">
                                <div className="label">How much?:</div>
                                <div className="data">{convertMoney(data.budget)}</div>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item lg={6} md={6} xs={12} className="item">
                        <div className="label">Who is Going?:</div>
                        <div className="data">
                            <ul>
                                {data.friends &&
                                    data.friends.map((item, indx) => (
                                        <li key={indx}>{item.label}</li>
                                    ))}
                            </ul>
                        </div>
                    </Grid>
                </Grid>
            </Grid>
            <Grid
                item
                lg={2}
                md={2}
                xs={12}
                className="status"
                sx={{ display: { xs: 'none', lg: 'flex', md: 'flex' } }}
            >
                <Status data={data.status} isViewMode={isViewMode} onClick={() => onChangeStep(0)} />
            </Grid>
        </Grid>
    );
};

export default BasicTripInfo;
