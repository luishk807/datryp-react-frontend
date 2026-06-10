import {
    CircularProgress,
    Grid,
    InputAdornment,
    TextField,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InputField from 'components/common/FormFields/InputField';
import PlaceAutocomplete from 'components/common/PlaceAutocomplete';
import PlaceSuggestions from 'components/common/PlaceSuggestions';
import PlaceSmartEntryWatcher from '../../PlaceSmartEntryWatcher';
import { ADD_METHOD } from 'constants';
import type { ImageRef, PlaceRecommendation } from 'types';
import type { FormController, FormMode } from '../../types';

export interface PlaceFormProps {
    controller: FormController;
    mode: FormMode;
}

/** PLACE-kind form body. Edit mode renders the full manual form; the ADD
 *  wizard renders only the slice for the chosen method (suggestions /
 *  smart / custom), keeping the collapsible "details" affordance under
 *  suggestions/smart so a pick can still be refined in place. */
const PlaceForm = ({ controller, mode }: PlaceFormProps) => {
    const {
        place,
        countryScope,
        cityScope,
        handleOnChange,
        handlePlacePicked,
        firePlaceSuggest,
        handleImageChange,
        placeSmartEntry,
        setPlaceSmartEntry,
        placeSmartLoading,
        setPlaceSmartLoading,
        placeSuggestLoading,
        placeSmartWarning,
        setPlaceSmartWarning,
        setPlaceDetailsExpanded,
        sameCountry,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const showSuggestions = method === ADD_METHOD.SUGGESTIONS;
    const showSmart = method === ADD_METHOD.SMART;
    const showCustom = method === ADD_METHOD.CUSTOM;
    // Smart mode shows only the search box + its parse hint — the watcher
    // still populates the draft silently so Step 3 review reflects the
    // pick; the user verifies / fixes there via Edit. Suggestions reveals
    // the detail fields once a pick fills name/location (so the user can
    // tweak it in place); custom + edit show the fields outright.
    const suggestionsHasContent =
        Boolean(place.name?.trim()) || Boolean(place.location?.trim());
    const detailsVisible =
        isEdit ||
        showCustom ||
        (showSuggestions && suggestionsHasContent);

    return (
        <Grid container>
            {showSuggestions && countryScope && (
                <Grid item lg={12} xs={12} className="py-5">
                    <PlaceSuggestions
                        country={countryScope}
                        city={cityScope}
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
                                value={placeSmartEntry}
                                onChange={(e) =>
                                    setPlaceSmartEntry(e.target.value)
                                }
                                placeholder={
                                    countryScope
                                        ? `e.g. "Ankole Grill at 10am-12pm, around $50" — searched in ${countryScope}`
                                        : 'e.g. "Ankole Grill at 10am-12pm, around $50", or paste a Google Maps link'
                                }
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            {placeSmartLoading ? (
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
                                {placeSmartLoading
                                    ? 'Looking up the place…'
                                    : countryScope
                                      ? `Type a place or paste a Maps / Yelp link — we'll search ${countryScope} and fill in the rest.`
                                      : "Type a place or paste a Maps / Yelp link — we'll fill in the rest."}
                            </span>
                        </div>
                        {/* Hold the bare-match "couldn't find" warning until
                            the search AND the AI field-suggest both settle —
                            otherwise it flashes "couldn't find" before the
                            suggest backfills the location and the place
                            actually resolves. */}
                        {placeSmartWarning &&
                            !placeSmartLoading &&
                            !placeSuggestLoading && (
                                <div className="flight-smart-entry-warning">
                                    {placeSmartWarning}
                                </div>
                            )}
                    </div>
                    <PlaceSmartEntryWatcher
                        rawInput={placeSmartEntry}
                        country={countryScope}
                        onResult={(item: PlaceRecommendation, parsed, extras) => {
                            // Keep the raw pasted link as the activity's
                            // source URL — but only when the user actually
                            // pasted a URL (not a typed place name). Rendered
                            // as a "View source" link on the place card.
                            const trimmedEntry = placeSmartEntry.trim();
                            const pastedUrl = /^https?:\/\//i.test(trimmedEntry)
                                ? trimmedEntry
                                : undefined;
                            const isWrongCountry =
                                Boolean(countryScope) &&
                                !extras?.fromScrape &&
                                !sameCountry(countryScope, item.country);
                            const isBareMatch =
                                item.latitude == null &&
                                item.longitude == null &&
                                !extras?.formattedAddress?.trim();
                            if (isWrongCountry) {
                                setPlaceSmartWarning(
                                    `Couldn't find “${item.name}” in ${countryScope}` +
                                        (item.country
                                            ? ` — closest match is in ${item.country}.`
                                            : '.') +
                                        ` Add it manually using the details form below, or prefix the search with # to keep this exact name.`,
                                );
                                return;
                            }
                            if (isBareMatch) {
                                // A deliberately-pasted link we couldn't
                                // enrich gets the friendly Pro nudge (name
                                // still fills below) rather than a harsh
                                // "couldn't find" — the user told us the
                                // place via the link.
                                setPlaceSmartWarning(
                                    extras?.addressUpsell ??
                                        `Couldn't find an exact match for “${item.name}”. Fill in the location / cost / time using the form below.`,
                                );
                                handleOnChange('name', item.name);
                                if (pastedUrl) {
                                    handleOnChange('sourceUrl', pastedUrl);
                                }
                                if (parsed.startTime) {
                                    handleOnChange('startTime', parsed.startTime);
                                }
                                if (parsed.endTime) {
                                    handleOnChange('endTime', parsed.endTime);
                                }
                                if (parsed.cost != null) {
                                    handleOnChange('cost', String(parsed.cost));
                                }
                                setPlaceDetailsExpanded(true);
                                // Name-only entry resolved — let the AI
                                // backfill location / city / country / time
                                // / cost for any field still empty.
                                firePlaceSuggest({
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
                            setPlaceSmartWarning(extras?.addressUpsell ?? null);
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
                                sourceUrl: pastedUrl ?? null,
                                googleRating: extras?.googleRating ?? null,
                                googleRatingCount:
                                    extras?.googleRatingCount ?? null,
                            });
                            if (parsed.startTime) {
                                handleOnChange('startTime', parsed.startTime);
                            }
                            if (parsed.endTime) {
                                handleOnChange('endTime', parsed.endTime);
                            }
                            if (parsed.cost != null) {
                                handleOnChange('cost', String(parsed.cost));
                            }
                            setPlaceDetailsExpanded(true);
                            // Place resolved (name + location/coords) —
                            // AI backfills any empty time / cost. Location
                            // is already filled by the pick above, so the
                            // empty-only guards in firePlaceSuggest skip it.
                            firePlaceSuggest({
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
                        onLoadingChange={setPlaceSmartLoading}
                        onWarning={setPlaceSmartWarning}
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
                            label={
                                countryScope
                                    ? `Activity name (or place in ${countryScope})`
                                    : 'Activity name'
                            }
                            placeholder="Type a place to get AI suggestions, or any activity (e.g. 'Check out of hotel')"
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.location ?? ''}
                            name="location"
                            label="Location (optional)"
                            required={false}
                            onChange={(e) =>
                                handleOnChange('location', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.cost ? String(place.cost) : ''}
                            name="cost"
                            onChange={(e) =>
                                handleOnChange('cost', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={6} xs={12} className="py-5">
                        <InputField
                            value={place.startTime ?? ''}
                            name="startTime"
                            type="time"
                            label="Start Time"
                            onChange={(e) =>
                                handleOnChange('startTime', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                        <InputField
                            value={place.endTime ?? ''}
                            name="endTime"
                            type="time"
                            label="End Time"
                            onChange={(e) =>
                                handleOnChange('endTime', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.note ?? ''}
                            name="note"
                            onChange={(e) =>
                                handleOnChange('note', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        {place.image?.url && (
                            <div className="place-image-preview">
                                <img
                                    src={place.image.url}
                                    alt={
                                        place.image.name ??
                                        place.name ??
                                        'Activity image'
                                    }
                                />
                                <button
                                    type="button"
                                    className="place-image-preview-clear"
                                    onClick={() =>
                                        handleOnChange(
                                            'image',
                                            undefined as unknown as ImageRef,
                                        )
                                    }
                                    aria-label="Remove image"
                                >
                                    <CloseRoundedIcon fontSize="small" />
                                </button>
                            </div>
                        )}
                        <InputField
                            type="file"
                            label="image"
                            name="image"
                            onChange={handleImageChange}
                        />
                    </Grid>
                </>
            )}
        </Grid>
    );
};

export default PlaceForm;
