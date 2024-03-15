import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import DestinationDetail from '../DestinationDetail';
import './index.css';

const TripInfo = ({
    data
}) => {
    return (
        <Layout>
            <Grid container className="tripInfo">
                {/* header */}
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="header">
                        <Grid item lg={6} md={6} xs={6} className="title">
                          Trip: { data.name}
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
                                    <span>${data.budget}</span>
                                </li>
                                <li>
                                    <span className="title">Total:</span>
                                    <span>${data.total}</span>
                                </li>
                                <li>
                                    <span className="title">Date:</span>
                                    <span>{`${data.startDate} - ${data.endDate}`}</span>
                                </li>
                                <li>
                                    <span className="title">People:</span>
                                    <span>{data.people}</span>
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
                    <DestinationDetail type={data.type} destinations={data.destinations} />
                </Grid>
                {/* end of trip section */}

            </Grid>
        </Layout>
    );
};

TripInfo.propTypes = {
    data: PropTypes.object
};

export default TripInfo;