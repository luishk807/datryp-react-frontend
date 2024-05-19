import React, { useState, useMemo } from 'react';
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
    const friends = [];
    const handleOnChange = (name, value) => {
        if (name === "friends") {
            friends.push(value);
        }
        setDestination({
            ...destination,
            [name]: name === 'friends' ? friends : value,

        });
    };

    const endDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setDestination({
            ...destination,
            'startDate': date
        });
        return date;
    }, []);

    const startDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setDestination({
            ...destination,
            'startDate': date
        });
        return date;
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", destination);
        onChange && onChange(destination);
    };

    const handleSelectedDestinationSearch = (e) => {
        console.log("destination", e);
    };
    return (
        <Grid container>
            <Grid item>
                <ModalButton 
                    title={title}
                    buttonProps={{
                        title: title,
                        Icon: AddCircleIcon
                    }}>
                    <Grid container>
                        <Grid item lg={12} md={12} xs={12} className="py-5">
                            <SearchBar 
                                type="simple" 
                                onSelected={handleSelectedDestinationSearch} 
                            />
                        </Grid>
                        <Grid item lg={12} md={12} xs={12} className="py-5">
                            <InputField label="Flight Number" name="flightNumber" onChange={(e) => handleOnChange('flightNumber', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} md={12} xs={12} className="py-5">
                            <InputField label="Depart airport" name="departAirport" onChange={(e) => handleOnChange('departAirport', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="py-5">
                            <InputField type="date" name="departDate" onChange={(e) => handleOnChange('departDate', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                            <InputField name="departTime" type="time" label="Depart Time" onChange={(e) => handleOnChange('departTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} md={12} xs={12} className="py-5">
                            <InputField name="Arrival Airport" label="Arrival Airport" onChange={(e) => handleOnChange('arrivalDate', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="py-5">
                            <InputField type="date" name="endDate" onChange={(e) => handleOnChange('endDate', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="py-5 lg:pl-2">
                            <InputField name="arrivalTime" type="time" label="Arrival Time" onChange={(e) => handleOnChange('arrivalTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} md={12} xs={12} classNames="pt-5">
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