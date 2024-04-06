import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    FormControl,
    Input,
    InputLabel,
    FormHelperText,
    OutlinedInput
} from '@mui/material';

const InputField = ({
    label = null,
    name,
    onChange,
    type = "text"
}) => {
    const labelText = useMemo(() => {
        if (type == "date") {
            return null;
        }
        return label || name.charAt(0).toUpperCase() + name.slice(1);
    }, [label]);

    return (
        <FormControl className="w-full">
            <InputLabel htmlFor={name}>{labelText}</InputLabel>
            <OutlinedInput
                id={name}
                fullWidth={true}
                type={type}
                label={labelText}
                aria-describedby="my-helper-text"
                onChange={onChange}
                required
            />
            {/* <FormHelperText id="my-helper-text">tes</FormHelperText> */}
        </FormControl>
    );
};

InputField.propTypes = {
    label: PropTypes.string,
    name: PropTypes.string,
    onChange: PropTypes.func,
    type: PropTypes.oneOf(['text', 'email', 'password', 'date'])
};
export default InputField;