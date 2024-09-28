import React, { useState } from 'react';
import { Grid, FormControlLabel } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import PropTypes from 'prop-types';
import 'index.css';

export const CheckBoxCustom = ({
    label = 'test',
    onClick
}) => {
    return(
        <Grid container>
            <Grid item lg={12} md={12} xs={12}>
                <FormControlLabel 
                    value="left"
                    control={<Checkbox onClick={onClick} />}
                    label={label}
                    labelPlacement="end"
                />
            </Grid>
        </Grid>
    );
};

CheckBoxCustom.propTypes = {
    label: PropTypes.string,
    onClick: PropTypes.func
};

export default CheckBoxCustom;