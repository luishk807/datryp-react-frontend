import { useEffect, useMemo } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import moment from 'moment';
import InputField from 'components/common/FormFields/InputField';
import { status } from 'sample';
import DropDown from 'components/common/FormFields/DropDown';
import FriendPicker from '../FriendPicker';
import type {
    Friend,
    TripChangeEvent,
    TripState,
} from 'types';

interface BasicInfoProps {
    onChange: (id: string, e: TripChangeEvent) => void;
    data?: TripState | null;
}

const BasicInfo = ({ onChange, data = null }: BasicInfoProps) => {
    const today = useMemo(() => moment().format('YYYY-MM-DD'), []);

    const view = useMemo(
        () => ({
            organizer: (data?.organizer ?? []) as Friend[],
            name: data?.name ?? '',
            budget: data?.budget ?? '',
            status: data?.status ?? status[0],
            startDate: data?.startDate ?? today,
            endDate: data?.endDate ?? today,
        }),
        [data, today]
    );

    const selectedCountries = useMemo(() => {
        const names = (data?.destinations ?? [])
            .map((d) => d.country?.name)
            .filter((n): n is string => !!n);
        return Array.from(new Set(names));
    }, [data]);

    useEffect(() => {
        if (!data?.startDate) onChange('startDate', { target: { value: today } });
        if (!data?.endDate) onChange('endDate', { target: { value: today } });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOrganizerPicker = (_name: string | undefined, e: TripChangeEvent) => {
        onChange('organizer', e);
    };

    const handleStatusChange = (value: unknown) => {
        onChange('status', { target: { value } });
    };

    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        Please enter basic info
                    </Grid>
                    {selectedCountries.length > 0 && (
                        <Grid item lg={12} md={12} xs={12} className="trip-destination-card">
                            <FlightTakeoffIcon className="trip-destination-icon" />
                            <div className="trip-destination-text">
                                <span className="trip-destination-label">
                                    {selectedCountries.length > 1
                                        ? "You're heading to"
                                        : 'Next stop'}
                                </span>
                                <span className="trip-destination-name">
                                    {selectedCountries.join(' • ')}
                                </span>
                            </div>
                        </Grid>
                    )}
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <FriendPicker
                            title="Select Organizer"
                            name="organizer"
                            selectedOptions={view.organizer}
                            onChange={handleOrganizerPicker}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            defaultValue={view.name}
                            name="name"
                            label="Trip Name"
                            onChange={(e) => onChange('name', e)}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            defaultValue={String(view.budget)}
                            name="budget"
                            onChange={(e) => onChange('budget', e)}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <DropDown
                            label="Status"
                            defaultValue={view.status}
                            options={status}
                            name="status"
                            onChange={handleStatusChange}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            label="Start Date"
                            defaultValue={view.startDate}
                            name="startDate"
                            type="date"
                            onChange={(e) => onChange('startDate', e)}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            label="End Date"
                            defaultValue={view.endDate}
                            name="endDate"
                            type="date"
                            onChange={(e) => onChange('endDate', e)}
                        />
                    </Grid>
                </Grid>
            </form>
        </div>
    );
};

export default BasicInfo;
