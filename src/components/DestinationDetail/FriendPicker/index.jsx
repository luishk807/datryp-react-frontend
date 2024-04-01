import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField
} from '@mui/material';
const FriendPicker = ({
    onChange
}) => {
    return (
        <div>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <TextField label='Select Friend' name='name' onChange={onChange}/>
                </Grid>
            </Grid>
        </div>
    );
};

FriendPicker.propTypes = {
    onChange: PropTypes.func
};
export default FriendPicker;