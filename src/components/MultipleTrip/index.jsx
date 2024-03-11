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
                                        <Grid item lg={6} className="content-header">
                                            <span className="title">Destination:</span> china
                                        </Grid>
                                        <Grid item lg={6} className="content-option">
                                            <span className="option">Edit</span> / 
                                            <span className="option">Remove</span>
                                        </Grid>
                                        <Grid item lg={12} className="content-info"> 
                                            <span className="title">Depart</span>: JFF / ADD 140 - 10:00am - 
                                            <span className="title">Arrive:</span> DFF / AGF 140 - 1:00pm
                                        </Grid>
                                        <Grid item lg={12} className="content-trip border-trip">
                                            <Grid container>
                                                <Grid item lg={2} className="content-image">
                                                    <img src="/images/sample/china1.jpg" />
                                                </Grid>
                                                <Grid item lg={10} className="content-detail">
                                                    <Grid container>
                                                        <Grid item lg={11} className="info">
                                                            <span className="title">Glass</span>
                                                            <span className="status confirmed">confirmed</span>
                                                            <p>
                                                                China, Ghuanzhoe<br/>
                                                                Time: 9:00am - 9:30am<br/>
                                                                People: 2<br/>
                                                                Cost: $150.00
                                                            </p>
                                                        </Grid>
                                                        <Grid item lg={1} className="option">
                                                            <Grid container className="flex h-full">
                                                                <Grid item lg={12} className="flex justify-end items-start">Edit</Grid>
                                                                <Grid item lg={12}className="flex justify-end items-end">Delete</Grid>
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item lg={12} className="content-trip">
                                            <Grid container>
                                                <Grid item lg={12} className="add-place-item">
                                                    <button className="add-places">Add Places <AddCircleIcon /></button>
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