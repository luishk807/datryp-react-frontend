import React, { useEffect, useState } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Layout from 'components/common/Layout/SubLayout';
import BasicTripInfo from 'components/BasicTripInfo';
import DestinationDetail from 'components/DestinationDetail';
export const TripDetail = ({
    tripInfo = null
}) => {
    
    const [tripData, setTripData] = useState(null);
    const handleChangeStep = () => {
        console.log("fff");
    };
    
    useEffect(() => {
        setTripData(tripInfo);
    }, [tripInfo]);
    return(
        <Layout title="Trip Detail">
            <Grid container>
                <Grid item>
                    { tripData && (<BasicTripInfo data={tripInfo} onChangeStep={handleChangeStep} />)} 
                </Grid>
                {/* <Grid item>
                    <DestinationDetail 
                        type={tripInfo.type} 
                        startDate={tripInfo.startDate} 
                        participants={participants}
                        endDate={tripInfo.endDate} 
                        destinations={tripInfo.destinations} 
                        onChangePlace={handleChangePlace}
                        onChangeBudget={handleChangeBudget}
                        onChangeDestination={handleChangeDestination}
                    />
                </Grid> */}
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