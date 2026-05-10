import React, { useEffect, useState, useMemo } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import BasicTripInfo from 'components/BasicTripInfo';
import DestinationDetail from 'components/DestinationDetail';
import _ from 'lodash';

import { multiTripDetailobj2 } from 'sample/tripData';

export const TripDetail = () => {
    const [tripData, setTripData] = useState(null);

    const handleChangeStep = () => {
        console.log('fff');
    };

    const participants = useMemo(() => {
        const friends = (multiTripDetailobj2 as any).friends || [];
        const organizer = (multiTripDetailobj2 as any).organizer || [];
        const merged = [...friends, ...organizer];

        const unique = [];
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
        setTripData(multiTripDetailobj2);
    }, []);

    return (
        tripData && (
            <Layout title="Trip Detail">
                <Grid container>
                    <Grid item lg={12}>
                        {tripData && (
                            <BasicTripInfo
                                isViewMode={true}
                                data={tripData}
                                onChangeStep={handleChangeStep}
                            />
                        )}
                    </Grid>
                    <Grid item lg={12}>
                        <DestinationDetail
                            type={tripData.type}
                            isViewMode={true}
                            startDate={tripData.startDate}
                            participants={participants}
                            endDate={tripData.endDate}
                            destinations={destinations}
                        />
                    </Grid>
                </Grid>
            </Layout>
        )
    );
};

export default TripDetail;
