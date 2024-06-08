import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import moment from 'moment';
import InputField from '../../common/FormFields/InputField';
import { status } from '../../../sample/index';
import DropDown from '../../common/FormFields/DropDown';
import { friends } from '../../../sample';

const BasicInfo = ({
    onChange,
}) => {

    const startDate = moment().format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');
    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        Please enter basic info
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="Organizer" onChange={(e) => onChange('orgnizer', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="Trip name" onChange={(e) => onChange('name', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField name="budget" onChange={(e) => onChange('budget', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <DropDown label="Status" options={status} id="status" onChange={(e) => onChange('status', e)} />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField defaultValue={startDate} label="Start Date" name="startDate" type="date" onChange={(e) => onChange('startDate', e)}/>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField defaultValue={endDate} label="End Date" name="endDate" type="date" onChange={(e) => onChange('endDate', e)}/>
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