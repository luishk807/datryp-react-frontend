import React from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import InputField from '../../common/FormFields/InputField';

const BasicInfo = ({
    onChange
}) => {
    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        Please enter basic info
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="name" onChange={onChange}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="budget" onChange={onChange}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="status" onChange={onChange}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="total" onChange={onChange}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="startDate" type="date" onChange={onChange}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="endDate" type="date" onChange={onChange}/>
                    </Grid>
                </Grid>
            </form>

        </div>
    );
};

BasicInfo.propTypes = {
    onChange: PropTypes.func
};
export default BasicInfo;