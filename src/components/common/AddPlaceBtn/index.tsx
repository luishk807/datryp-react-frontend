import { useState, useRef, useEffect, type ComponentType } from 'react';
import { Grid } from '@mui/material';
import { now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import { type DropdownOption } from 'components/common/FormFields/DropDown';
import classNames from 'classnames';
import { ACTION, ACTIVITY_KIND, BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import './index.scss';
import type {
    Activity,
    ActivityKind,
    AddEditButtonProps,
    FlightInfo,
    Friend,
    ImageRef,
} from 'types';

const PLACE_LABEL = {
    ADD: 'Add Activity',
    EDIT: 'Edit',
    SAVE: 'Save Activity',
} as const;

interface PlaceDraft {
    id?: number;
    /** What kind of activity this entry is — picked once via the
     *  toggle at the top of the modal. Persisted on save; locked on
     *  edit (the toggle hides). */
    kind?: ActivityKind;
    name?: string;
    location?: string;
    cost?: string | number;
    startTime?: string;
    endTime?: string;
    note?: string;
    status?: DropdownOption;
    image?: ImageRef;
    friends?: Friend[];
    /** Only populated when `kind === 'flight'`. */
    flightInfo?: FlightInfo;
}

export interface AddPlaceBtnProps extends AddEditButtonProps<PlaceDraft, Activity> {
    tripTypeId?: number;
    /** Country scope for the AI autocomplete — keeps a Spain trip from
     *  suggesting the Eiffel Tower. Omit for a global search. */
    countryScope?: string;
    /** When set, the modal trigger renders as an icon-only button with
     *  this icon (no text label). Use for inline edit affordances next to
     *  an activity title. Falls back to the text/standard button when omitted. */
    triggerIcon?: ComponentType<{ fontSize?: 'inherit' | 'small' | 'medium' | 'large' }>;
    /** Optional class for the modal trigger — used by inline edit pencils
     *  that want compact MUI IconButton-style padding. */
    triggerClassName?: string;
}

const AddPlaceBtn = ({
    onChange,
    type = ACTION.ADD,
    data = null,
    tripTypeId,
    countryScope,
    triggerIcon,
    triggerClassName,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
}: AddPlaceBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);

    const isAdd = type === ACTION.ADD;

    // Preserve an existing place's status on edit; leave undefined on add so
    // the activity card defaults to the "Planning" badge. The toggle on the
    // card flips to a real UUID-bearing status once the user clicks it.
    const existingStatus: DropdownOption | undefined =
        data && typeof data.status === 'object' && data.status
            ? (data.status as DropdownOption)
            : undefined;

    // Treat a missing `kind` as 'place' so activities created before the
    // kind toggle shipped continue to render with the place form on
    // edit.
    const existingKind: ActivityKind =
        (data?.kind as ActivityKind | undefined) ?? ACTIVITY_KIND.PLACE;

    const buildInitialPlace = (): PlaceDraft => ({
        kind: isAdd ? ACTIVITY_KIND.PLACE : existingKind,
        startTime: now('HH:mm'),
        endTime: now('HH:mm'),
        status: existingStatus,
    });

    const [place, setPlace] = useState<PlaceDraft>(buildInitialPlace);
    const [formKey, setFormKey] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleOnChange = <K extends keyof PlaceDraft>(name: K, value: PlaceDraft[K] | Friend) => {
        setError(null);
        setPlace((prev) => {
            if (name === 'friends') {
                const next = Array.isArray(prev.friends)
                    ? [...prev.friends, value as Friend]
                    : [value as Friend];
                return { ...prev, friends: next };
            }
            return { ...prev, [name]: value as PlaceDraft[K] };
        });
    };

    /** Update one field on the nested FlightInfo. Creates the object on
     *  first edit so we don't churn it for non-flight kinds. */
    const handleFlightField = <K extends keyof FlightInfo>(
        name: K,
        value: FlightInfo[K]
    ) => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            flightInfo: { ...(prev.flightInfo ?? {}), [name]: value },
        }));
    };

    /** Kind toggle handler — only callable from the ADD flow (the
     *  toggle is hidden on EDIT). Resets fields that don't apply to
     *  the new kind so an in-progress place doesn't bleed cost / note
     *  into a flight draft when the user changes their mind. */
    const handleKindChange = (next: ActivityKind) => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            kind: next,
            // Carry the name across (it's relevant to all three kinds).
            // Drop kind-specific fields so the user starts fresh on the
            // new form.
            location: next === ACTIVITY_KIND.PLACE ? prev.location : undefined,
            cost: next === ACTIVITY_KIND.PLACE ? prev.cost : undefined,
            image: next === ACTIVITY_KIND.PLACE ? prev.image : undefined,
            startTime:
                next === ACTIVITY_KIND.NOTE ? undefined : prev.startTime ?? now('HH:mm'),
            endTime:
                next === ACTIVITY_KIND.NOTE ? undefined : prev.endTime ?? now('HH:mm'),
            flightInfo: next === ACTIVITY_KIND.FLIGHT ? prev.flightInfo ?? {} : undefined,
        }));
    };

    /** AI suggestion picked from PlaceAutocomplete — prefill name + location
     *  + image in one go. The user can still edit any of them before saving. */
    const handlePlacePicked = (suggestion: PlaceSuggestion) => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            name: suggestion.name,
            location: suggestion.location,
            image: suggestion.imageUrl
                ? { url: suggestion.imageUrl, name: suggestion.name }
                : prev.image,
        }));
    };

    const handleImageChange = (e: { target: { value: string } } | React.ChangeEvent<HTMLInputElement>) => {
        const target = (e as React.ChangeEvent<HTMLInputElement>).target;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            handleOnChange('image', { url: String(reader.result), name: file.name });
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const kind = place.kind ?? ACTIVITY_KIND.PLACE;
        const missing: string[] = [];

        // Required-field rules differ per kind. Notes are timeless so
        // start/end time aren't checked; flights need a flight number
        // and depart datetime; places need a name + time window.
        if (kind === ACTIVITY_KIND.NOTE) {
            if (!place.name?.trim()) missing.push('title');
            if (!place.note?.trim()) missing.push('note text');
        } else if (kind === ACTIVITY_KIND.FLIGHT) {
            const f = place.flightInfo ?? {};
            if (!f.flightNumber?.trim()) missing.push('flight number');
            if (!f.departAirport?.trim()) missing.push('depart airport');
            if (!f.arrivalAirport?.trim()) missing.push('arrival airport');
            if (!f.departDate?.trim()) missing.push('depart date');
            if (!f.departTime?.trim()) missing.push('depart time');
        } else {
            if (!place.name?.trim()) missing.push('name');
            if (!place.startTime?.trim()) missing.push('start time');
            if (!place.endTime?.trim()) missing.push('end time');
        }

        if (missing.length) {
            setError(`Please provide ${missing.join(', ')}.`);
            return;
        }
        setError(null);
        modelRef.current?.closeModal();

        // For a flight, synthesize a sensible name from the airports so
        // the timeline card has something to render — `flight number`
        // alone reads as a bare code.
        const finalName =
            kind === ACTIVITY_KIND.FLIGHT
                ? place.name?.trim() ||
                  `${place.flightInfo?.departAirport ?? ''} → ${
                      place.flightInfo?.arrivalAirport ?? ''
                  }`.trim()
                : place.name;

        onChange?.({ ...place, kind, name: finalName });
        if (type === ACTION.ADD) {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
        }
    };

    useEffect(() => {
        setError(null);
        if (data && type === ACTION.EDIT) {
            const dataKind: ActivityKind =
                (data.kind as ActivityKind | undefined) ?? ACTIVITY_KIND.PLACE;
            setPlace({
                id: data.id,
                kind: dataKind,
                name: data.name,
                // Notes are timeless — strip start/end on edit so the
                // form doesn't surface stale values from a different
                // kind. Flights carry their times inside `flightInfo`.
                startTime:
                    dataKind === ACTIVITY_KIND.NOTE
                        ? undefined
                        : data.startTime || now('HH:mm'),
                endTime:
                    dataKind === ACTIVITY_KIND.NOTE
                        ? undefined
                        : data.endTime || now('HH:mm'),
                location: data.location,
                cost: data.cost,
                note: data.note,
                status:
                    data.status && typeof data.status === 'object'
                        ? (data.status as DropdownOption)
                        : undefined,
                image: data.image,
                flightInfo:
                    dataKind === ACTIVITY_KIND.FLIGHT
                        ? data.flightInfo ?? {}
                        : undefined,
            });
        } else {
            setPlace(buildInitialPlace());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, type]);

    if (isViewMode) return null;

    const modalElement = (
        <ModalButton
            ref={modelRef}
            title={isAdd ? PLACE_LABEL.ADD : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`}
            buttonProps={
                triggerIcon
                    ? {
                          // Icon-only trigger — no text label so it sits
                          // tight next to an activity title.
                          title: '',
                          Icon: triggerIcon,
                          type: BUTTON_VARIANT.TEXT_PLAIN,
                          className: triggerClassName,
                          iconProps: { fontSize: 'small' },
                          ariaLabel: isAdd
                              ? PLACE_LABEL.ADD
                              : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`,
                      }
                    : {
                          title: isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.EDIT,
                          Icon:
                              buttonType === BUTTON_VARIANT.STANDARD
                                  ? AddCircleIcon
                                  : null,
                          type: buttonType,
                      }
            }
        >
                    <Grid container key={formKey}>
                        {isAdd && (
                            <Grid
                                item
                                lg={12}
                                md={12}
                                xs={12}
                                className={classNames(
                                    'add-place-kind-toggle',
                                    `is-${place.kind ?? ACTIVITY_KIND.PLACE}`
                                )}
                                role="tablist"
                                aria-label="Activity kind"
                            >
                                {/* Sliding pill behind the buttons —
                                    same pattern as `.home-hero-options`
                                    on the Home trip-type toggle. The
                                    `is-{kind}` modifier on the
                                    container translates the thumb. */}
                                <span
                                    className="add-place-kind-thumb"
                                    aria-hidden="true"
                                />
                                {[
                                    {
                                        value: ACTIVITY_KIND.PLACE,
                                        label: 'Place',
                                        Icon: PlaceRoundedIcon,
                                    },
                                    {
                                        value: ACTIVITY_KIND.NOTE,
                                        label: 'Note',
                                        Icon: StickyNote2RoundedIcon,
                                    },
                                    {
                                        value: ACTIVITY_KIND.FLIGHT,
                                        label: 'Flight',
                                        Icon: FlightRoundedIcon,
                                    },
                                ].map(({ value, label, Icon }) => {
                                    const active = (place.kind ?? ACTIVITY_KIND.PLACE) === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            className={classNames('add-place-kind-btn', {
                                                selected: active,
                                            })}
                                            onClick={() => handleKindChange(value)}
                                        >
                                            <Icon className="add-place-kind-icon" fontSize="small" />
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </Grid>
                        )}
                        <Grid item lg={12} md={12} xs={12} id="add-place-form-container">
                            {(place.kind ?? ACTIVITY_KIND.PLACE) === ACTIVITY_KIND.PLACE && (
                                <Grid container>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <PlaceAutocomplete
                                            value={place.name ?? ''}
                                            onTextChange={(text) =>
                                                handleOnChange('name', text)
                                            }
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
                                            defaultValue={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            onChange={(e) => handleOnChange('cost', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5">
                                        <InputField
                                            value={place.startTime ?? ''}
                                            name="startTime"
                                            type="time"
                                            label="Start Time"
                                            onChange={(e) => handleOnChange('startTime', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                        <InputField
                                            value={place.endTime ?? ''}
                                            name="endTime"
                                            type="time"
                                            label="End Time"
                                            onChange={(e) => handleOnChange('endTime', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            defaultValue={place.note}
                                            name="note"
                                            onChange={(e) => handleOnChange('note', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            type="file"
                                            label="image"
                                            name="image"
                                            onChange={handleImageChange}
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {place.kind === ACTIVITY_KIND.NOTE && (
                                <Grid container>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.name ?? ''}
                                            name="name"
                                            label="Title"
                                            onChange={(e) =>
                                                handleOnChange('name', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.note ?? ''}
                                            name="note"
                                            label="Note"
                                            onChange={(e) =>
                                                handleOnChange('note', e.target.value)
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {place.kind === ACTIVITY_KIND.FLIGHT && (
                                <Grid container>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.flightInfo?.flightNumber ?? ''}
                                            name="flightNumber"
                                            label="Flight number"
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'flightNumber',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5">
                                        <InputField
                                            value={place.flightInfo?.departAirport ?? ''}
                                            name="departAirport"
                                            label="Depart airport (IATA)"
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'departAirport',
                                                    e.target.value.toUpperCase()
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                        <InputField
                                            value={place.flightInfo?.arrivalAirport ?? ''}
                                            name="arrivalAirport"
                                            label="Arrival airport (IATA)"
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'arrivalAirport',
                                                    e.target.value.toUpperCase()
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5">
                                        <InputField
                                            value={place.flightInfo?.departDate ?? ''}
                                            name="departDate"
                                            type="date"
                                            label="Depart date"
                                            labelOnTop
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'departDate',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                        <InputField
                                            value={place.flightInfo?.departTime ?? ''}
                                            name="departTime"
                                            type="time"
                                            label="Depart time"
                                            labelOnTop
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'departTime',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5">
                                        <InputField
                                            value={place.flightInfo?.arrivalDate ?? ''}
                                            name="arrivalDate"
                                            type="date"
                                            label="Arrival date"
                                            labelOnTop
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'arrivalDate',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                        <InputField
                                            value={place.flightInfo?.arrivalTime ?? ''}
                                            name="arrivalTime"
                                            type="time"
                                            label="Arrival time"
                                            labelOnTop
                                            onChange={(e) =>
                                                handleFlightField(
                                                    'arrivalTime',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}
                        </Grid>
                        {error && (
                            <Grid item lg={12} md={12} xs={12}>
                                <ErrorAlert>{error}</ErrorAlert>
                            </Grid>
                        )}
                        <Grid item lg={12} md={12} xs={12}>
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
    );

    // Icon-only trigger: render bare so the trigger sits inline next to
    // surrounding flex items (e.g. activity title + status pill). The Grid
    // wrappers used by the standard/text variants force a full-width row
    // and push the trigger below the title.
    if (triggerIcon) {
        return modalElement;
    }

    return (
        <Grid
            container
            className={classNames({
                'add-place-container-standard': buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
            })}
        >
            <Grid
                item
                lg={12}
                md={12}
                xs={12}
                className={classNames({
                    'place-left': tripTypeId === TRIP_BASIC.MULTIPLE.id,
                })}
            >
                {modalElement}
            </Grid>
        </Grid>
    );
};

export default AddPlaceBtn;
