import { useEffect, useMemo } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import moment from 'moment';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import FriendPicker from '../FriendPicker';
import SearchBar from 'components/SearchBar';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_BASIC } from 'constants';
import type {
    Country,
    Destination,
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
    const dispatch = useTripDispatch();
    const isSingle = data?.type?.id === TRIP_BASIC.SINGLE.id;
    const rootCountry = data?.destinations?.[0]?.country;

    // Backend-sourced trip statuses — their UUIDs match what apiToTripState
    // stamps onto data.status when editing an existing trip. We resolve the
    // current status by name (handles both API-derived statuses with UUIDs
    // and any legacy numeric-id status objects from older flows).
    const { data: tripStatuses = [] } = useTripStatuses();
    const resolvedStatus = useMemo(() => {
        if (!tripStatuses.length) return null;
        const raw = data?.status;
        if (!raw) return tripStatuses[0];
        const targetName = typeof raw === 'object' ? raw.name : null;
        if (!targetName) return tripStatuses[0];
        return tripStatuses.find((s) => s.name === targetName) ?? tripStatuses[0];
    }, [data?.status, tripStatuses]);

    // Single trips carry exactly one country at destinations[0].country. The
    // wizard step 2 / read views don't expose a country picker for singles
    // (only multis have AddDestinationBtn), so we surface it here so the
    // user can change destination after the trip exists.
    const handleCountryChange = (country: Country) => {
        const destinations = data?.destinations ?? [];
        const next: Destination[] =
            destinations.length > 0
                ? [
                      { ...destinations[0], country },
                      ...destinations.slice(1),
                  ]
                : [{ id: 0, country, itinerary: [] } as Destination];
        dispatch(basicInfo({ destinations: next }));
    };

    const view = useMemo(
        () => ({
            organizer: (data?.organizer ?? []) as Friend[],
            name: data?.name ?? '',
            budget: data?.budget ?? '',
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
                    {isSingle ? (
                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <SearchBar
                                defaultValue={rootCountry?.name ? rootCountry : null}
                                type="simple"
                                onSelected={handleCountryChange}
                            />
                        </Grid>
                    ) : (
                        selectedCountries.length > 0 && (
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
                        )
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
                            value={resolvedStatus?.id ?? null}
                            options={tripStatuses}
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
