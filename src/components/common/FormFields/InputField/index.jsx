import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import classNames from 'classnames';
import { 
    FormControl,
    InputLabel,
    OutlinedInput
} from '@mui/material';

const InputField = ({
    label = null,
    name,
    onChange,
    defaultValue = "",
    type = "text",
    labelOnTop = false
}) => {
    const [data, setData] = useState('');
    const [imageData, setImageData] = useState(null);

    const handleOnChange = (e) => {
        if (type === 'file') {
            const imageName = e.target.value;
            setImageData(imageName.substring(imageName.lastIndexOf('\\') + 1));
        }
        setData(e.target.value);
        onChange(e);
    };

    const labelText = useMemo(() => {
        if (type == "date") {
            labelOnTop = true;
            return null;
        }
        return label || name.charAt(0).toUpperCase() + name.slice(1);
    }, [label]);

    useEffect(() => {
        if (defaultValue) {
            setData(defaultValue);
        }
    }, [defaultValue]);

    return (
        <FormControl className="w-full inputFieldCustom">
            { labelOnTop && (<div>{label}</div>)}
            <InputLabel htmlFor={name}>{labelText}</InputLabel>
            { type === "file" && imageData && (<div className="image-container">{imageData}</div>) }
            <OutlinedInput
                id={name}
                fullWidth={true}
                className={classNames({
                    'fileStyle': type === 'file'
                })}
                type={type}
                value={data}
                label={labelText}
                aria-describedby={name}
                onChange={handleOnChange}
                required
            />
        </FormControl>
    );
};

InputField.propTypes = {
    label: PropTypes.string,
    name: PropTypes.string,
    onChange: PropTypes.func,
    labelOnTop: PropTypes.bool,
    defaultValue: PropTypes.string,
    type: PropTypes.oneOf(['text', 'email', 'password', 'date', 'file'])
};
export default InputField;