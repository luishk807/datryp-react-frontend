import { Grid, InputAdornment, TextField } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import InputField from 'components/common/FormFields/InputField';
import TransitFields from 'components/common/TransportFields/TransitFields';
import TransitSegmentLookupWatcher from '../../TransitSegmentLookupWatcher';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { TransitInfo } from 'types';
import type { FormController, FormMode } from '../../types';

export interface TransitFormProps {
    controller: FormController;
    mode: FormMode;
}

// Ground-transport mode segments, in display order. The toggle is a
// 4-position slider (Train | Bus | Rental car | Other); the active kind's
// index drives the generic `is-pos-N` modifier that slides the thumb
// (1-based, so position = index + 1).
const TRANSIT_MODES = [
    {
        value: ACTIVITY_KIND.TRAIN,
        modeKey: 'train',
        Icon: DirectionsTransitRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.BUS,
        modeKey: 'bus',
        Icon: DirectionsBusRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.RENTAL_CAR,
        modeKey: 'rentalCar',
        Icon: CarRentalRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.OTHER,
        modeKey: 'other',
        Icon: LocalTaxiRoundedIcon,
    },
] as const;

/** TRANSPORT/Ground form body (train / bus / rental car / other). The in-form
 *  mode toggle + smart entry are ADD-only; the per-segment fields render via
 *  the shared `TransitFields` cards — identical to the destination editor. */
const TransitForm = ({ controller, mode }: TransitFormProps) => {
    const { t } = useTranslation();
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
        tripMinDate,
        tripMaxDate,
    } = controller;

    const isEdit = mode === 'edit';
    const method = isEdit ? null : mode.method;
    const showSmart = method === ADD_METHOD.SMART;
    const showCustom = method === ADD_METHOD.CUSTOM;
    // Smart mode shows only the search box + its parse hint — the parser still
    // populates the draft silently (via the invisible watchers below) so Step
    // 3 review reflects what was typed. The per-segment fields only render for
    // custom + edit, where the user fills them by hand.
    const detailsVisible = isEdit || showCustom;

    const activeModeIdx = TRANSIT_MODES.findIndex((m) => m.value === place.kind);
    // Default to position 1 (Train) when the kind isn't one of the four
    // (shouldn't happen — TransitForm only renders for transit kinds).
    const thumbPos = activeModeIdx >= 0 ? activeModeIdx + 1 : 1;
    const ModeIcon = TRANSIT_MODES[activeModeIdx]?.Icon;

    const isRental = place.kind === ACTIVITY_KIND.RENTAL_CAR;
    const isTrain = place.kind === ACTIVITY_KIND.TRAIN;
    // Rental cars deliberately have no lookup (their "number" is a private
    // booking confirmation). Train + bus get the schedule lookup.
    const hasLookup =
        place.kind === ACTIVITY_KIND.TRAIN ||
        place.kind === ACTIVITY_KIND.BUS;

    const operatorPlaceholder = isRental
        ? 'e.g. Hertz, Avis'
        : isTrain
          ? 'e.g. Renfe, JR'
          : 'e.g. Renfe, JR, Uber';

    const segments = place.transitSegments ?? [
        emptyTransitSegment(isoDefaultDate),
    ];

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
                        aria-label={t('addForms.activity.transit.modeAria')}
                    >
                        <span
                            className="hotel-side-thumb"
                            aria-hidden="true"
                        />
                        {TRANSIT_MODES.map(({ value, modeKey, Icon }) => {
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
                                    <span>
                                        {t(
                                            `addForms.activity.transit.modes.${modeKey}`,
                                        )}
                                    </span>
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
                                        ? t(
                                              'addForms.activity.transit.smartPlaceholderRental',
                                          )
                                        : place.kind === ACTIVITY_KIND.OTHER
                                          ? t(
                                                'addForms.activity.transit.smartPlaceholderOther',
                                            )
                                          : t(
                                                'addForms.activity.transit.smartPlaceholder',
                                            )
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
                            <span>{t('addForms.activity.transit.hint')}</span>
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
                schedule lookup running so the draft is enriched (stations /
                dates / times) for the Step 3 review. Rental cars have no
                lookup, mirroring the visible-UI gate below. */}
            {showSmart &&
                hasLookup &&
                (place.transitSegments ?? []).map((segment, segIdx) => (
                    <TransitSegmentLookupWatcher
                        key={`smart-watch-${segIdx}`}
                        operator={segment.operator}
                        number={segment.number}
                        kind={
                            place.kind === ACTIVITY_KIND.TRAIN ? 'train' : 'bus'
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
                            label={t('addForms.activity.transit.tripName')}
                            required={false}
                            onChange={(e) =>
                                handleOnChange('name', e.target.value)
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <TransitFields
                            tripMinDate={tripMinDate}
                            tripMaxDate={tripMaxDate}
                            segments={segments}
                            isRental={isRental}
                            isoDefaultDate={isoDefaultDate ?? ''}
                            ModeIcon={ModeIcon}
                            // TransitInfo is all-string, so this satisfies the
                            // controller's generic signature directly.
                            onField={handleTransitField}
                            onAddLeg={handleAddTransitSegment}
                            onRemoveLeg={handleRemoveTransitSegment}
                            addLegLabel={
                                isRental
                                    ? t('addForms.activity.transit.addStopover')
                                    : t('addForms.activity.transit.addLeg')
                            }
                            renderSegmentExtra={(segIdx, open) =>
                                open && hasLookup ? (
                                    <>
                                        <TransitSegmentLookupWatcher
                                            operator={segments[segIdx]?.operator}
                                            number={segments[segIdx]?.number}
                                            kind={
                                                place.kind ===
                                                ACTIVITY_KIND.TRAIN
                                                    ? 'train'
                                                    : 'bus'
                                            }
                                            departDate={
                                                segments[segIdx]?.departDate
                                            }
                                            country={countryScope}
                                            onResult={(result) => {
                                                applyTransitLookup(
                                                    segIdx,
                                                    result,
                                                );
                                                setTransitLookupNotFound(
                                                    (prev) => {
                                                        if (!(segIdx in prev))
                                                            return prev;
                                                        const next = {
                                                            ...prev,
                                                        };
                                                        delete next[segIdx];
                                                        return next;
                                                    },
                                                );
                                            }}
                                            onLoadingChange={(loading) =>
                                                handleTransitLookupLoadingChange(
                                                    segIdx,
                                                    loading,
                                                )
                                            }
                                            onNotFound={(label) =>
                                                setTransitLookupNotFound(
                                                    (prev) => ({
                                                        ...prev,
                                                        [segIdx]: label,
                                                    }),
                                                )
                                            }
                                        />
                                        <div className="flight-segment-hint">
                                            {transitLookupLoading.has(
                                                segIdx,
                                            ) ? (
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
                                                {transitLookupLoading.has(
                                                    segIdx,
                                                )
                                                    ? t(
                                                          'addForms.activity.transit.lookingUp',
                                                      )
                                                    : transitLookupNotFound[
                                                            segIdx
                                                        ]
                                                      ? t(
                                                            'addForms.activity.transit.lookupNotFound',
                                                            {
                                                                label: transitLookupNotFound[
                                                                    segIdx
                                                                ],
                                                            },
                                                        )
                                                      : t(
                                                            'addForms.activity.transit.lookupIdle',
                                                        )}
                                            </span>
                                        </div>
                                    </>
                                ) : null
                            }
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} className="py-5">
                        <InputField
                            defaultValue={place.cost ? String(place.cost) : ''}
                            name="cost"
                            label={t('addForms.common.costOptional')}
                            required={false}
                            onChange={(e) =>
                                handleOnChange('cost', e.target.value)
                            }
                        />
                    </Grid>
                </>
            )}
        </Grid>
    );
};

export default TransitForm;
