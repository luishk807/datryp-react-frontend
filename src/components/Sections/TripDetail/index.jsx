import React, { useEffect, useState, useMemo} from 'react';
import './index.css';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Layout from 'components/common/Layout/SubLayout';
import BasicTripInfo from 'components/BasicTripInfo';
import DestinationDetail from 'components/DestinationDetail';
import _ from 'lodash';

import { multiTripDetailobj2} from 'sample/tripData';

export const TripDetail = ({
    tripInfo = null
}) => {
    
    const [tripData, setTripData] = useState(null);
    const handleChangeStep = () => {
        console.log("fff");
    };
    
    const participants = useMemo(() => {
        console.log("trup ino", multiTripDetailobj2);
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];
    
        const unique = [];
        Object.keys(merged).forEach(key => {
            if (!unique.length) {
                unique.push(merged[key]);
            } else {
                const found = unique.filter(item => item.id === merged[key].id);
                if (!found.length) {
                    unique.push(merged[key]);
                }
            }
        });
        return unique;
    }, [multiTripDetailobj2]);


    const destinations = useMemo(() => {
        return _.get(multiTripDetailobj2, 'destinations');
    }, [multiTripDetailobj2]);
    
    const handleChangePlace = () => {

    };

    const handleChangeBudget = () => {

    };

    const handleChangeDestination = () => {

    };

    
    useEffect(() => {
        setTripData(multiTripDetailobj2);
    }, [multiTripDetailobj2]);


    return tripData && (
        <Layout title="Trip Detail">
            <Grid container>
                <Grid item lg={12}>
                    { tripData && (
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
    );
};

TripDetail.propTypes = {
    tripInfo: PropTypes.object,
};

const mapStateToProps = (state) => {
    return {
        tripInfo: state
    };
};
export default connect(mapStateToProps)(TripDetail);