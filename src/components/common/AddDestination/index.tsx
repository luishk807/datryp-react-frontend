import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import { formatDate, isValidDate, now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import SearchBar from 'components/SearchBar';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import classNames from 'classnames';
import { ACTION, BUTTON_VARIANT } from 'constants';
import type {
    Activity,
    AddEditButtonProps,
    Country,
    Destination,
    FlightInfo,
} from 'types';

const DESTINATION_LABEL = {
    ADD: 'Add Destination',
    EDIT: 'Edit',
    SAVE: 'Save Destination',
} as const;

interface DestinationDraft {
    id?: number;
    country?: Country | null;
    flightInfo?: FlightInfo;
    itinerary?: Destination['itinerary'];
}

export interface AddDestinationBtnProps extends AddEditButtonProps<DestinationDraft, Destination> {
    defaultDate?: string;
    tripMaxDate?: string | null;
}

const AddDestinationBtn = ({
    defaultDate,
    tripMaxDate,
    onChange,
    type = ACTION.ADD,
    data = null,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
}: AddDestinationBtnProps) => {
    const isAdd = type === ACTION.ADD;
    const title = useMemo(() => (isAdd ? DESTINATION_LABEL.ADD : DESTINATION_LABEL.EDIT), [isAdd]);

    const [destination, setDestination] = useState<DestinationDraft>({});
    /** Optional "first place" seeded from PlaceAutocomplete. Held separately
     *  from the destination draft because the activity needs a date + id
     *  that we materialize at submit time. */
    const [firstPlaceText, setFirstPlaceText] = useState('');
    const [firstPlace, setFirstPlace] = useState<PlaceSuggestion | null>(null);
    const modelRef = useRef<ModalButtonHandle>(null);

    const handleOnFlightInfo = (name: keyof FlightInfo, value: string) => {
        setDestination((prev) => ({
            ...prev,
            flightInfo: {
                ...(prev.flightInfo ?? {}),
                [name]: value,
            },
        }));
    };

    // Normalize whatever date format comes in (MM/DD/YYYY from
    // DestinationDetail or YYYY-MM-DD from raw state) into ISO YYYY-MM-DD so
    // the MUI DatePicker doesn't reject it and flag the field in red.
    const isoDate = (raw?: string | null): string | undefined => {
        if (!raw) return undefined;
        return isValidDate(raw) ? formatDate(raw) : undefined;
    };

    useEffect(() => {
        const fallback = isoDate(defaultDate) ?? now();
        if (data && type === ACTION.EDIT) {
            setDestination({
                country: data.country,
                id: data.id,
                flightInfo: {
                    flightNumber: data.flightInfo?.flightNumber,
                    departAirport: data.flightInfo?.departAirport,
                    departDate: isoDate(data.flightInfo?.departDate) ?? fallback,
                    departTime: data.flightInfo?.departTime,
                    arrivalAirport: data.flightInfo?.arrivalAirport,
                    arrivalDate: isoDate(data.flightInfo?.arrivalDate) ?? fallback,
                    arrivalTime: data.flightInfo?.arrivalTime,
                },
                itinerary: data.itinerary,
            });
        } else {
            setDestination({
                country: null,
                flightInfo: {
                    departDate: fallback,
                    departTime: now('HH:mm'),
                    arrivalDate: fallback,
                    arrivalTime: now('HH:mm'),
                },
            });
        }
    }, [data, defaultDate, type]);

    const normalizedTripMaxDate = isoDate(tripMaxDate ?? undefined);

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        modelRef.current?.closeModal();

        // If the user picked a "first place" suggestion, seed the
        // destination's itinerary with one activity for the depart day.
        // The reducer will give it a real id when it lands in state; we use
        // a placeholder Date.now() so React keys stay stable in the meantime.
        const seedDate =
            destination.flightInfo?.departDate ?? isoDate(defaultDate) ?? now();
        const itineraryWithSeed =
            firstPlace && seedDate
                ? [
                      {
                          id: Date.now(),
                          date: seedDate,
                          activities: [
                              {
                                  id: Date.now() + 1,
                                  name: firstPlace.name,
                                  location: firstPlace.location,
                                  image: firstPlace.imageUrl
                                      ? {
                                            url: firstPlace.imageUrl,
                                            name: firstPlace.name,
                                        }
                                      : undefined,
                              } as Activity,
                          ],
                      },
                  ]
                : destination.itinerary;

        onChange?.({ ...destination, itinerary: itineraryWithSeed });

        // Reset the seed fields so reopening the modal starts fresh.
        if (type === ACTION.ADD) {
            setFirstPlace(null);
            setFirstPlaceText('');
        }
    };

    const handleSelectedDestinationSearch = (country: Country) => {
        setDestination((prev) => ({ ...prev, country }));
    };

    const handleFirstPlacePicked = (suggestion: PlaceSuggestion) => {
        setFirstPlace(suggestion);
        setFirstPlaceText(suggestion.name);
    };

    const handleFirstPlaceText = (text: string) => {
        setFirstPlaceText(text);
        // If the user keeps typing past a picked suggestion, drop the
        // resolved selection — they're going manual. The text alone isn't
        // enough to seed an activity since we'd be missing location/image,
        // so we just don't seed in that case.
        if (firstPlace && text !== firstPlace.name) {
            setFirstPlace(null);
        }
    };

    if (isViewMode) return null;

    return (
        <Grid
            container
            className={classNames({
                'add-place-container-standard': buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
            })}
        >
            <Grid item lg={12} md={12} xs={12}>
                <ModalButton
                    title={isAdd ? DESTINATION_LABEL.ADD : `${DESTINATION_LABEL.EDIT} ${data?.country?.name ?? ''}`}
                    ref={modelRef}
                    buttonProps={{
                        title,
                        Icon: buttonType === BUTTON_VARIANT.STANDARD ? AddCircleIcon : null,
                        type: buttonType,
                    }}
                >
                    <Grid container className="add-destination-comp">
                        <Grid item lg={12} md={12} xs={12} className="form-container">
                            <Grid container>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <SearchBar
                                        defaultValue={data?.country}
                                        type="simple"
                                        onSelected={handleSelectedDestinationSearch}
                                    />
                                </Grid>
                                {type === ACTION.ADD && (
                                    <Grid
                                        item
                                        lg={12}
                                        md={12}
                                        xs={12}
                                        className="py-5"
                                    >
                                        <PlaceAutocomplete
                                            value={firstPlaceText}
                                            onTextChange={handleFirstPlaceText}
                                            onSelect={handleFirstPlacePicked}
                                            country={destination.country?.name}
                                            label={
                                                destination.country?.name
                                                    ? `First place in ${destination.country.name} (optional)`
                                                    : 'First place to visit (optional)'
                                            }
                                            placeholder={
                                                destination.country?.name
                                                    ? 'Type a landmark or activity in this country'
                                                    : 'Pick the country above first to get country-specific suggestions'
                                            }
                                            disabled={!destination.country?.name}
                                        />
                                    </Grid>
                                )}
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={destination.flightInfo?.flightNumber}
                                        label="Flight Number"
                                        name="flightNumber"
                                        onChange={(e) => handleOnFlightInfo('flightNumber', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={destination.flightInfo?.departAirport}
                                        label="Depart airport"
                                        name="departAirport"
                                        onChange={(e) => handleOnFlightInfo('departAirport', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={destination.flightInfo?.departDate}
                                        type="date"
                                        disablePast
                                        disabled
                                        maxDate={normalizedTripMaxDate}
                                        name="departDate"
                                        onChange={(e) => handleOnFlightInfo('departDate', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField
                                        defaultValue={destination.flightInfo?.departTime}
                                        name="departTime"
                                        type="time"
                                        label="Depart Time"
                                        onChange={(e) => handleOnFlightInfo('departTime', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={destination.flightInfo?.arrivalAirport}
                                        name="Arrival Airport"
                                        label="Arrival Airport"
                                        onChange={(e) => handleOnFlightInfo('arrivalAirport', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField
                                        defaultValue={destination.flightInfo?.arrivalDate}
                                        type="date"
                                        minDate={isoDate(destination.flightInfo?.departDate)}
                                        name="arrivalDate"
                                        maxDate={normalizedTripMaxDate}
                                        disablePast
                                        onChange={(e) => handleOnFlightInfo('arrivalDate', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField
                                        defaultValue={destination.flightInfo?.arrivalTime}
                                        name="arrivalTime"
                                        type="time"
                                        label="Arrival Time"
                                        onChange={(e) => handleOnFlightInfo('arrivalTime', e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="pt-5">
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? DESTINATION_LABEL.ADD : DESTINATION_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
            </Grid>
        </Grid>
    );
};

export default AddDestinationBtn;
