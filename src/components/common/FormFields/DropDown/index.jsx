import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import './index.css';

const DropdownCustom = ({
    options = [],
    label = '',
    onChange,
    name,
    defaultValue = ''
}) => {
    const [value, setValue] = useState(defaultValue);
    const handleChange = (e) => {
        const { value } = e.target;
        onChange && onChange(value);
        setValue(value);

    };

    return (
        <FormControl fullWidth className="custom-dropdown">
            <InputLabel id="dropdown-custom-label">{label}</InputLabel>
            <Select
                labelId="dropdown-custom-label"
                name={name}
                label={label}
                value={value}
                onChange={handleChange}
            >
                {
                    options && options.map((option, indx) => {
                        return <MenuItem className='custom-dropdown-item' key={indx} value={option}>{option.name}</MenuItem>;
                    })
                }
            </Select>
        </FormControl>
    );
};

DropdownCustom.propTypes = {
    options: PropTypes.array,
    onChange: PropTypes.func,
    label: PropTypes.string,
    name: PropTypes.string,
    defaultValue: PropTypes.object
};
export default DropdownCustom;