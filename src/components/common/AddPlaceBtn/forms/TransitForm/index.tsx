import {
    CircularProgress,
    Grid,
    InputAdornment,
    TextField,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import classNames from 'classnames';
import InputField from 'components/common/FormFields/InputField';
import TransitSegmentLookupWatcher from '../../TransitSegmentLookupWatcher';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { FormController, FormMode } from '../../types';

export interface TransitFormProps {
    controller: FormController;
    mode: FormMode;
}

/** TRANSPORT/Ground form body (train / bus / rental car). The in-form
 *  mode toggle + smart entry are ADD-only; the per-segment fields sit
 *  behind a "Show details" collapse — identical behavior on edit and
 *  add. */
const TransitForm = ({ controller, mode }: TransitFormProps) => {
    const {
        place,
        countryScope,
        handleOnChange,
        setPlace,
        emptyTransitSegment,
        isoDefaultDate,
        transitSmartEntry,
        setTransitSmartEntry,
        transitSmartWarning,
        transitLookupLoading,
        transitLookupNotFound,
        setTransitLookupNotFound,
        handleTransitField,
        handleAddTransitSegment,
        handleRemoveTransitSegment,
        applyTransitLookup,
        handleTransitLookupLoadingChange,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const showSmart = method === ADD_METHOD.SMART;
    const showCustom = method === ADD_METHOD.CUSTOM;
    // Keep the smart screen calm: just the search box until the user
    // types something (or the parser has filled a segment), then reveal
    // the per-segment fields. Custom + edit show them outright. (Same
    // pattern as the Flight / Place / Hotel forms.)
    const hasContent =
        Boolean(transitSmartEntry.trim()) ||
        Boolean(place.name?.trim()) ||
        (place.transitSegments ?? []).some(
            (s) =>
                s.operator?.trim() ||
                s.number?.trim() ||
                s.departStation?.trim() ||
                s.arrivalStation?.trim(),
        );
    const detailsVisible = isEdit || showCustom || (showSmart && hasContent);

    return (
        <Grid container>
            {!isEdit && (
                <Grid item lg={12} xs={12} className="pt-5 pb-0">
                    <div
                        className={classNames(
                            'hotel-side-toggle',
                            'is-three',
                            `is-${
                                place.kind === ACTIVITY_KIND.BUS
                                    ? 'bus'
                                    : place.kind === ACTIVITY_KIND.RENTAL_CAR
                                      ? 'rental-car'
                                      : 'train'
                            }`,
                        )}
                        role="tablist"
                        aria-label="Ground transport mode"
                    >
                        <span
                            className="hotel-side-thumb"
                            aria-hidden="true"
                        />
                        {[
                            {
                                value: ACTIVITY_KIND.TRAIN,
                                label: 'Train',
                                Icon: DirectionsTransitRoundedIcon,
                            },
                            {
                                value: ACTIVITY_KIND.BUS,
                                label: 'Bus',
                                Icon: DirectionsBusRoundedIcon,
                            },
                            {
                                value: ACTIVITY_KIND.RENTAL_CAR,
                                label: 'Rental car',
                                Icon: CarRentalRoundedIcon,
                            },
                        ].map(({ value, label, Icon }) => {
                            const active = place.kind === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={classNames('hotel-side-btn', {
                                        selected: active,
                                    })}
                                    onClick={() =>
                                        setPlace((prev) => ({
                                            ...prev,
                                            kind: value,
                                        }))
                                    }
                                >
                                    <Icon
                                        className="hotel-side-icon"
                                        fontSize="small"
                                    />
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </Grid>
            )}
            {showSmart && (
                <Grid item lg={12} xs={12} className="py-5">
                    <div className="flight-smart-entry">
                        <div className="flight-smart-entry-field">
                            <TextField
                                fullWidth
                                variant="outlined"
                                value={transitSmartEntry}
                                onChange={(e) =>
                                    setTransitSmartEntry(e.target.value)
                                }
                                placeholder={
                                    place.kind === ACTIVITY_KIND.RENTAL_CAR
                                        ? 'e.g. "Hertz pickup JFK 10am $50"'
                                        : 'e.g. "Tokyo to Kyoto 9am-12pm $100"'
                                }
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </div>
                        <div className="flight-smart-entry-hint">
                            <span>
                                Type stations, times, and cost — we&rsquo;ll
                                fill the details below.
                            </span>
                        </div>
                        {transitSmartWarning && (
                            <div className="flight-smart-entry-warning">
                                {transitSmartWarning}
                            </div>
                        )}
                    </div>
                </Grid>
            )}
            {detailsVisible && (
                <>
                    <Grid item lg={12} xs={12} className="pt-5 pb-5">
                        <InputField
                            value={place.name ?? ''}
                            name="name"
                            label="Trip name (optional — auto-fills from operator + number)"
                            required={false}
                            onChange={(e) =>
                                handleOnChange('name', e.target.value)
                            }
                        />
                    </Grid>
                    {(
                        place.transitSegments ?? [
                            emptyTransitSegment(isoDefaultDate),
                        ]
                    ).map((segment, segIdx, allSegs) => (
                        <Grid
                            key={segIdx}
                            item
                            lg={12}
                            xs={12}
                            className="flight-segment-block"
                        >
                            <div className="flight-segment-header">
                                <span className="flight-segment-label">
                                    {allSegs.length > 1
                                        ? `Leg ${segIdx + 1}`
                                        : 'Trip details'}
                                </span>
                                {allSegs.length > 1 && (
                                    <button
                                        type="button"
                                        className="flight-segment-remove"
                                        onClick={() =>
                                            handleRemoveTransitSegment(segIdx)
                                        }
                                        aria-label={`Remove leg ${segIdx + 1}`}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {(place.kind === ACTIVITY_KIND.TRAIN ||
                                place.kind === ACTIVITY_KIND.BUS) && (
                                <>
                                    <TransitSegmentLookupWatcher
                                        operator={segment.operator}
                                        number={segment.number}
                                        kind={
                                            place.kind === ACTIVITY_KIND.TRAIN
                                                ? 'train'
                                                : 'bus'
                                        }
                                        departDate={segment.departDate}
                                        country={countryScope}
                                        onResult={(result) => {
                                            applyTransitLookup(segIdx, result);
                                            setTransitLookupNotFound((prev) => {
                                                if (!(segIdx in prev))
                                                    return prev;
                                                const next = { ...prev };
                                                delete next[segIdx];
                                                return next;
                                            });
                                        }}
                                        onLoadingChange={(loading) =>
                                            handleTransitLookupLoadingChange(
                                                segIdx,
                                                loading,
                                            )
                                        }
                                        onNotFound={(label) =>
                                            setTransitLookupNotFound((prev) => ({
                                                ...prev,
                                                [segIdx]: label,
                                            }))
                                        }
                                    />
                                    <div className="flight-segment-hint">
                                        {transitLookupLoading.has(segIdx) ? (
                                            <CircularProgress
                                                size={14}
                                                className="flight-segment-hint-spinner"
                                            />
                                        ) : (
                                            <AutoAwesomeRoundedIcon
                                                fontSize="small"
                                                className="flight-segment-hint-icon"
                                            />
                                        )}
                                        <span className="flight-segment-hint-text">
                                            {transitLookupLoading.has(segIdx)
                                                ? 'Looking up schedule…'
                                                : transitLookupNotFound[segIdx]
                                                  ? `Couldn't find ${transitLookupNotFound[segIdx]}. Fill in the stations, date, and time below manually.`
                                                  : "Type the operator + number and we'll try to auto-fill the stations and times."}
                                        </span>
                                    </div>
                                </>
                            )}
                            <Grid container>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        value={segment.operator ?? ''}
                                        name={`transitOperator-${segIdx}`}
                                        label={
                                            place.kind === ACTIVITY_KIND.TRAIN
                                                ? 'Operator (e.g. Renfe, JR)'
                                                : place.kind ===
                                                    ACTIVITY_KIND.RENTAL_CAR
                                                  ? 'Rental company (e.g. Hertz, Avis)'
                                                  : 'Operator (e.g. FlixBus, Greyhound)'
                                        }
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'operator',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    xs={12}
                                    className="py-5 lg:pl-2"
                                >
                                    <InputField
                                        value={segment.number ?? ''}
                                        name={`transitNumber-${segIdx}`}
                                        label={
                                            place.kind === ACTIVITY_KIND.TRAIN
                                                ? 'Train number'
                                                : place.kind ===
                                                    ACTIVITY_KIND.RENTAL_CAR
                                                  ? 'Confirmation #'
                                                  : 'Bus number / route'
                                        }
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'number',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        value={segment.departStation ?? ''}
                                        name={`transitDepartStation-${segIdx}`}
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Pickup location'
                                                : 'Depart station'
                                        }
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'departStation',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    xs={12}
                                    className="py-5 lg:pl-2"
                                >
                                    <InputField
                                        value={segment.arrivalStation ?? ''}
                                        name={`transitArrivalStation-${segIdx}`}
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Dropoff location (optional)'
                                                : 'Arrival station (optional)'
                                        }
                                        required={false}
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'arrivalStation',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        value={segment.departDate ?? ''}
                                        name={`transitDepartDate-${segIdx}`}
                                        type="date"
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Pickup date'
                                                : 'Depart date'
                                        }
                                        labelOnTop
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'departDate',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    xs={12}
                                    className="py-5 lg:pl-2"
                                >
                                    <InputField
                                        value={segment.departTime ?? ''}
                                        name={`transitDepartTime-${segIdx}`}
                                        type="time"
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Pickup time'
                                                : 'Depart time'
                                        }
                                        labelOnTop
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'departTime',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        value={segment.arrivalDate ?? ''}
                                        name={`transitArrivalDate-${segIdx}`}
                                        type="date"
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Dropoff date (optional)'
                                                : 'Arrival date (optional)'
                                        }
                                        labelOnTop
                                        required={false}
                                        minDate={
                                            segment.departDate || undefined
                                        }
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'arrivalDate',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    xs={12}
                                    className="py-5 lg:pl-2"
                                >
                                    <InputField
                                        value={segment.arrivalTime ?? ''}
                                        name={`transitArrivalTime-${segIdx}`}
                                        type="time"
                                        label={
                                            place.kind ===
                                            ACTIVITY_KIND.RENTAL_CAR
                                                ? 'Dropoff time (optional)'
                                                : 'Arrival time (optional)'
                                        }
                                        labelOnTop
                                        required={false}
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'arrivalTime',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item lg={6} xs={12} className="py-5">
                                    <InputField
                                        value={segment.classOrSeat ?? ''}
                                        name={`transitClassOrSeat-${segIdx}`}
                                        label={
                                            place.kind === ACTIVITY_KIND.TRAIN
                                                ? 'Class / seat (optional)'
                                                : place.kind ===
                                                    ACTIVITY_KIND.RENTAL_CAR
                                                  ? 'Car class (e.g. Compact, SUV) (optional)'
                                                  : 'Seat (optional)'
                                        }
                                        required={false}
                                        onChange={(e) =>
                                            handleTransitField(
                                                segIdx,
                                                'classOrSeat',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    xs={12}
                                    className="py-5 lg:pl-2"
                                >
                                    <InputField
                                        defaultValue={
                                            segIdx === 0 && place.cost
                                                ? String(place.cost)
                                                : ''
                                        }
                                        name={`transitCost-${segIdx}`}
                                        label="Cost (optional)"
                                        required={false}
                                        onChange={(e) =>
                                            segIdx === 0
                                                ? handleOnChange(
                                                      'cost',
                                                      e.target.value,
                                                  )
                                                : undefined
                                        }
                                        disabled={segIdx !== 0}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    ))}
                    <Grid item lg={12} xs={12} className="py-5">
                        <button
                            type="button"
                            className="flight-segment-add"
                            onClick={handleAddTransitSegment}
                        >
                            {place.kind === ACTIVITY_KIND.RENTAL_CAR
                                ? '+ Add stopover'
                                : '+ Add leg (transfer)'}
                        </button>
                    </Grid>
                </>
            )}
        </Grid>
    );
};

export default TransitForm;
