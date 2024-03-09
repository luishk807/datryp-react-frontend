import React from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import AddCircleIcon from '@mui/icons-material/AddCircle';
// import PropTypes from 'prop-types';

const MultipleTrip = () => {
    return (
        <Layout>
            <Grid container className="multiTrip">
                {/* header */}
                <Grid item lg={12}>
                    <Grid container className="header">
                        <Grid item lg={6} className="title">
                            Trip: All Asians!
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
                                    <span>$2,500.00</span>
                                </li>
                                <li>
                                    <span className="title">Total:</span>
                                    <span>$5,000.00</span>
                                </li>
                                <li>
                                    <span className="title">Date:</span>
                                    <span> 1/1/2023 - 1/2/2023</span>
                                </li>
                                <li>
                                    <span className="title">People:</span>
                                    <span>2</span>
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
                    <Grid container>
                        <Grid item lg={12} className="tripItem">
                            <Grid container>
                                <Grid item lg={12} className="header">
                                    <Grid container>
                                        <Grid item className="icon">
                                            <span className="dot"></span>
                                        </Grid>
                                        <Grid item className="title">
                                            <span className="title">January 1, 2023</span>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item lg={12} className="content item-border">
                                    <Grid container>
                                        <Grid item>
                                            <button className="add-destination">Add destination <AddCircleIcon /></button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item lg={12} className="tripItem">
                            <Grid container>
                                <Grid item lg={12} className="header">
                                    <Grid container>
                                        <Grid item className="icon">
                                            <span className="dot"></span>
                                        </Grid>
                                        <Grid item className="title">
                                            <span className="title">January 2, 2023</span>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item lg={12} className="content">
                                    <Grid container>
                                        <Grid item lg={6}>
                                            <span>Destination:</span> china
                                        </Grid>
                                        <Grid item lg={6}>
                                            Edit / Remove
                                        </Grid>
                                        <Grid item lg={12}> depart data</Grid>
                                        <Grid item lg={12}>
                                            <Grid container>
                                                <Grid item lg={4}>
                                                    picture
                                                </Grid>
                                                <Grid item lg={8}>
                                                    <Grid container>
                                                        <Grid item lg={10}>
                                                            Glass confirmed
                                                        </Grid>
                                                        <Grid item lg={2}>
                                                            <Grid container>
                                                                <Grid item lg={12}>Edit</Grid>
                                                                <Grid item lg={12}>Delete</Grid>
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item lg={12}>
                                            <Grid container>
                                                <Grid item>
                                                    Add Places
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>

     

                            </Grid>
                        </Grid>

                    </Grid>

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