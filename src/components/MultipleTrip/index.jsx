import React from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import PropTypes from 'prop-types';


const MultipleTrip = ({
    tripInfo
}) => {
    return (
        <Layout>
            <Grid container className="multiTrip">
                {/* header */}
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="header">
                        <Grid item lg={6} md={6} xs={6} className="title">
                            Trip: { tripInfo.name}
                        </Grid>
                        <Grid item lg={6} md={6} xs={6} className="menu">
                            Edit
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <hr/>
                </Grid>
                {/* budget data */}
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="tripData">
                        <Grid item lg={6} md={6} xs={12} className="data">
                            <ul>
                                <li>
                                    <span className="title">Budget:</span>
                                    <span>${tripInfo.budget}</span>
                                </li>
                                <li>
                                    <span className="title">Total:</span>
                                    <span>${tripInfo.total}</span>
                                </li>
                                <li>
                                    <span className="title">Date:</span>
                                    <span>{`${tripInfo.startDate} - ${tripInfo.endDate}`}</span>
                                </li>
                                <li>
                                    <span className="title">People:</span>
                                    <span>{tripInfo.people}</span>
                                </li>
                            </ul>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="status">
                            Completed?
                        </Grid>
                    </Grid>
                </Grid>
                {/* trips section */}
                <Grid item lg={12} md={12} className="tripItems">
                    <DestinationDetail type={tripInfo.type} destinations={tripInfo.destinations} />
                </Grid>
                {/* end of trip section */}

            </Grid>
        </Layout>
    );
};

MultipleTrip.propTypes = {
    tripInfo: PropTypes.object
};

export default MultipleTrip;