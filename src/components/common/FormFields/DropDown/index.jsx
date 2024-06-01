import React, { useState, useEffect } from 'react';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import PropTypes from 'prop-types';

const DropDown = ({
    id, 
    label, 
    onChange,
    options
}) => {
    const [data, setData] = useState('');
    
    const handleChange = (e) => {
        const { target } = e;
        setData(target.value);
        onChange(e);
    };

    // useEffect(() => {
    //     setData(options[0]);
    // }, [options]);

    return (
        <FormControl fullWidth>
            <InputLabel id="select-label">{label}</InputLabel>
            <Select
                labelId="select-label"
                name={id}
                value={data}
                label={label}
                onChange={handleChange}
            >
                {
                    options && options.map((item, indx) => {
                        return (
                            <MenuItem key={indx} value={item.id}>{item.name}</MenuItem>
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
    onChange: PropTypes.func
};

export default DropDown;