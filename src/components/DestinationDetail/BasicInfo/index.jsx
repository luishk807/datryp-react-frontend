import React, {useEffect, useMemo} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import moment from 'moment';
import InputField from 'components/common/FormFields/InputField';
import { status } from 'sample';
import DropDown from 'components/common/FormFields/DropDown';
import FriendPicker from '../FriendPicker';
const BasicInfo = ({
    onChange,
    selectedOrganizer = []
}) => {

    const initilStatus = useMemo(() => {
        return status.filter(item => item.id === 1)[0];
    }, [status]);

    const handleOrganizerPicker = (name, target) => {
        console.log("firneds", name, 'value:', target);
        const values = target.value && target.value.length ? target.value.map(item => ({ id: item.id, label: item.name})) : [];
        onChange('organizer', target);
    };

    const handleStatusChange = (e) => {
        onChange('status', { target: {value: e}} );
    };

    useEffect(() => {
        let unmounted = true;
        
        if(unmounted) {
            onChange('endDate', { target: {value: moment().format('YYYY-MM-DD').toString() }});
            onChange('startDate', { target: {value: moment().format('YYYY-MM-DD').toString() }});
        }

        return () => unmounted = false;
    }, []);

    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        Please enter basic info
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        {/* <InputField name="Organizer" onChange={(e) => onChange('orgnizer', e)}/> */}
                        <FriendPicker
                            title="Select Organizer" 
                            // isMultiple={false}
                            selectedOptions={selectedOrganizer} 
                            onChange={handleOrganizerPicker}
                        />
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
                            name="status" onChange={handleStatusChange} 
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
    selectedOrganizer: PropTypes.array
};
export default BasicInfo;