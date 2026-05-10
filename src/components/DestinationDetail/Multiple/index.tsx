import _ from 'lodash';
import { Grid } from '@mui/material';
import './index.css';
import { TRIP_BASIC } from 'constants';
import Activities from 'components/DestinationDetail/Activities';
import AddDestinationBtn from 'components/common/AddDestination';
import DialogBox from 'components/common/FormFields/DialogBox';
import type { ActionType, Destination, Friend } from 'types/trip';

export interface MultipleProps {
    defaultDate?: string;
    tripMaxDate?: string | null;
    trips?: Destination[] | null;
    onChangeDestination: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown, destinationIndx?: number) => void;
    onChangePlace: (type: ActionType, value: unknown, destinationIndx?: number) => void;
    participants?: Friend[];
    isViewMode?: boolean;
}

const Multiple = ({
    defaultDate,
    tripMaxDate,
    trips = [],
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
    isViewMode = false,
}: MultipleProps) => {
    return (
        <>
            {trips &&
                trips.map((trip, indx) => {
                    const flightInfo = _.get(trip, 'flightInfo');
                    const country = _.get(trip, 'country.name');
                    const activities = _.get(trip, 'itinerary.0.activities');
                    return (
                        <Grid
                            key={`trip-${indx}`}
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className="multrip-content-item"
                        >
                            <Grid container>
                                <Grid item lg={6} md={6} className="content-header">
                                    <span className="title">Destination:</span>&nbsp; &nbsp;{country} - Flight: {flightInfo?.flightNumber}
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    md={6}
                                    xs={12}
                                    className="flex justify-end justify-font-medium"
                                >
                                    <span>
                                        <AddDestinationBtn
                                            defaultDate={defaultDate}
                                            tripMaxDate={tripMaxDate}
                                            isViewMode={isViewMode}
                                            onChange={(e) => onChangeDestination('edit', e)}
                                            type="edit"
                                            buttonType="text"
                                            data={trip}
                                        />
                                    </span>
                                    &#47;
                                    <span>
                                        <DialogBox
                                            isViewMode={isViewMode}
                                            title="Delete this destination"
                                            buttonLabel="Delete"
                                            buttonType="text"
                                            onConfirm={() => onChangeDestination('delete', trip.id)}
                                        >
                                            You are about to delete {country}. Are you sure you want to delete this item
                                        </DialogBox>
                                    </span>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="content-info">
                                    <span className="title">Depart</span>: {flightInfo?.departAirport} - {flightInfo?.departTime} -
                                    <span className="title">Arrive:</span> {flightInfo?.arrivalAirport} - {flightInfo?.arrivalTime}
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="activity-button">
                                    <Activities
                                        isViewMode={isViewMode}
                                        tripTypeId={TRIP_BASIC.MULTIPLE.id}
                                        activities={activities}
                                        onChangePlace={(type, e) => onChangePlace(type, e, indx)}
                                        participants={participants}
                                        onChangeBudget={(type, e) => onChangeBudget(type, e, indx)}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })}
            {!trips && (
                <Grid
                    item
                    lg={12}
                    md={12}
                    xs={12}
                    className="multrip-content add-destination-button"
                >
                    <Grid container>
                        <Grid item>
                            <AddDestinationBtn
                                tripMaxDate={tripMaxDate}
                                isViewMode={isViewMode}
                                defaultDate={defaultDate}
                                onChange={(e) => onChangeDestination('add', e)}
                            />
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </>
    );
};

export default Multiple;
