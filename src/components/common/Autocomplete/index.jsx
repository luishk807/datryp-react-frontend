import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Grid,
    TextField,
    Autocomplete
} from '@mui/material';
const AutocompleteCustom = ({
    options = [],
    label ='',
    isMultiple = false
}) => {
    const [data, setData] = useState([]);

    const handleOnChange = (selected) => {
        console.log('click data', selected);
        if (selected.id === -1) {
            console.log("ignore");
            return;
        }
        const found = data.filter(item => item.id === selected.id);

        if (!found.length) {
            setData([
                ...data,  
                selected
            ]);
        }

    };

    return (
        <Autocomplete
            multiple = {isMultiple}
            id="combo-box-demo"
            options={options}
            value={data}
            onChange={(event, newValue) => {
                setData(newValue);
            }}
            renderOption={(props, option) => {
                if (option.id === -1) {
                    return (
                        <li key={`fd-${option.id}`}>
                            <hr className="my-2"/>
                            <div className="autocomplete-custom-item" onClick={(e) => handleOnChange(option)}>{option.label}</div>
                        </li>
                    );
                } else {
                    const found = data.filter(item => item.id === option.id);
                    return ( 
                        <li key={`fd-${option.id}`}>
                            <div className="autocomplete-custom-item" onClick={(e) => handleOnChange(option)}>{option.label}</div>
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
    isMultiple: PropTypes.bool
};
export default AutocompleteCustom;