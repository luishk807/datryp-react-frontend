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
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                        aria-label={t('addForms.activity.hotel.sideAria')}
                    >
                        <span
                            className="hotel-side-thumb"
                            aria-hidden="true"
                        />
                        {[
                            {
                                value: ACTIVITY_KIND.HOTEL_CHECKIN,
                                label: t('addForms.activity.hotel.side.checkin'),
                                Icon: LoginRoundedIcon,
                            },
                            {
                                value: ACTIVITY_KIND.HOTEL_CHECKOUT,
                                label: t('addForms.activity.hotel.side.checkout'),
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
                        topic={t('addForms.activity.hotel.suggestionsTopic')}
                        headingPrefix={t(
                            'addForms.activity.hotel.suggestionsHeadingPrefix',
                        )}
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
                                        ? t(
                                              'addForms.activity.hotel.smartPlaceholderScoped',
                                              { country: countryScope },
                                          )
                                        : t(
                                              'addForms.activity.hotel.smartPlaceholder',
                                          )
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
                                    ? t('addForms.activity.hotel.lookingUp')
                                    : countryScope
                                      ? t(
                                            'addForms.activity.hotel.hintScoped',
                                            { country: countryScope },
                                        )
                                      : t('addForms.activity.hotel.hint')}
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
                                    item.country
                                        ? t(
                                              'addForms.activity.hotel.wrongCountryWithCountry',
                                              {
                                                  name: item.name,
                                                  country: countryScope,
                                                  itemCountry: item.country,
                                              },
                                          )
                                        : t(
                                              'addForms.activity.hotel.wrongCountry',
                                              {
                                                  name: item.name,
                                                  country: countryScope,
                                              },
                                          ),
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
                                        t(
                                            'addForms.activity.hotel.bareMatch',
                                            { name: item.name },
                                        ),
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
                                    ? t('addForms.activity.hotel.nameScoped', {
                                          country: countryScope,
                                      })
                                    : t('addForms.activity.hotel.name')
                            }
                            placeholder={t(
                                'addForms.activity.hotel.namePlaceholder',
                            )}
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            value={place.location ?? ''}
                            name="location"
                            label={t('addForms.activity.hotel.addressOptional')}
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
                                    ? t('addForms.activity.hotel.checkinTime')
                                    : t('addForms.activity.hotel.checkoutTime')
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
                            label={t(
                                'addForms.activity.hotel.confirmationOptional',
                            )}
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
                                    ? t('addForms.activity.hotel.costStayOptional')
                                    : t('addForms.activity.hotel.costOptional')
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
                            label={t('addForms.activity.hotel.notesOptional')}
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
