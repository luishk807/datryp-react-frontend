import React, { useState } from 'react';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import PropTypes from 'prop-types';
import './index.css';

const DropDown = ({
    id, 
    label, 
    onDropChange,
    options = [],
    defaultOption = 0
}) => {
    const [option, setOption] = useState(options[defaultOption].id);
    
    const handleChange = (e) => {
        const { target } = e;
        setOption(target.value);
        onDropChange(e);
    };
    return (
        <FormControl className="custom-dropdown" fullWidth>
            <InputLabel id="select-label">{label}</InputLabel>
            <Select
                labelId="select-label"
                name={id}
                value={option}
                label={label}
                onChange={handleChange}
            >
                {
                    options && options.map((item, indx) => {
                        return (
                            <MenuItem className='custom-dropdown-item' key={indx} value={item.id}>{item.name}</MenuItem>
                        );
                    })
                }

            </Select>
        </FormControl>
    );
};


DropDown.propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    options: PropTypes.array,
    onDropChange: PropTypes.func,
    defaultOption: PropTypes.number,
};

export default DropDown;