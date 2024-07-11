import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import ImageBlock from '../ImageBlock';
import AddPlaceBtn from '../../common/AddPlaceBtn';
import ButtonCustom from '../../common/ButtonCustom';

const Activities = ({
    activities = [],
    onChange
})=> {
    const handleDelete = (e) => {
        console.log("delete", e);
    };

    const handleEdit = (e) => {
        console.log("edit", e);
    };
    return (
        <>

            {
                activities && activities.map((activity, indx) => (
                    <Grid key={`activity-${indx}`} item lg={12} md={12} className="content-trip border-trip">
                        <Grid container>
                            <Grid item lg={2} md={2} className="content-image">
                                <ImageBlock image={activity.image} />
                            </Grid>
                            <Grid item lg={10} md={10} className="content-detail">
                                <Grid container>
                                    <Grid item lg={11} md={11} className="info">
                                        <span className="title">{activity.place}</span>
                                        <span className="status confirmed">confirmed</span>
                                        <p>
                                            {activity.location}<br/>
                                          Time: {`${activity.startTime} - ${activity.endTime}`}<br/>
                                          Budget: {activity?.people?.length}[add]<br/>
                                          Cost: ${activity.cost}
                                        </p>
                                    </Grid>
                                    <Grid item lg={1} md={1} className="option">
                                        <Grid container className="flex h-full">
                                            <Grid item lg={12} md={12} className="flex justify-end items-start font-medium">

                                                <AddPlaceBtn type='edit' buttonType='text' onChange={handleEdit}/>
                                            </Grid>
                                            <Grid item lg={12} md={12} className="flex justify-end items-end font-medium">
                                                <ButtonCustom 
                                                    type="text" 
                                                    capitalizeType="uppercase" 
                                                    label='Delete'
                                                    onClick={handleDelete}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                ))
            }
            <Grid item lg={12} className="content-trip">
                <Grid container>
                    <Grid item lg={12} className="add-place-item">
                        <AddPlaceBtn onChange={onChange} />
                    </Grid>
                </Grid>
            </Grid>
        </>

    );
};

Activities.propTypes = {
    onChange: PropTypes.func,
    activities: PropTypes.array
};

export default Activities;