import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField
} from '@mui/material';
import InputField from '../../common/FormFields/InputField';
const FriendPicker = ({
    onChange
}) => {
    return (
        <div>
            <Grid container>
                <Grid item lg={12} md={12} xs={12}>
                    <InputField name="fiend"/>
                </Grid>
            </Grid>
        </div>
    );
};

FriendPicker.propTypes = {
    onChange: PropTypes.func
};
export default FriendPicker;