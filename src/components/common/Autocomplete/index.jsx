import React, {useState, useEffect} from 'react';
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
    onSelect,
    onRemove,
    selectedOptions = []
}) => {
    const [data, setData] = useState([]);
    const handleOnClick = (selected) => {
        if (selected.id !== -1) {
            const found = data.filter(item => item.id === selected.id);
            if (!found.length) {
                setData(old => [
                    ...old,  
                    selected
                ]);
            }
        }
        onSelect && onSelect(selected);
    };

    const handleOnChange = (event, newValue) => {
        console.log(newValue);
        const ids = newValue.map(item => item.id);
        const newdata = data.filter(item => !ids.includes(item.id));
        console.log(newdata, 'founddd');
        onRemove && onRemove(newdata);
    };

    useEffect(() => {

        let mounted= true;

        if (mounted) {
            setData(selectedOptions);
        }

        return () => { mounted = false; };
    }, [selectedOptions]);
    
    return (
        <Autocomplete
            multiple = {isMultiple}
            id="combo-box-demo"
            options={options}
            value={data}
            freeSolo
            isOptionEqualToValue={ (option, value) => option.id === value.id}
            onChange={handleOnChange}
            renderOption={(props, option) => {
                if (option.id === -1) {
                    return (
                        <li key={`fd-${option.id}`}>
                            <hr className="my-2"/>
                            <div className="autocomplete-custom-option" onClick={(e) => handleOnClick(option)}>{option.label}</div>
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
                            } onClick={(e) => handleOnClick(option)}>{option.label}</div>
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
    onSelect: PropTypes.func,
    onRemove: PropTypes.func,
    selectedOptions: PropTypes.array
};
export default AutocompleteCustom;