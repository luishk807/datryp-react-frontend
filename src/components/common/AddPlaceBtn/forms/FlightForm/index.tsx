import { Grid, InputAdornment, TextField } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import InputField from 'components/common/FormFields/InputField';
import FlightFields from 'components/common/TransportFields/FlightFields';
import FlightSegmentLookupWatcher from '../../FlightSegmentLookupWatcher';
import { ADD_METHOD } from 'constants';
import type { FlightInfo } from 'types';
import type { FormController, FormMode } from '../../types';

export interface FlightFormProps {
    controller: FormController;
    mode: FormMode;
}

/** FLIGHT-kind form body. Smart entry + the shared per-segment transport
 *  cards + cost. In the ADD wizard the smart-entry field shows only for the
 *  SMART method; the segment list (the "details") renders for custom + edit,
 *  where the user fills fields by hand. Both write into the same draft. */
const FlightForm = ({ controller, mode }: FlightFormProps) => {
    const {
        place,
        smartEntry,
        handleSmartEntry,
        handleOnChange,
        emptySegment,
        isoDefaultDate,
        handleRemoveSegment,
        applyFlightLookup,
        setLookupNotFound,
        handleLookupLoadingChange,
        lookupLoading,
        lookupNotFound,
        handleSegmentField,
        setArrivalCity,
        handleAddSegment,
        tripMinDate,
        tripMaxDate,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const isSmart = method === ADD_METHOD.SMART;
    const isCustom = method === ADD_METHOD.CUSTOM;
    const showSmart = isEdit || isSmart;
    // Smart view is just the text box + its parse hint — the parser still
    // populates the segments silently (via the invisible watchers below) so
    // Step 3 review reflects what was typed. The structured segment list +
    // cost only render for custom + edit, where the user fills fields by hand.
    const showSegments = isEdit || isCustom;
    const showCost = isEdit || isCustom;

    const segments = place.flightSegments ?? [emptySegment(isoDefaultDate)];

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
                                Type your flight(s) here and we&rsquo;ll look up
                                the airports, dates, and times — review or tweak
                                everything on the next step.
                            </span>
                        </div>
                    </div>
                </Grid>
            )}
            {/* Smart mode hides the segment UI but must keep the per-segment
                lookup running so the draft is enriched (airports / dates /
                times) for the Step 3 review. Mount an invisible watcher per
                parsed segment. */}
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
            {showSegments && (
                <Grid item lg={12} xs={12} className="py-5">
                    <FlightFields
                        segments={segments}
                        tripMinDate={tripMinDate}
                        tripMaxDate={tripMaxDate}
                        isoDefaultDate={isoDefaultDate ?? ''}
                        // The shared slot only writes the string fields
                        // (flight number, airports, dates, times); cast past
                        // the controller's generic FlightInfo[K] signature.
                        onField={
                            handleSegmentField as (
                                idx: number,
                                name: keyof FlightInfo,
                                value: string,
                            ) => void
                        }
                        onAddLeg={handleAddSegment}
                        onRemoveLeg={handleRemoveSegment}
                        onArrivalAirportMeta={(idx, meta) => {
                            if (idx === segments.length - 1) {
                                setArrivalCity(meta.city ?? null);
                            }
                        }}
                        renderSegmentExtra={(segIdx, open) =>
                            open ? (
                                <>
                                    <FlightSegmentLookupWatcher
                                        flightNumber={
                                            segments[segIdx]?.flightNumber
                                        }
                                        departDate={segments[segIdx]?.departDate}
                                        onResult={(result) => {
                                            applyFlightLookup(segIdx, result);
                                            setLookupNotFound((prev) => {
                                                if (!(segIdx in prev))
                                                    return prev;
                                                const next = { ...prev };
                                                delete next[segIdx];
                                                return next;
                                            });
                                        }}
                                        onLoadingChange={(loading) =>
                                            handleLookupLoadingChange(
                                                segIdx,
                                                loading,
                                            )
                                        }
                                        onNotFound={(num) =>
                                            setLookupNotFound((prev) => ({
                                                ...prev,
                                                [segIdx]: num,
                                            }))
                                        }
                                    />
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
                                    </div>
                                </>
                            ) : null
                        }
                    />
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
