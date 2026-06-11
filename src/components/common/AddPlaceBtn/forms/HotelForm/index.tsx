import {
    CircularProgress,
    Grid,
    InputAdornment,
    TextField,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import classNames from 'classnames';
import InputField from 'components/common/FormFields/InputField';
import PlaceAutocomplete from 'components/common/PlaceAutocomplete';
import PlaceSuggestions from 'components/common/PlaceSuggestions';
import PlaceSmartEntryWatcher from '../../PlaceSmartEntryWatcher';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { PlaceRecommendation } from 'types';
import type { FormController, FormMode } from '../../types';

export interface HotelFormProps {
    controller: FormController;
    mode: FormMode;
}

/** HOTEL-kind form body (check-in / check-out). The in-form side toggle,
 *  suggestions strip, and smart entry are ADD-only; the editable details
 *  (name, address, time, confirmation, cost, notes) sit behind a "Show
 *  details" collapse — identical behavior on edit and add. */
const HotelForm = ({ controller, mode }: HotelFormProps) => {
    const {
        place,
        countryScope,
        cityScope,
        handleOnChange,
        handlePlacePicked,
        fireHotelSuggest,
        setPlace,
        hotelSmartEntry,
        setHotelSmartEntry,
        hotelSmartLoading,
        setHotelSmartLoading,
        hotelSmartWarning,
        setHotelSmartWarning,
        setHotelDetailsExpanded,
        sameCountry,
        smartEntryLocation,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const showSuggestions = method === ADD_METHOD.SUGGESTIONS;
    const showSmart = method === ADD_METHOD.SMART;
    const showCustom = method === ADD_METHOD.CUSTOM;
    // Smart mode shows only the search box + its parse hint — the watcher
    // still populates the draft silently so Step 3 review reflects the
    // pick; the user verifies / fixes there via Edit. Suggestions reveals
    // the detail fields once a pick fills name/address (so the user can
    // tweak it in place); custom + edit show the fields outright.
    const suggestionsHasContent =
        Boolean(place.name?.trim()) || Boolean(place.location?.trim());
    const detailsVisible =
        isEdit ||
        showCustom ||
        (showSuggestions && suggestionsHasContent);

    return (
        <Grid container>
            {!isEdit && (
                <Grid item lg={12} xs={12} className="pt-5 pb-0">
                    <div
                        className={classNames(
                            'hotel-side-toggle',
                            `is-${place.kind === ACTIVITY_KIND.HOTEL_CHECKOUT ? 'checkout' : 'checkin'}`,
                        )}
                        role="tablist"
                        aria-label="Hotel event side"
                    >
                        <span
                            className="hotel-side-thumb"
                            aria-hidden="true"
                        />
                        {[
                            {
                                value: ACTIVITY_KIND.HOTEL_CHECKIN,
                                label: 'Check-in',
                                Icon: LoginRoundedIcon,
                            },
                            {
                                value: ACTIVITY_KIND.HOTEL_CHECKOUT,
                                label: 'Check-out',
                                Icon: LogoutRoundedIcon,
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
            {showSuggestions && countryScope && (
                <Grid item lg={12} xs={12} className="pt-8 pb-5">
                    <PlaceSuggestions
                        country={countryScope}
                        city={cityScope}
                        topic="top hotels"
                        headingPrefix="Suggested hotels in"
                        collapsible={false}
                        showShuffle={false}
                        limit={10}
                        onPick={handlePlacePicked}
                    />
                </Grid>
            )}
            {showSmart && (
                <Grid item lg={12} xs={12} className="py-5">
                    <div className="flight-smart-entry">
                        <div className="flight-smart-entry-field">
                            <TextField
                                fullWidth
                                variant="outlined"
                                value={hotelSmartEntry}
                                onChange={(e) =>
                                    setHotelSmartEntry(e.target.value)
                                }
                                placeholder={
                                    countryScope
                                        ? `e.g. "Hilton Tokyo, check-in 3pm, $200" — searched in ${countryScope}`
                                        : 'e.g. "Hilton Tokyo, check-in 3pm, $200", or paste a Google Maps link'
                                }
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            {hotelSmartLoading ? (
                                                <CircularProgress
                                                    size={16}
                                                    className="flight-smart-entry-input-icon"
                                                />
                                            ) : (
                                                <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                            )}
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </div>
                        <div className="flight-smart-entry-hint">
                            <span>
                                {hotelSmartLoading
                                    ? 'Looking up the hotel…'
                                    : countryScope
                                      ? `Type a hotel, sentence, or paste a Google Maps / Yelp link. We'll search ${countryScope} and fill in the details below.`
                                      : "Type a hotel, sentence, or paste a Google Maps / Yelp link. We'll search and fill in the details below."}
                            </span>
                        </div>
                        {hotelSmartWarning && (
                            <div className="flight-smart-entry-warning">
                                {hotelSmartWarning}
                            </div>
                        )}
                    </div>
                    <PlaceSmartEntryWatcher
                        rawInput={hotelSmartEntry}
                        country={smartEntryLocation ?? countryScope}
                        onResult={(item: PlaceRecommendation, parsed, extras) => {
                            const isWrongCountry =
                                Boolean(countryScope) &&
                                !extras?.fromScrape &&
                                !sameCountry(countryScope, item.country);
                            const isBareMatch =
                                item.latitude == null &&
                                item.longitude == null &&
                                !extras?.formattedAddress?.trim();
                            if (isWrongCountry) {
                                setHotelSmartWarning(
                                    `Couldn't find “${item.name}” in ${countryScope}` +
                                        (item.country
                                            ? ` — closest match is in ${item.country}.`
                                            : '.') +
                                        ` Add it manually using the details form below, or prefix the search with # to keep this exact name.`,
                                );
                                return;
                            }
                            if (isBareMatch) {
                                // A deliberately-pasted link that we
                                // couldn't enrich gets the friendly Pro
                                // nudge (name still fills below) rather
                                // than a harsh "couldn't find" — the user
                                // told us the place via the link.
                                setHotelSmartWarning(
                                    extras?.addressUpsell ??
                                        `Couldn't find an exact match for “${item.name}”. Fill in the address / cost / time using the form below.`,
                                );
                                handleOnChange('name', item.name);
                                if (parsed.startTime) {
                                    handleOnChange('startTime', parsed.startTime);
                                }
                                if (parsed.cost != null) {
                                    handleOnChange('cost', String(parsed.cost));
                                }
                                if (parsed.confirmationNumber) {
                                    handleOnChange(
                                        'confirmationNumber',
                                        parsed.confirmationNumber,
                                    );
                                }
                                setHotelDetailsExpanded(true);
                                // Name-only hotel resolved — AI backfills
                                // any empty check-in/out time + cost.
                                fireHotelSuggest({
                                    name: item.name,
                                    city: item.city,
                                    country: item.country,
                                });
                                return;
                            }
                            // On a pasted link the watcher may hand back a
                            // Pro upsell (free tier: name + pin filled,
                            // street address held back) — surface it
                            // instead of clearing the hint.
                            setHotelSmartWarning(extras?.addressUpsell ?? null);
                            handlePlacePicked({
                                name: item.name,
                                location:
                                    extras?.formattedAddress?.trim() ||
                                    [item.city, item.country]
                                        .filter((s) => s && s.trim())
                                        .join(', '),
                                city: item.city,
                                country: item.country,
                                countryCode: item.countryCode,
                                imageUrl: item.imageUrl,
                                latitude: item.latitude,
                                longitude: item.longitude,
                                note: item.description,
                            });
                            if (parsed.startTime) {
                                handleOnChange('startTime', parsed.startTime);
                            }
                            if (parsed.cost != null) {
                                handleOnChange('cost', String(parsed.cost));
                            }
                            if (parsed.confirmationNumber) {
                                handleOnChange(
                                    'confirmationNumber',
                                    parsed.confirmationNumber,
                                );
                            }
                            if (
                                parsed.startTime ||
                                parsed.cost != null ||
                                parsed.confirmationNumber
                            ) {
                                setHotelDetailsExpanded(true);
                            }
                            // Hotel resolved its location — AI backfills
                            // any empty check-in/out time + cost.
                            fireHotelSuggest({
                                name: item.name,
                                location:
                                    extras?.formattedAddress?.trim() ||
                                    [item.city, item.country]
                                        .filter((s) => s && s.trim())
                                        .join(', '),
                                city: item.city,
                                country: item.country,
                            });
                        }}
                        onLoadingChange={setHotelSmartLoading}
                        onWarning={setHotelSmartWarning}
                    />
                </Grid>
            )}
            {detailsVisible && (
                <>
                    <Grid item lg={12} xs={12} className="py-5">
                        <PlaceAutocomplete
                            value={place.name ?? ''}
                            onTextChange={(text) => handleOnChange('name', text)}
                            onSelect={handlePlacePicked}
                            country={countryScope}
                            queryPrefix="hotel"
                            label={
                                countryScope
                                    ? `Hotel name (or search in ${countryScope})`
                                    : 'Hotel name'
                            }
                            placeholder="Type a hotel name — we'll suggest matches"
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.location ?? ''}
                            name="location"
                            label="Address (optional)"
                            required={false}
                            onChange={(e) =>
                                handleOnChange('location', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.startTime ?? ''}
                            name="startTime"
                            type="time"
                            label={
                                place.kind === ACTIVITY_KIND.HOTEL_CHECKIN
                                    ? 'Check-in time'
                                    : 'Check-out time'
                            }
                            labelOnTop
                            onChange={(e) =>
                                handleOnChange('startTime', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.confirmationNumber ?? ''}
                            name="confirmationNumber"
                            label="Confirmation # (optional)"
                            required={false}
                            onChange={(e) =>
                                handleOnChange(
                                    'confirmationNumber',
                                    e.target.value,
                                )
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.cost ? String(place.cost) : ''}
                            name="cost"
                            label={
                                place.kind === ACTIVITY_KIND.HOTEL_CHECKIN
                                    ? 'Cost (optional — total stay)'
                                    : 'Cost (optional)'
                            }
                            required={false}
                            onChange={(e) =>
                                handleOnChange('cost', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.note ?? ''}
                            name="note"
                            label="Notes (optional)"
                            required={false}
                            onChange={(e) =>
                                handleOnChange('note', e.target.value)
                            }
                        />
                    </Grid>
                </>
            )}
        </Grid>
    );
};

export default HotelForm;
