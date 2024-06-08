import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import InputField from '../../common/FormFields/InputField';
import { status } from '../../../sample/index';
import DropDown from '../../common/FormFields/DropDown';

const BasicInfo = ({
    onChange,
}) => {

    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        Please enter basic info
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="name" onChange={(e) => onChange('name', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="budget" onChange={(e) => onChange('budget', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <DropDown label="Status" options={status} id="status" onChange={(e) => onChange('status', e)} />

                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField label="Start Date" name="startDate" type="date" onChange={(e) => onChange('startDate', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField label="End Date" name="endDate" type="date" onChange={(e) => onChange('endDate', e)}/>
                    </Grid>
                </Grid>
            </form>

        </div>
    );
};

BasicInfo.propTypes = {
    onChange: PropTypes.func,
};
export default BasicInfo;