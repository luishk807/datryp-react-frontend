import React from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import DestinationDetail from '../DestinationDetail';
// import PropTypes from 'prop-types';
import { tripDetailobj } from '../../sample/tripData';


const MultipleTrip = () => {
    return (
        <Layout>
            <Grid container className="multiTrip">
                {/* header */}
                <Grid item lg={12}>
                    <Grid container className="header">
                        <Grid item lg={6} className="title">
                            Trip: { tripDetailobj.name}
                        </Grid>
                        <Grid item lg={6} className="menu">
                            Edit
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12}>
                    <hr/>
                </Grid>
                {/* budget data */}
                <Grid item lg={12}>
                    <Grid container className="tripData">
                        <Grid item lg={6} className="data">
                            <ul>
                                <li>
                                    <span className="title">Budget:</span>
                                    <span>${tripDetailobj.budget}</span>
                                </li>
                                <li>
                                    <span className="title">Total:</span>
                                    <span>${tripDetailobj.total}</span>
                                </li>
                                <li>
                                    <span className="title">Date:</span>
                                    <span>{`${tripDetailobj.startDate} - ${tripDetailobj.endDate}`}</span>
                                </li>
                                <li>
                                    <span className="title">People:</span>
                                    <span>{tripDetailobj.people}</span>
                                </li>
                            </ul>
                        </Grid>
                        <Grid item lg={6} className="status">
                            Completed?
                        </Grid>
                    </Grid>
                </Grid>
                {/* trips section */}
                <Grid item lg={12} className="tripItems">
                    <DestinationDetail destinations={tripDetailobj.destinations} />
                </Grid>
                {/* end of trip section */}

            </Grid>
        </Layout>
    );
};

// MultipleTrip.propTypes = {
//     children: PropTypes.object
// };

export default MultipleTrip;