import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import SearchBar from 'components/SearchBar';


const AddDestinationBtn = ({
    onChange
}) => {
    const title = "Add Destination";
    const [destination, setDestination] = useState(null);
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

    useEffect(() => {
        let unmounted = false;

        if(!unmounted) {
            setDestination({
                'flightInfo': {
                    departDate: moment().format('YYYY-MM-DD').toString(),
                    departTime: moment().format('HH:mm').toString(),
                    arrivalDate: moment().format('YYYY-MM-DD').toString(),
                    arrivalTime: moment().format('HH:mm').toString()
                }
            });
        }

        return () => unmounted = true;

    }, []);


    useEffect(() => {
        console.log("change destination", destination);
    }, [destination]);

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
    return (
        <Grid container>
            <Grid item lg={12} md={12} xs={12} >
                <ModalButton 
                    title={title}
                    ref={modelRef}
                    buttonProps={{
                        title: title,
                        Icon: AddCircleIcon
                    }}>
                    <Grid container className='add-destination-comp'>
                        <Grid item lg={12} md={12} xs={12} className='form-container'>
                            <Grid container>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <SearchBar 
                                        type="simple" 
                                        onSelected={handleSelectedDestinationSearch} 
                                    />
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField label="Flight Number" name="flightNumber" onChange={(e) => handleOnFlightInfo('flightNumber', e.target.value)}/>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField label="Depart airport" name="departAirport" onChange={(e) => handleOnFlightInfo('departAirport', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField type="date" name="departDate" onChange={(e) => handleOnFlightInfo('departDate', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField name="departTime" type="time" label="Depart Time" onChange={(e) => handleOnFlightInfo('departTime', e.target.value)}/>
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="py-5">
                                    <InputField name="Arrival Airport" label="Arrival Airport" onChange={(e) => handleOnFlightInfo('arrivalDate', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5">
                                    <InputField type="date" name="endDate" onChange={(e) => handleOnFlightInfo('endDate', e.target.value)}/>
                                </Grid>
                                <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                                    <InputField name="arrivalTime" type="time" label="Arrival Time" onChange={(e) => handleOnFlightInfo('arrivalTime', e.target.value)}/>
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="pt-5">
                            <ButtonCustom 
                                onClick={handleSubmit} 
                                label={title} 
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
    onChange: PropTypes.func
};

export default AddDestinationBtn;