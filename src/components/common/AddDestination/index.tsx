import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import SearchBar from 'components/SearchBar';
import classNames from 'classnames';
import type { Country, Destination, FlightInfo } from 'types';

type AddDestinationType = 'add' | 'edit';
type AddDestinationButtonType = 'text' | 'standard';

interface DestinationDraft {
    id?: number;
    country?: Country | null;
    flightInfo?: FlightInfo;
    itinerary?: Destination['itinerary'];
}

export interface AddDestinationBtnProps {
    defaultDate?: string;
    tripMaxDate?: string | null;
    onChange?: (destination: DestinationDraft) => void;
    type?: AddDestinationType;
    data?: Destination | null;
    buttonType?: AddDestinationButtonType;
    isViewMode?: boolean;
}

const AddDestinationBtn = ({
    defaultDate,
    tripMaxDate,
    onChange,
    type = 'add',
    data = null,
    buttonType = 'standard',
    isViewMode = false,
}: AddDestinationBtnProps) => {
    const isAdd = type === 'add';
    const title = useMemo(() => (isAdd ? 'Add Destination' : 'Edit'), [isAdd]);

    const [destination, setDestination] = useState<DestinationDraft>({});
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
        const m = moment(raw);
        return m.isValid() ? m.format('YYYY-MM-DD') : undefined;
    };

    useEffect(() => {
        const fallback = isoDate(defaultDate) ?? moment().format('YYYY-MM-DD');
        if (data && type === 'edit') {
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
                    departTime: moment().format('HH:mm').toString(),
                    arrivalDate: fallback,
                    arrivalTime: moment().format('HH:mm').toString(),
                },
            });
        }
    }, [data, defaultDate, type]);

    const normalizedTripMaxDate = isoDate(tripMaxDate ?? undefined);

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        modelRef.current?.closeModal();
        onChange?.(destination);
    };

    const handleSelectedDestinationSearch = (country: Country) => {
        setDestination((prev) => ({ ...prev, country }));
    };

    if (isViewMode) return null;

    return (
        <Grid
            container
            className={classNames({
                'add-place-container-standard': buttonType === 'standard',
                'add-place-container-simple': buttonType === 'text',
            })}
        >
            <Grid item lg={12} md={12} xs={12}>
                <ModalButton
                    title={isAdd ? 'Add Destination' : 'Edit ' + (data?.country?.name ?? '')}
                    ref={modelRef}
                    buttonProps={{
                        title,
                        Icon: buttonType === 'standard' ? AddCircleIcon : null,
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
                                label={isAdd ? 'Add Destination' : 'Save Destination'}
                                type="standard"
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
