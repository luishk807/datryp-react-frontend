import {
    CircularProgress,
    Grid,
    InputAdornment,
    TextField,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import FlightSegmentLookupWatcher from '../../FlightSegmentLookupWatcher';
import { ADD_METHOD } from 'constants';
import type { FormController, FormMode } from '../../types';

export interface FlightFormProps {
    controller: FormController;
    mode: FormMode;
}

/** FLIGHT-kind form body. Smart entry + per-segment rows + cost. In the
 *  ADD wizard the smart-entry field shows only for the SMART method; the
 *  segment list (the "details") is the always-present input that both
 *  smart and custom write into. */
const FlightForm = ({ controller, mode }: FlightFormProps) => {
    const {
        place,
        smartEntry,
        handleSmartEntry,
        handleOnChange,
        emptySegment,
        isoDefaultDate,
        openSegments,
        toggleSegmentOpen,
        handleRemoveSegment,
        applyFlightLookup,
        setLookupNotFound,
        handleLookupLoadingChange,
        lookupLoading,
        lookupNotFound,
        expandedSegments,
        toggleSegmentExpanded,
        handleSegmentField,
        setArrivalCity,
        handleAddSegment,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const isSmart = method === ADD_METHOD.SMART;
    const isCustom = method === ADD_METHOD.CUSTOM;
    const showSmart = isEdit || isSmart;
    // Smart view is just the text box + its parse hint — the parser still
    // populates the segments silently so Step 3 review reflects what was
    // typed; the user verifies / fixes there via Edit. The structured
    // segment list + cost only render for custom + edit, where the user
    // is filling fields by hand.
    const showSegments = isEdit || isCustom;
    const showCost = isEdit || isCustom;

    return (
        <Grid container>
            {showSmart && (
                <Grid item lg={12} xs={12} className="py-5">
                    <div className="flight-smart-entry">
                        <div className="flight-smart-entry-field">
                            <TextField
                                fullWidth
                                multiline
                                minRows={1}
                                maxRows={3}
                                variant="outlined"
                                value={smartEntry}
                                onChange={(e) =>
                                    handleSmartEntry(e.target.value)
                                }
                                placeholder='Try: "UA123 tomorrow" or "UA123 today stopover BA245"'
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
                                Type your flight(s) here and we&rsquo;ll
                                look up the airports, dates, and times —
                                review or tweak everything on the next step.
                            </span>
                        </div>
                    </div>
                </Grid>
            )}
            {/* Smart mode hides the segment UI but must keep the
                per-segment lookup running so the draft is enriched
                (airports / dates / times) for the Step 3 review. Mount
                an invisible watcher per parsed segment. */}
            {isSmart &&
                (place.flightSegments ?? []).map((segment, segIdx) => (
                    <FlightSegmentLookupWatcher
                        key={`smart-watch-${segIdx}`}
                        flightNumber={segment.flightNumber}
                        departDate={segment.departDate}
                        onResult={(result) => {
                            applyFlightLookup(segIdx, result);
                            setLookupNotFound((prev) => {
                                if (!(segIdx in prev)) return prev;
                                const next = { ...prev };
                                delete next[segIdx];
                                return next;
                            });
                        }}
                        onLoadingChange={(loading) =>
                            handleLookupLoadingChange(segIdx, loading)
                        }
                        onNotFound={(num) =>
                            setLookupNotFound((prev) => ({
                                ...prev,
                                [segIdx]: num,
                            }))
                        }
                    />
                ))}
            {showSegments &&
                (place.flightSegments ?? [emptySegment(isoDefaultDate)]).map(
                (segment, segIdx, allSegs) => (
                    <Grid
                        key={segIdx}
                        item
                        lg={12}
                        xs={12}
                        className="flight-segment-block"
                    >
                        <div className="flight-segment-header">
                            <button
                                type="button"
                                className="flight-segment-open-toggle"
                                onClick={() => toggleSegmentOpen(segIdx)}
                                aria-expanded={openSegments.has(segIdx)}
                            >
                                {openSegments.has(segIdx) ? (
                                    <ExpandLessRoundedIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreRoundedIcon fontSize="small" />
                                )}
                                <span className="flight-segment-label">
                                    {`Segment ${segIdx + 1}`}
                                    {segment.flightNumber?.trim() && (
                                        <span className="flight-segment-label-sub">
                                            {' · '}
                                            {segment.flightNumber
                                                .trim()
                                                .toUpperCase()}
                                        </span>
                                    )}
                                </span>
                            </button>
                            {allSegs.length > 1 && (
                                <button
                                    type="button"
                                    className="flight-segment-remove"
                                    onClick={() => handleRemoveSegment(segIdx)}
                                    aria-label={`Remove segment ${segIdx + 1}`}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <FlightSegmentLookupWatcher
                            flightNumber={segment.flightNumber}
                            departDate={segment.departDate}
                            onResult={(result) => {
                                applyFlightLookup(segIdx, result);
                                setLookupNotFound((prev) => {
                                    if (!(segIdx in prev)) return prev;
                                    const next = { ...prev };
                                    delete next[segIdx];
                                    return next;
                                });
                            }}
                            onLoadingChange={(loading) =>
                                handleLookupLoadingChange(segIdx, loading)
                            }
                            onNotFound={(num) =>
                                setLookupNotFound((prev) => ({
                                    ...prev,
                                    [segIdx]: num,
                                }))
                            }
                        />
                        {openSegments.has(segIdx) && (
                            <Grid container>
                                <Grid item lg={12} xs={12} className="py-5">
                                    <InputField
                                        value={segment.flightNumber ?? ''}
                                        name={`flightNumber-${segIdx}`}
                                        label="Flight number"
                                        placeholder="e.g. UA123"
                                        onChange={(e) =>
                                            handleSegmentField(
                                                segIdx,
                                                'flightNumber',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item lg={12} xs={12} className="py-1">
                                    <div className="flight-segment-hint">
                                        {lookupLoading.has(segIdx) ? (
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
                                            {lookupLoading.has(segIdx)
                                                ? 'Looking up flight details…'
                                                : lookupNotFound[segIdx]
                                                  ? `Couldn't find flight ${lookupNotFound[segIdx]}. Fill in the airport, date, and time below manually.`
                                                  : "We'll auto-fill the airport, date, and time once you enter a flight number."}
                                        </span>
                                        <button
                                            type="button"
                                            className="flight-segment-toggle"
                                            onClick={() =>
                                                toggleSegmentExpanded(segIdx)
                                            }
                                            aria-expanded={expandedSegments.has(
                                                segIdx,
                                            )}
                                        >
                                            {expandedSegments.has(segIdx) ? (
                                                <>
                                                    Hide details
                                                    <ExpandLessRoundedIcon fontSize="small" />
                                                </>
                                            ) : (
                                                <>
                                                    Show details
                                                    <ExpandMoreRoundedIcon fontSize="small" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Grid>
                                {expandedSegments.has(segIdx) && (
                                    <>
                                        <Grid
                                            item
                                            lg={6}
                                            xs={12}
                                            className="py-5"
                                        >
                                            <AirportAutocomplete
                                                value={
                                                    segment.departAirport ?? ''
                                                }
                                                onChange={(code) =>
                                                    handleSegmentField(
                                                        segIdx,
                                                        'departAirport',
                                                        code,
                                                    )
                                                }
                                                label="Depart airport"
                                                placeholder="IATA code, city, or airport"
                                            />
                                        </Grid>
                                        <Grid
                                            item
                                            lg={6}
                                            xs={12}
                                            className="py-5 lg:pl-2"
                                        >
                                            <AirportAutocomplete
                                                value={
                                                    segment.arrivalAirport ?? ''
                                                }
                                                onChange={(code) =>
                                                    handleSegmentField(
                                                        segIdx,
                                                        'arrivalAirport',
                                                        code,
                                                    )
                                                }
                                                onSelectMeta={(opt) => {
                                                    const segs =
                                                        place.flightSegments ??
                                                        [];
                                                    if (
                                                        segIdx ===
                                                        segs.length - 1
                                                    ) {
                                                        setArrivalCity(opt.city);
                                                    }
                                                }}
                                                label="Arrival airport"
                                                placeholder="IATA code, city, or airport"
                                            />
                                        </Grid>
                                        <Grid
                                            item
                                            lg={6}
                                            xs={12}
                                            className="py-5"
                                        >
                                            <InputField
                                                value={segment.departDate ?? ''}
                                                name={`departDate-${segIdx}`}
                                                type="date"
                                                label="Depart date"
                                                labelOnTop
                                                onChange={(e) =>
                                                    handleSegmentField(
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
                                                name={`departTime-${segIdx}`}
                                                type="time"
                                                label="Depart time"
                                                labelOnTop
                                                onChange={(e) =>
                                                    handleSegmentField(
                                                        segIdx,
                                                        'departTime',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Grid>
                                        <Grid
                                            item
                                            lg={6}
                                            xs={12}
                                            className="py-5"
                                        >
                                            <InputField
                                                value={
                                                    segment.arrivalDate ?? ''
                                                }
                                                name={`arrivalDate-${segIdx}`}
                                                type="date"
                                                label="Arrival date"
                                                labelOnTop
                                                minDate={
                                                    segment.departDate ||
                                                    undefined
                                                }
                                                onChange={(e) =>
                                                    handleSegmentField(
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
                                                value={
                                                    segment.arrivalTime ?? ''
                                                }
                                                name={`arrivalTime-${segIdx}`}
                                                type="time"
                                                label="Arrival time"
                                                labelOnTop
                                                onChange={(e) =>
                                                    handleSegmentField(
                                                        segIdx,
                                                        'arrivalTime',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        )}
                    </Grid>
                ),
            )}
            {showSegments && (
                <Grid item lg={12} xs={12} className="py-5">
                    <button
                        type="button"
                        className="flight-segment-add"
                        onClick={handleAddSegment}
                    >
                        + Add segment (stopover)
                    </button>
                </Grid>
            )}
            {showCost && (
                <Grid item lg={12} xs={12} className="py-5">
                    <InputField
                        defaultValue={place.cost ? String(place.cost) : ''}
                        name="cost"
                        label="Cost (optional)"
                        required={false}
                        onChange={(e) => handleOnChange('cost', e.target.value)}
                    />
                </Grid>
            )}
        </Grid>
    );
};

export default FlightForm;
