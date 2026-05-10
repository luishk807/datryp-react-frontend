import React, { useState, useEffect,useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import SearchBar from 'components/SearchBar';
import classNames from 'classnames';
import _ from 'lodash';

const AddDestinationBtn = ({
    defaultDate,
    tripMaxDate,
    onChange,
    type = 'add',
    data=null,
    buttonType = 'standard',
    isViewMode = false
}) => {
    const title = useMemo(() => {
        return type === 'add' ? 'Add Destination' : 'Edit';
    }, [type]);
    
    const [destination, setDestination] = useState({});

    const modelRef = useRef();
    const handleOnFlightInfo = (name, value) => {
        setDestination({
            ...destination,
            'flightInfo': {
                ...destination.flightInfo,
                [name]: value,
            }
        });
    };

    const isAdd = useMemo(() => {
        return type === 'add';
    }, [type]);

    useEffect(() => {
        let unmounted = true;
        if(unmounted) {
            if(data && type === 'edit') {
                setDestination({
                    'country': data.country,
                    'id': data.id,
                    'flightInfo': {
                        flightNumber: data.flightInfo.flightNumber,
                        departAirport: data.flightInfo.departAirport,
                        departDate: defaultDate || data.flightInfo.departDate,
                        departTime: data.flightInfo.departTime,
                        arrivalAirport: data.flightInfo.arrivalAirport,
                        arrivalDate: defaultDate || data.flightInfo.arrivalDate,
                        arrivalTime: data.flightInfo.arrivalTime,
                    },
                    'itinerary': data.itinerary
                });
            } else {
                console.log("**************ADD DESTINATION BTN*********");
                console.log("defaultDate",defaultDate );
                setDestination({
                    'country': null,
                    'flightInfo': {
                        departDate: defaultDate || moment().format('YYYY-MM-DD').toString(),
                        departTime: moment().format('HH:mm').toString(),
                        arrivalDate: defaultDate || moment().format('YYYY-MM-DD').toString(),
                        arrivalTime: moment().format('HH:mm').toString()
                    }
                });
            }
        }
        return () => unmounted = false;
    }, [data, defaultDate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", destination);
        modelRef.current.closeModal();
        onChange && onChange(destination);
    };

    const handleSelectedDestinationSearch = (e) => {
        console.log("destination", e);
        setDestination({
            ...destination,
            'country': e
        });
    };
    return !isViewMode && (
        <Grid container className={classNames({
            'add-place-container-standard': buttonType === 'standard',
            'add-place-container-simple': buttonType === 'text'
        })}>
            <Grid item lg={12} md={12} xs={12} >
                <ModalButton 
                    title={isAdd ? 'Add Destination' : 'Edit ' + data?.country?.name}
                    ref={modelRef}
                    buttonProps={{
                        title: title,
                        Icon: buttonType==='standard' ? AddCircleIcon : null,
                        type: buttonType
                    }}>
                    <Grid container className='add-destination-comp'>
                        <Grid item lg={12} md={12} xs={12} className='form-container'>
                            <Grid container>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <SearchBar 
                                        defaultValue={data?.country}
                                        type="simple" 
                                        onSelected={handleSelectedDestinationSearch} 
                                    />
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField defaultValue={destination?.flightInfo?.flightNumber} label="Flight Number" name="flightNumber" onChange={(e) => handleOnFlightInfo('flightNumber', e.target.value)}/>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField defaultValue={destination?.flightInfo?.departAirport} label="Depart airport" name="departAirport" onChange={(e) => handleOnFlightInfo('departAirport', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField 
                                        defaultValue={destination?.flightInfo?.departDate} 
                                        type="date" 
                                        disablePast={true}
                                        disabled={true}
                                        maxDate={tripMaxDate}
                                        name="departDate" 
                                        onChange={(e) => handleOnFlightInfo('departDate', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField defaultValue={destination?.flightInfo?.departTime} name="departTime" type="time" label="Depart Time" onChange={(e) => handleOnFlightInfo('departTime', e.target.value)}/>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField defaultValue={destination?.flightInfo?.arrivalAirport} name="Arrival Airport" label="Arrival Airport" onChange={(e) => handleOnFlightInfo('arrivalAirport', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField 
                                        defaultValue={destination?.flightInfo?.arrivalDate} 
                                        type="date" 
                                        minDate={data?.flightInfo?.departDate}
                                        name="arrivalDate" 
                                        maxDate={tripMaxDate}
                                        disablePast={true} 
                                        onChange={(e) => handleOnFlightInfo('arrivalDate', e.target.value)}
                                    />
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField defaultValue={destination?.flightInfo?.arrivalTime} name="arrivalTime" type="time" label="Arrival Time" onChange={(e) => handleOnFlightInfo('arrivalTime', e.target.value)}/>
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

AddDestinationBtn.propTypes = {
    tripMaxDate: PropTypes.string,
    defaultDate: PropTypes.string,
    onChange: PropTypes.func,
    type: PropTypes.oneOf(['add', 'edit']),
    data: PropTypes.object,
    buttonType: PropTypes.oneOf(['text', 'standard']),
    isViewMode: PropTypes.bool,
};

export default AddDestinationBtn;