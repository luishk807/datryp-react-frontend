import React, {useState} from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import _ from 'lodash';
import './index.css';
import { 
    TextField,
    Autocomplete
} from '@mui/material';
const AutocompleteCustom = ({
    options = [],
    label ='',
    isMultiple = false,
    onDropChange,
    selectedOptions = []
}) => {
    const [data, setData] = useState([]);
    console.log(options, 'options');
    const handleOnChange = (selected) => {
        if (selected.id === -1) {
            return;
        }
        const found = data.filter(item => item.id === selected.id);

        if (!found.length) {
            setData([
                ...data,  
                selected
            ]);
     
        }
        onDropChange && onDropChange(selected);
    };


    return (
        <Autocomplete
            multiple = {isMultiple}
            id="combo-box-demo"
            options={options}
            value={data}
            isOptionEqualToValue={ (option, value) => option.id === value.id}
            onChange={(event, newValue) => {
                setData(newValue);
            }}
            renderOption={(props, option) => {
                if (option.id === -1) {
                    return (
                        <li key={`fd-${option.id}`}>
                            <hr className="my-2"/>
                            <div className="autocomplete-custom-option" onClick={(e) => handleOnChange(option)}>{option.label}</div>
                        </li>
                    );
                } else {
                    let found = selectedOptions.length ? selectedOptions.filter(item => item.id === option.id) : [];
                    return ( 
                        <li key={`fd-${option.id}`}>
                            <div className={
                                classnames({
                                    "autocomplete-custom-item": true,
                                    "disabled": found.length
                                })
                            } onClick={(e) => handleOnChange(option)}>{option.label}</div>
                        </li>
                    );
                }

            }}
            renderInput={(params) => 
                <TextField {...params} label={label} />
            }
        />);
};

AutocompleteCustom.propTypes = {
    options: PropTypes.array,
    label: PropTypes.string,
    isMultiple: PropTypes.bool,
    onDropChange: PropTypes.func,
    selectedOptions: PropTypes.array
};
export default AutocompleteCustom;