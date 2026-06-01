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
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded';
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
    // Smart mode shows only the search box + its parse hint — the parser
    // still populates the draft silently so Step 3 review reflects what
    // was typed; the user verifies / fixes there via Edit. The per-segment
    // fields only render for custom + edit, where the user fills them by
    // hand.
    const detailsVisible = isEdit || showCustom;

    // Ground-transport mode segments, in display order. The toggle is a
    // 4-position slider (Train | Bus | Rental car | Other); the active
    // kind's index drives the generic `is-pos-N` modifier that slides
    // the thumb (1-based, so position = index + 1).
    const TRANSIT_MODES = [
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
        {
            value: ACTIVITY_KIND.OTHER,
            label: 'Other',
            Icon: LocalTaxiRoundedIcon,
        },
    ] as const;
    const activeModeIdx = TRANSIT_MODES.findIndex(
        (m) => m.value === place.kind,
    );
    // Default to position 1 (Train) when the kind isn't one of the four
    // (shouldn't happen — TransitForm only renders for transit kinds).
    const thumbPos = activeModeIdx >= 0 ? activeModeIdx + 1 : 1;

    const isRental = place.kind === ACTIVITY_KIND.RENTAL_CAR;
    const isTrain = place.kind === ACTIVITY_KIND.TRAIN;

    // Visible field labels by kind. RENTAL_CAR re-maps to a pickup /
    // dropoff vocabulary; TRAIN / BUS / OTHER share the point-to-point
    // ride vocabulary. The underlying draft field names never change —
    // only the label text.
    const labels = isRental
        ? {
              operator: 'Rental company',
              number: 'Confirmation number',
              departStation: 'Pickup location',
              arrivalStation: 'Dropoff location (optional)',
              departDate: 'Pickup date',
              departTime: 'Pickup time',
              arrivalDate: 'Dropoff date (optional)',
              arrivalTime: 'Dropoff time (optional)',
              classOrSeat: 'Car class (optional)',
              cost: 'Cost (optional)',
          }
        : {
              operator: 'Provider',
              number: 'Vehicle number (optional)',
              departStation: 'Departure location',
              arrivalStation: 'Arrival location (optional)',
              departDate: 'Depart date',
              departTime: 'Depart time',
              arrivalDate: 'Arrival date (optional)',
              arrivalTime: 'Arrival time (optional)',
              classOrSeat: 'Seat or class (optional)',
              cost: 'Cost (optional)',
          };

    const operatorPlaceholder = isRental
        ? 'e.g. Hertz, Avis'
        : isTrain
          ? 'e.g. Renfe, JR'
          : 'e.g. Renfe, JR, Uber';

    return (
        <Grid container>
            {!isEdit && (
                <Grid item lg={12} xs={12} className="pt-5 pb-0">
                    <div
                        className={classNames(
                            'hotel-side-toggle',
                            'is-four',
                            `is-pos-${thumbPos}`,
                        )}
                        role="tablist"
                        aria-label="Ground transport mode"
                    >
                        <span
                            className="hotel-side-thumb"
                            aria-hidden="true"
                        />
                        {TRANSIT_MODES.map(({ value, label, Icon }) => {
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
                                    isRental
                                        ? 'e.g. "Hertz pickup JFK 10am $50"'
                                        : place.kind === ACTIVITY_KIND.OTHER
                                          ? 'e.g. "Uber airport to hotel 10am $30"'
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
                                fill the details and you can review them on
                                the next step.
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
            {/* Smart mode hides the per-segment fields but must keep the
                schedule lookup running so the draft is enriched (stations
                / dates / times) for the Step 3 review. Rental cars have no
                lookup, mirroring the visible-UI gate below. */}
            {showSmart &&
                (place.kind === ACTIVITY_KIND.TRAIN ||
                    place.kind === ACTIVITY_KIND.BUS) &&
                (place.transitSegments ?? []).map((segment, segIdx) => (
                    <TransitSegmentLookupWatcher
                        key={`smart-watch-${segIdx}`}
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
                                if (!(segIdx in prev)) return prev;
                                const next = { ...prev };
                                delete next[segIdx];
                                return next;
                            });
                        }}
                        onLoadingChange={(loading) =>
                            handleTransitLookupLoadingChange(segIdx, loading)
                        }
                        onNotFound={(label) =>
                            setTransitLookupNotFound((prev) => ({
                                ...prev,
                                [segIdx]: label,
                            }))
                        }
                    />
                ))}
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
                                        label={labels.operator}
                                        placeholder={operatorPlaceholder}
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
                                        label={labels.number}
                                        required={false}
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
                                        label={labels.departStation}
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
                                        label={labels.arrivalStation}
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
                                        label={labels.departDate}
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
                                        label={labels.departTime}
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
                                        label={labels.arrivalDate}
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
                                        label={labels.arrivalTime}
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
                                        label={labels.classOrSeat}
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
                                        label={labels.cost}
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
                            {isRental
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
