import React, { useEffect, useState, useMemo} from 'react';
import './index.css';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Layout from 'components/common/Layout/SubLayout';
import BasicTripInfo from 'components/BasicTripInfo';
import DestinationDetail from 'components/DestinationDetail';

import { multiTripDetailobj2} from 'sample/tripData';

export const TripDetail = ({
    tripInfo = null
}) => {
    
    const [tripData, setTripData] = useState(null);
    const handleChangeStep = () => {
        console.log("fff");
    };
    
    const participants = useMemo(() => {
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
    
    const handleChangePlace = () => {

    };

    const handleChangeBudget = () => {

    };

    const handleChangeDestination = () => {

    };

    
    useEffect(() => {
        setTripData(multiTripDetailobj2);
    }, [multiTripDetailobj2]);


    return(
        <Layout title="Trip Detail">
            <Grid container>
                <Grid item>
                    { tripData && (<BasicTripInfo isViewMode={true} data={tripInfo} onChangeStep={handleChangeStep} />)} 
                </Grid>
                <Grid item>
                    <DestinationDetail 
                        type={tripInfo.type} 
                        isViewMode={true}
                        startDate={tripInfo.startDate} 
                        participants={participants}
                        endDate={tripInfo.endDate} 
                        destinations={tripInfo.destinations} 
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