import { useState, useRef, useEffect, type ComponentType } from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { Alert, Grid, Snackbar } from '@mui/material';
import { now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CommuteRoundedIcon from '@mui/icons-material/CommuteRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import PlaceSuggestions from 'components/common/PlaceSuggestions';
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
    TransitInfo,
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
    /** One entry per flight leg. Always present (with a single empty
     *  entry) once the kind toggle picks Flight, so the form has
     *  somewhere to write into. */
    flightSegments?: FlightInfo[];
    /** One entry per ground-transport leg (train / bus). Mirrors the
     *  flight-segment shape — a single entry covers a direct trip; a
     *  two-entry array covers a transfer. */
    transitSegments?: TransitInfo[];
    /** Hotel confirmation number for `hotel_checkin` / `hotel_checkout`
     *  kinds. Hotel name, address, time, and cost reuse the standard
     *  `name` / `location` / `startTime` / `cost` draft fields. */
    confirmationNumber?: string;
    /** Structured hotel info delivered on the onChange payload (the
     *  submit helper lifts `confirmationNumber` into this shape so the
     *  consumer's Activity stays clean). */
    hotelInfo?: { confirmationNumber?: string };
}

const emptySegment = (): FlightInfo => ({});
const emptyTransitSegment = (): TransitInfo => ({});

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
    // City of the most-recently picked arrival airport — drives the
    // optional auto-fetch of a hero image for the flight activity.
    // Resets when the modal closes or the kind toggles away from
    // FLIGHT.
    const [arrivalCity, setArrivalCity] = useState<string | null>(null);

    // Fetch one image for the arrival city. Reuses the recommendations
    // endpoint (already cached server-side) so this is essentially free
    // after the first lookup.
    const arrivalImageQuery = useSearchPlaces(
        arrivalCity?.trim() ? arrivalCity.trim() : '',
        1,
    );
    useEffect(() => {
        if (place.kind !== ACTIVITY_KIND.FLIGHT) return;
        const item = arrivalImageQuery.data?.items?.[0];
        if (!item?.imageUrl) return;
        if (place.image?.url === item.imageUrl) return;
        setPlace((prev) =>
            prev.image?.url
                ? prev
                : { ...prev, image: { url: item.imageUrl!, name: item.name } }
        );
        // Only react to a new image landing; intentionally narrow deps so
        // we don't loop on our own image-state writes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrivalImageQuery.data, place.kind]);

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

    /** Update one field on segment `index`. Initializes `flightSegments`
     *  with a single entry if it hasn't been populated yet (defensive —
     *  the kind toggle should already have done that). */
    const handleSegmentField = <K extends keyof FlightInfo>(
        index: number,
        name: K,
        value: FlightInfo[K]
    ) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.flightSegments?.length
                ? [...prev.flightSegments]
                : [emptySegment()];
            segments[index] = { ...segments[index], [name]: value };
            return { ...prev, flightSegments: segments };
        });
    };

    const handleAddSegment = () => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            flightSegments: [
                ...(prev.flightSegments ?? []),
                emptySegment(),
            ],
        }));
    };

    const handleRemoveSegment = (index: number) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.flightSegments ?? [];
            if (segments.length <= 1) return prev;
            return {
                ...prev,
                flightSegments: segments.filter((_, i) => i !== index),
            };
        });
    };

    /** Train / bus equivalents of the flight-segment helpers above. Kept
     *  parallel rather than abstracted into a single generic so each
     *  set's typing stays narrow (FlightInfo vs TransitInfo) and the
     *  forms can render kind-specific labels. */
    const handleTransitField = <K extends keyof TransitInfo>(
        index: number,
        name: K,
        value: TransitInfo[K]
    ) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.transitSegments?.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment()];
            segments[index] = { ...segments[index], [name]: value };
            return { ...prev, transitSegments: segments };
        });
    };

    const handleAddTransitSegment = () => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            transitSegments: [
                ...(prev.transitSegments ?? []),
                emptyTransitSegment(),
            ],
        }));
    };

    const handleRemoveTransitSegment = (index: number) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.transitSegments ?? [];
            if (segments.length <= 1) return prev;
            return {
                ...prev,
                transitSegments: segments.filter((_, i) => i !== index),
            };
        });
    };

    /** Kind toggle handler — only callable from the ADD flow (the
     *  toggle is hidden on EDIT). Resets fields that don't apply to
     *  the new kind so an in-progress place doesn't bleed cost / note
     *  into a flight draft when the user changes their mind.
     *
     *  Hotel + transit kinds share the standard top-level fields:
     *  - HOTEL_CHECKIN / HOTEL_CHECKOUT: name = hotel, location =
     *    address, startTime = check-in/out time, cost = stay cost,
     *    confirmationNumber on the draft.
     *  - TRAIN / BUS: top-level fields cover the headline display
     *    (name = "Train Renfe AVE 4123" or "Bus FlixBus N1900");
     *    structured per-leg data lives on transitSegments. */
    const handleKindChange = (next: ActivityKind) => {
        setError(null);
        if (next !== ACTIVITY_KIND.FLIGHT) {
            setArrivalCity(null);
        }
        const isHotel =
            next === ACTIVITY_KIND.HOTEL_CHECKIN ||
            next === ACTIVITY_KIND.HOTEL_CHECKOUT;
        const isTransit =
            next === ACTIVITY_KIND.TRAIN || next === ACTIVITY_KIND.BUS;
        setPlace((prev) => ({
            ...prev,
            kind: next,
            // Carry the name across (relevant to every kind). Drop the
            // bits that don't make sense on the new form. `location`
            // doubles as the hotel address on hotel kinds, so keep it
            // for PLACE + hotel; drop it elsewhere.
            location:
                next === ACTIVITY_KIND.PLACE || isHotel
                    ? prev.location
                    : undefined,
            cost:
                next === ACTIVITY_KIND.PLACE ||
                next === ACTIVITY_KIND.FLIGHT ||
                isHotel ||
                isTransit
                    ? prev.cost
                    : undefined,
            image: next === ACTIVITY_KIND.PLACE ? prev.image : undefined,
            // Notes carry no time slot; flights store time inside
            // flightSegments; transit kinds store time inside
            // transitSegments. Hotel + place use the top-level start
            // time, with end time only relevant for place.
            startTime:
                next === ACTIVITY_KIND.NOTE ||
                next === ACTIVITY_KIND.FLIGHT ||
                isTransit
                    ? undefined
                    : prev.startTime ?? now('HH:mm'),
            endTime:
                next === ACTIVITY_KIND.PLACE
                    ? prev.endTime ?? now('HH:mm')
                    : undefined,
            flightSegments:
                next === ACTIVITY_KIND.FLIGHT
                    ? prev.flightSegments?.length
                        ? prev.flightSegments
                        : [emptySegment()]
                    : undefined,
            transitSegments: isTransit
                ? prev.transitSegments?.length
                    ? prev.transitSegments
                    : [emptyTransitSegment()]
                : undefined,
            confirmationNumber: isHotel ? prev.confirmationNumber : undefined,
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
            const segments = place.flightSegments ?? [];
            if (!segments.length) missing.push('a flight segment');
            segments.forEach((seg, i) => {
                const label = segments.length > 1 ? ` (segment ${i + 1})` : '';
                if (!seg.flightNumber?.trim())
                    missing.push(`flight number${label}`);
                if (!seg.departAirport?.trim())
                    missing.push(`depart airport${label}`);
                if (!seg.arrivalAirport?.trim())
                    missing.push(`arrival airport${label}`);
                if (!seg.departDate?.trim())
                    missing.push(`depart date${label}`);
                if (!seg.departTime?.trim())
                    missing.push(`depart time${label}`);
            });
        } else if (
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT
        ) {
            // Hotel events: hotel name + the one relevant time. Address
            // / confirmation # are optional but encouraged via labels.
            const timeLabel =
                kind === ACTIVITY_KIND.HOTEL_CHECKIN
                    ? 'check-in time'
                    : 'check-out time';
            if (!place.name?.trim()) missing.push('hotel name');
            if (!place.startTime?.trim()) missing.push(timeLabel);
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS
        ) {
            // Train + bus: at least one segment with operator + number +
            // depart station + depart datetime. Arrival station + time
            // are encouraged but not required (the user might be
            // adding a partial booking before they know the arrival
            // time precisely).
            const segments = place.transitSegments ?? [];
            if (!segments.length) missing.push('a transit segment');
            segments.forEach((seg, i) => {
                const label = segments.length > 1 ? ` (leg ${i + 1})` : '';
                if (!seg.operator?.trim())
                    missing.push(`operator${label}`);
                if (!seg.number?.trim())
                    missing.push(
                        `${kind === ACTIVITY_KIND.TRAIN ? 'train' : 'bus'} number${label}`,
                    );
                if (!seg.departStation?.trim())
                    missing.push(`depart station${label}`);
                if (!seg.departDate?.trim())
                    missing.push(`depart date${label}`);
                if (!seg.departTime?.trim())
                    missing.push(`depart time${label}`);
            });
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

        // Synthesize a sensible default name for kinds whose form
        // doesn't ask for one directly. Always lets the user override
        // by typing into the kind-specific name field.
        let finalName = place.name;
        if (kind === ACTIVITY_KIND.FLIGHT) {
            finalName =
                place.name?.trim() ||
                (() => {
                    const segs = place.flightSegments ?? [];
                    if (!segs.length) return '';
                    const chain = [
                        segs[0]?.departAirport ?? '',
                        ...segs.map((s) => s.arrivalAirport ?? ''),
                    ];
                    return chain.filter(Boolean).join(' → ');
                })();
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS
        ) {
            // "Train Renfe AVE 4123" / "Bus FlixBus N1900" — operator
            // + number is the most recognizable label for a transit
            // entry on the day timeline.
            finalName =
                place.name?.trim() ||
                (() => {
                    const seg = place.transitSegments?.[0];
                    if (!seg) return '';
                    const prefix =
                        kind === ACTIVITY_KIND.TRAIN ? 'Train' : 'Bus';
                    const bits = [
                        prefix,
                        seg.operator?.trim(),
                        seg.number?.trim(),
                    ].filter(Boolean);
                    return bits.join(' ');
                })();
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKIN) {
            finalName =
                place.name?.trim()
                    ? `Check in: ${place.name.trim()}`
                    : 'Hotel check-in';
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
            finalName =
                place.name?.trim()
                    ? `Check out: ${place.name.trim()}`
                    : 'Hotel check-out';
        }

        // For train + bus, the depart segment's date/time is the
        // headline time on the day timeline. Mirror to top-level
        // startTime so existing rendering paths show the right slot
        // without needing transit-aware logic.
        const transitStartTime =
            (kind === ACTIVITY_KIND.TRAIN || kind === ACTIVITY_KIND.BUS)
                ? place.transitSegments?.[0]?.departTime
                : undefined;
        const transitEndTime =
            (kind === ACTIVITY_KIND.TRAIN || kind === ACTIVITY_KIND.BUS)
                ? (place.transitSegments?.[place.transitSegments.length - 1]
                      ?.arrivalTime)
                : undefined;

        // Lift the draft's freeform `confirmationNumber` into the
        // structured `hotelInfo` shape that Activity expects, and only
        // when this is actually a hotel kind. Keeps the Activity type
        // tidy (hotelInfo isn't a draft-level field on the activity).
        const isHotel =
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT;
        const hotelInfo =
            isHotel && place.confirmationNumber?.trim()
                ? { confirmationNumber: place.confirmationNumber.trim() }
                : undefined;

        // Strip draft-only `confirmationNumber` from the spread so it
        // doesn't sneak through onto the Activity payload as an extra
        // top-level field (which would type-check today but pollute the
        // shape later when something narrows on the activity keys).
        const { confirmationNumber: _draftConfirmation, ...placePayload } = place;

        onChange?.({
            ...placePayload,
            kind,
            name: finalName,
            startTime: transitStartTime ?? place.startTime,
            endTime: transitEndTime ?? place.endTime,
            hotelInfo,
        });
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
            const isHotelEdit =
                dataKind === ACTIVITY_KIND.HOTEL_CHECKIN ||
                dataKind === ACTIVITY_KIND.HOTEL_CHECKOUT;
            const isTransitEdit =
                dataKind === ACTIVITY_KIND.TRAIN ||
                dataKind === ACTIVITY_KIND.BUS;
            // Strip the "Check in: " / "Check out: " prefix the submit
            // helper added on create, so the editable hotel-name field
            // shows just the hotel itself rather than the synthesized
            // headline.
            let editName = data.name;
            if (dataKind === ACTIVITY_KIND.HOTEL_CHECKIN) {
                editName = data.name?.replace(/^Check in:\s*/i, '');
            } else if (dataKind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
                editName = data.name?.replace(/^Check out:\s*/i, '');
            }
            setPlace({
                id: data.id,
                kind: dataKind,
                name: editName,
                // Notes are timeless — strip start/end on edit so the
                // form doesn't surface stale values from a different
                // kind. Flights and transit carry their times inside
                // their segment arrays.
                startTime:
                    dataKind === ACTIVITY_KIND.NOTE ||
                    dataKind === ACTIVITY_KIND.FLIGHT ||
                    isTransitEdit
                        ? undefined
                        : data.startTime || now('HH:mm'),
                endTime:
                    dataKind === ACTIVITY_KIND.PLACE
                        ? data.endTime || now('HH:mm')
                        : undefined,
                location: data.location,
                cost: data.cost,
                note: data.note,
                status:
                    data.status && typeof data.status === 'object'
                        ? (data.status as DropdownOption)
                        : undefined,
                image: data.image,
                flightSegments:
                    dataKind === ACTIVITY_KIND.FLIGHT
                        ? data.flightSegments?.length
                            ? data.flightSegments
                            : [emptySegment()]
                        : undefined,
                transitSegments: isTransitEdit
                    ? data.transitSegments?.length
                        ? data.transitSegments
                        : [emptyTransitSegment()]
                    : undefined,
                confirmationNumber: isHotelEdit
                    ? data.hotelInfo?.confirmationNumber
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
            // Activity form is content-heavy; flips to a full-viewport
            // sheet on mobile so the user doesn't fight a tiny centered
            // window with double scrollbars on every device under 480px.
            containerClassName="add-place-modal"
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
                                className="add-place-kind-toggle"
                                role="tablist"
                                aria-label="Activity kind"
                            >
                                {[
                                    {
                                        value: ACTIVITY_KIND.PLACE,
                                        label: 'Place',
                                        Icon: PlaceRoundedIcon,
                                        // Single ACTIVITY_KIND value → active
                                        // when `place.kind` equals it.
                                        activeKinds: [ACTIVITY_KIND.PLACE],
                                    },
                                    {
                                        value: ACTIVITY_KIND.NOTE,
                                        label: 'Note',
                                        Icon: StickyNote2RoundedIcon,
                                        activeKinds: [ACTIVITY_KIND.NOTE],
                                    },
                                    {
                                        value: ACTIVITY_KIND.FLIGHT,
                                        label: 'Flight',
                                        Icon: FlightRoundedIcon,
                                        activeKinds: [ACTIVITY_KIND.FLIGHT],
                                    },
                                    {
                                        // Hotel folds the two check-in/out
                                        // event kinds behind one chip. Click
                                        // defaults to check-in; an in-form
                                        // toggle below switches to check-out
                                        // (and back) without leaving the
                                        // Hotel form. Both events still
                                        // persist with their distinct
                                        // ACTIVITY_KIND so the timeline
                                        // shows two separate cards.
                                        value: ACTIVITY_KIND.HOTEL_CHECKIN,
                                        label: 'Hotel',
                                        Icon: HotelRoundedIcon,
                                        activeKinds: [
                                            ACTIVITY_KIND.HOTEL_CHECKIN,
                                            ACTIVITY_KIND.HOTEL_CHECKOUT,
                                        ],
                                    },
                                    {
                                        // Ground folds the two surface-
                                        // transit kinds behind one chip.
                                        // Click defaults to Train; an
                                        // in-form toggle switches to Bus
                                        // (and back) without leaving the
                                        // shared transit form. Same
                                        // pattern as the Hotel chip
                                        // above — keeps the top-level
                                        // toggle compact while still
                                        // persisting each event with a
                                        // distinct ACTIVITY_KIND so the
                                        // timeline shows the correct
                                        // train vs bus icon.
                                        value: ACTIVITY_KIND.TRAIN,
                                        label: 'Ground',
                                        Icon: CommuteRoundedIcon,
                                        activeKinds: [
                                            ACTIVITY_KIND.TRAIN,
                                            ACTIVITY_KIND.BUS,
                                        ],
                                    },
                                ].map(({ value, label, Icon, activeKinds }) => {
                                    const currentKind =
                                        place.kind ?? ACTIVITY_KIND.PLACE;
                                    const active = (
                                        activeKinds as ActivityKind[]
                                    ).includes(currentKind);
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
                                    {isAdd && countryScope && (
                                        <Grid item lg={12} xs={12} className="py-5">
                                            <PlaceSuggestions
                                                country={countryScope}
                                                onPick={handlePlacePicked}
                                            />
                                        </Grid>
                                    )}
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
                                            value={place.name ?? ''}
                                            name="name"
                                            label="Flight name (optional — auto-fills from route)"
                                            onChange={(e) =>
                                                handleOnChange('name', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    {(place.flightSegments ?? [emptySegment()]).map(
                                        (segment, segIdx, allSegs) => (
                                            <Grid
                                                key={segIdx}
                                                item
                                                lg={12}
                                                xs={12}
                                                className="flight-segment-block"
                                            >
                                                <div className="flight-segment-header">
                                                    <span className="flight-segment-label">
                                                        {`Segment ${segIdx + 1}`}
                                                    </span>
                                                    {allSegs.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="flight-segment-remove"
                                                            onClick={() =>
                                                                handleRemoveSegment(segIdx)
                                                            }
                                                            aria-label={`Remove segment ${segIdx + 1}`}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <Grid container>
                                                    <Grid item lg={12} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.flightNumber ?? ''}
                                                            name={`flightNumber-${segIdx}`}
                                                            label="Flight number"
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'flightNumber',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <AirportAutocomplete
                                                            value={segment.departAirport ?? ''}
                                                            onChange={(code) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'departAirport',
                                                                    code
                                                                )
                                                            }
                                                            label="Depart airport"
                                                            placeholder="IATA code, city, or airport"
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <AirportAutocomplete
                                                            value={segment.arrivalAirport ?? ''}
                                                            onChange={(code) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalAirport',
                                                                    code
                                                                )
                                                            }
                                                            onSelectMeta={(opt) => {
                                                                // Only the LAST segment's
                                                                // arrival airport drives the
                                                                // flight image — that's the
                                                                // final destination.
                                                                const segs =
                                                                    place.flightSegments ?? [];
                                                                if (segIdx === segs.length - 1) {
                                                                    setArrivalCity(opt.city);
                                                                }
                                                            }}
                                                            label="Arrival airport"
                                                            placeholder="IATA code, city, or airport"
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
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
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
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
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.arrivalDate ?? ''}
                                                            name={`arrivalDate-${segIdx}`}
                                                            type="date"
                                                            label="Arrival date"
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalDate',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalTime ?? ''}
                                                            name={`arrivalTime-${segIdx}`}
                                                            type="time"
                                                            label="Arrival time"
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalTime',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        )
                                    )}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <button
                                            type="button"
                                            className="flight-segment-add"
                                            onClick={handleAddSegment}
                                        >
                                            + Add segment (stopover)
                                        </button>
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            defaultValue={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            label="Cost (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('cost', e.target.value)
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {(place.kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
                                place.kind === ACTIVITY_KIND.HOTEL_CHECKOUT) && (
                                <Grid container>
                                    {/* In-form side toggle — picks whether
                                        this activity represents the
                                        check-in or the check-out event.
                                        Persists as ACTIVITY_KIND.HOTEL_CHECKIN
                                        or HOTEL_CHECKOUT so the timeline
                                        keeps two distinct icons + time
                                        labels. Hidden on EDIT to keep the
                                        kind-locked-at-create-time contract;
                                        editing a hotel event preserves its
                                        existing side. */}
                                    {isAdd && (
                                        <Grid
                                            item
                                            lg={12}
                                            xs={12}
                                            className="pt-5 pb-0"
                                        >
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
                                                            className={classNames(
                                                                'hotel-side-btn',
                                                                { selected: active },
                                                            )}
                                                            onClick={() =>
                                                                // Switch the
                                                                // saved kind
                                                                // without
                                                                // re-running
                                                                // handleKindChange's
                                                                // full reset —
                                                                // the form
                                                                // fields are
                                                                // identical for
                                                                // both sides.
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
                                    <Grid item lg={12} xs={12} className="pt-2 pb-5">
                                        <InputField
                                            value={place.name ?? ''}
                                            name="name"
                                            label="Hotel name"
                                            onChange={(e) =>
                                                handleOnChange('name', e.target.value)
                                            }
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
                                                place.kind ===
                                                ACTIVITY_KIND.HOTEL_CHECKIN
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
                                            defaultValue={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            label={
                                                place.kind ===
                                                ACTIVITY_KIND.HOTEL_CHECKIN
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
                                            defaultValue={place.note}
                                            name="note"
                                            label="Notes (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('note', e.target.value)
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {(place.kind === ACTIVITY_KIND.TRAIN ||
                                place.kind === ACTIVITY_KIND.BUS) && (
                                <Grid container>
                                    {/* In-form mode toggle — picks
                                        Train or Bus. Same sliding-thumb
                                        treatment as the hotel side
                                        toggle above; persists as
                                        ACTIVITY_KIND.TRAIN or
                                        ACTIVITY_KIND.BUS so the
                                        timeline icon + labels stay
                                        accurate. Hidden on EDIT to
                                        match the rest of the modal's
                                        "kind locks at create time"
                                        contract. */}
                                    {isAdd && (
                                        <Grid
                                            item
                                            lg={12}
                                            xs={12}
                                            className="pt-5 pb-0"
                                        >
                                            <div
                                                className={classNames(
                                                    'hotel-side-toggle',
                                                    `is-${place.kind === ACTIVITY_KIND.BUS ? 'bus' : 'train'}`,
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
                                                ].map(({ value, label, Icon }) => {
                                                    const active = place.kind === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={active}
                                                            className={classNames(
                                                                'hotel-side-btn',
                                                                { selected: active },
                                                            )}
                                                            onClick={() =>
                                                                // Switch
                                                                // the saved
                                                                // kind. Both
                                                                // sides share
                                                                // identical
                                                                // form fields
                                                                // (operator,
                                                                // number,
                                                                // stations,
                                                                // times,
                                                                // class/seat,
                                                                // cost) so no
                                                                // reset
                                                                // needed —
                                                                // just flip
                                                                // the kind
                                                                // and the
                                                                // labels
                                                                // adapt.
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
                                    <Grid item lg={12} xs={12} className="pt-2 pb-5">
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
                                    {(place.transitSegments ?? [emptyTransitSegment()]).map(
                                        (segment, segIdx, allSegs) => (
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
                                                <Grid container>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.operator ?? ''}
                                                            name={`transitOperator-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Operator (e.g. Renfe, JR)'
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
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.number ?? ''}
                                                            name={`transitNumber-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Train number'
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
                                                            label="Depart station"
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'departStation',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalStation ?? ''}
                                                            name={`transitArrivalStation-${segIdx}`}
                                                            label="Arrival station (optional)"
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
                                                            label="Depart date"
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
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.departTime ?? ''}
                                                            name={`transitDepartTime-${segIdx}`}
                                                            type="time"
                                                            label="Depart time"
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
                                                            label="Arrival date (optional)"
                                                            labelOnTop
                                                            required={false}
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'arrivalDate',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalTime ?? ''}
                                                            name={`transitArrivalTime-${segIdx}`}
                                                            type="time"
                                                            label="Arrival time (optional)"
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
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Class / seat (optional)'
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
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
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
                                                                // Only the first segment's cost
                                                                // edits the top-level cost; later
                                                                // segments are display-only on the
                                                                // headline number. Keeps the
                                                                // existing Activity.cost contract
                                                                // intact (one number per activity).
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
                                        ),
                                    )}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <button
                                            type="button"
                                            className="flight-segment-add"
                                            onClick={handleAddTransitSegment}
                                        >
                                            + Add leg (transfer)
                                        </button>
                                    </Grid>
                                </Grid>
                            )}
                        </Grid>
                        <Grid item lg={12} md={12} xs={12}>
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                    {/* Validation feedback as a transient Snackbar
                        instead of an inline alert at the bottom of the
                        form. Avoids pushing the submit button down the
                        page when a long Hotel / Ground form already
                        crowds the modal, and auto-clears so the form
                        stays clean once the user fixes the issue. */}
                    <Snackbar
                        open={Boolean(error)}
                        autoHideDuration={5000}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        onClose={() => setError(null)}
                    >
                        <Alert
                            severity="error"
                            variant="filled"
                            onClose={() => setError(null)}
                            sx={{ width: '100%' }}
                        >
                            {error}
                        </Alert>
                    </Snackbar>
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
