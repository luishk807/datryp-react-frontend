import React, {useState, useEffect, useMemo} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import moment from 'moment';
import InputField from 'components/common/FormFields/InputField';
import { status } from 'sample';
import DropDown from 'components/common/FormFields/DropDown';
import { friends } from 'sample';

const BasicInfo = ({
    onChange,
}) => {

    
    const initilStatus = useMemo(() => {
        return status.filter(item => item.id === 1)[0];
    }, [status]);

    const endDate = useMemo(() => {
        const date = moment();
        onChange('endDate', { target: {value: moment().format('YYYY-MM-DD').toString() }});
        return date;
    }, []);

    const startDate = useMemo(() => {
        const date = moment();
        onChange('startDate', { target: {value: moment().format('YYYY-MM-DD').toString() }});
        return date;
    }, []);

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
                        <DropDown 
                            label="Status" 
                            defaultValue={initilStatus}
                            options={status} 
                            name="status" onChange={(e) => onChange('status', e)} 
                        />
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