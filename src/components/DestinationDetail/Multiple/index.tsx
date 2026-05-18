import _ from 'lodash';
import { formatDate, isValidDate, reformatDate } from 'utils';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import './index.scss';
import { TRIP_BASIC } from 'constants';
import Activities from 'components/DestinationDetail/Activities';
import AddDestinationBtn from 'components/common/AddDestination';
import DialogBox from 'components/common/FormFields/DialogBox';
import type { ActionType, Destination, Friend } from 'types';

const formatLegDate = (value?: string) =>
    value && isValidDate(value) ? formatDate(value, 'MMM D, YYYY') : '';

const formatLegTime = (value?: string) =>
    value && isValidDate(value, 'HH:mm') ? reformatDate(value, 'HH:mm', 'LT') : '';

const formatLegMeta = (date?: string, time?: string) => {
    const parts = [formatLegDate(date), formatLegTime(time)].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Not set';
};

export interface MultipleProps {
    defaultDate?: string;
    tripMaxDate?: string | null;
    trips?: Destination[] | null;
    /** Full destinations array from TripState, unfiltered. Used to compute
     *  each filtered trip's real index in the parent state — the index that
     *  movePlace expects in dnd-kit's drag-end payload. */
    allDestinations?: Destination[];
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
    allDestinations = [],
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
    isViewMode = false,
}: MultipleProps) => {
    return (
        <>
            {(trips ?? []).map((trip, indx) => {
                    const flightInfo = _.get(trip, 'flightInfo');
                    const country = _.get(trip, 'country.name');
                    const activities = _.get(trip, 'itinerary.0.activities');
                    // Resolve the destination's real index in the parent
                    // state — onChangePlace/onChangeBudget already do this
                    // by date, but drag-and-drop needs it eagerly so the
                    // droppable's `data` payload carries the right index.
                    const realDestIdx = (() => {
                        const byId = allDestinations.findIndex((d) => d.id === trip.id);
                        if (byId !== -1) return byId;
                        // Fall back to the filtered-loop index if the
                        // destination has no id yet (early state during the
                        // new-trip flow).
                        return indx;
                    })();
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
                                <Grid item lg={6} md={6} xs={12} className="content-header">
                                    <span className="country-name">
                                        {country || 'Destination not set'}
                                    </span>
                                    {flightInfo?.flightNumber && (
                                        <span className="flight-no">
                                            Flight {flightInfo.flightNumber}
                                        </span>
                                    )}
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    md={6}
                                    xs={12}
                                    className="flex justify-end justify-font-medium"
                                >
                                    {!isViewMode && (
                                        <>
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
                                        </>
                                    )}
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="content-info">
                                    <div className="flight-leg">
                                        <FlightTakeoffIcon className="leg-icon" />
                                        <div className="leg-detail">
                                            <span className="leg-label">Depart</span>
                                            <span className="leg-airport">
                                                {flightInfo?.departAirport || 'Not set'}
                                            </span>
                                            <span className="leg-meta">
                                                {formatLegMeta(
                                                    flightInfo?.departDate,
                                                    flightInfo?.departTime
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flight-divider" aria-hidden="true" />
                                    <div className="flight-leg">
                                        <FlightLandIcon className="leg-icon" />
                                        <div className="leg-detail">
                                            <span className="leg-label">Arrive</span>
                                            <span className="leg-airport">
                                                {flightInfo?.arrivalAirport || 'Not set'}
                                            </span>
                                            <span className="leg-meta">
                                                {formatLegMeta(
                                                    flightInfo?.arrivalDate,
                                                    flightInfo?.arrivalTime
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="activity-button">
                                    <Activities
                                        isViewMode={isViewMode}
                                        tripTypeId={TRIP_BASIC.MULTIPLE.id}
                                        activities={activities}
                                        onChangePlace={(type, e) => onChangePlace(type, e, realDestIdx)}
                                        participants={participants}
                                        onChangeBudget={(type, e) => onChangeBudget(type, e, realDestIdx)}
                                        destIdx={realDestIdx}
                                        date={trip.startDate ?? defaultDate ?? ''}
                                        country={country ?? ''}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })}
            {!isViewMode && (
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
