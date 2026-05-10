import { useEffect, useState, useMemo } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import DestinationDetail from 'components/DestinationDetail';
import _ from 'lodash';
import { multiTripDetailobj2 } from 'sample/tripData';
import type { Friend, TripState } from 'types/trip';

export const TripDetail = () => {
    const [tripData, setTripData] = useState<TripState | null>(null);

    const handleChangeStep = () => {};

    const participants = useMemo<Friend[]>(() => {
        const sample = multiTripDetailobj2 as unknown as TripState;
        const friends = sample.friends ?? [];
        const organizer = sample.organizer ?? [];
        const merged: Friend[] = [...friends, ...organizer];

        const unique: Friend[] = [];
        merged.forEach((entry) => {
            if (!unique.find((u) => u.id === entry.id)) {
                unique.push(entry);
            }
        });
        return unique;
    }, []);

    const destinations = useMemo(() => {
        return _.get(multiTripDetailobj2, 'destinations');
    }, []);

    useEffect(() => {
        setTripData(multiTripDetailobj2 as unknown as TripState);
    }, []);

    if (!tripData) return null;

    return (
        <Layout title="Trip Detail">
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <BasicTripInfo
                        isViewMode={true}
                        data={tripData}
                        onChangeStep={handleChangeStep}
                    />
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <BudgetSummary data={tripData} />
                </Grid>
                <Grid item lg={12}>
                    <DestinationDetail
                        type={tripData.type}
                        isViewMode={true}
                        startDate={tripData.startDate}
                        participants={participants}
                        endDate={tripData.endDate}
                        destinations={destinations}
                        onChangePlace={() => {}}
                        onChangeBudget={() => {}}
                    />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default TripDetail;
