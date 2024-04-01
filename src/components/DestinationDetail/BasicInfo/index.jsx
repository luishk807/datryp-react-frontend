import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField
} from '@mui/material';
const BasicInfo = ({
    onChange
}) => {
    return (
        <div>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Name' name='name' onChange={onChange}/>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Budget' name='budget' onChange={onChange}/>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Status' name='status' onChange={onChange}/>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Total' name='total' onChange={onChange}/>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Start Date' name='dateFrom' onChange={onChange}/>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='End Date' name='dateTo' onChange={onChange}/>
                </Grid>
            </Grid>
        </div>
    );
};

BasicInfo.propTypes = {
    onChange: PropTypes.func
};
export default BasicInfo;