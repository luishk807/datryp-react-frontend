import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import _ from 'lodash';
import { Grid } from '@mui/material';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
export const Status = ({ 
    data = null,
    onClick,
    isViewMode = false
}) => {
    return(
        <Grid container id="trip-status">
            <Grid item lg={12} md={12} xs={12} className="status-label">
                Status&nbsp;<ButtonIcon isViewMode={isViewMode} onClick={onClick} title="edit" type="text" />:
            </Grid>
            <Grid item lg={12} md={12} xs={12} className="status-data">
                { _.get(data, 'name') }
            </Grid>
        </Grid>
    );
};

Status.propTypes = {
    data: PropTypes.object,
    onClick: PropTypes.func,
    isViewMode: PropTypes.bool
};
export default Status;