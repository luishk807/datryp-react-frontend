import React, { useMemo, useState, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './index.css';
import { debounce} from 'lodash';
import classNames from 'classnames';
import { 
    FormControl,
    InputLabel,
    OutlinedInput
} from '@mui/material';
import { 
    TimePicker,
    DatePicker
} from '@mui/x-date-pickers';

const InputField = forwardRef(({
    label = null,
    maxDate,
    name,
    minDate,
    onChange,
    disablePast = false,
    defaultValue = "",
    type = "text",
    disabled = false,
    labelOnTop = false
}, ref) => {
    const [data, setData] = useState('');
    const [imageData, setImageData] = useState(null);

    const handleOnChange = (e) => {
        const value = e.target.value;
        if (type === 'file') {
            const imageName = value;
            setImageData(imageName.substring(imageName.lastIndexOf('\\') + 1));
        }
        setData(value);
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
        let unmounted = true;
        if (unmounted) {
            if (defaultValue) {
                setData(defaultValue);
            }
        }
        return () => unmounted = false;
    }, [defaultValue]);

    const showInputLabel = useMemo(() => {
        return type !== 'time';
    }, [type]);

    const debounceChange = debounce(handleOnChange, 200);
    
    const handleFocus = (e) => {
        e.target.select();
    };

    const getField = (type) => {
        switch(type) {
            case 'time':
                return <TimePicker 
                    disablePast={disablePast} 
                    disabled={disabled} 
                    onChange={(e) => handleOnChange({target: { value: e.format('HH:mm').toString()}})} 
                    defaultValue={moment()} 
                    label={label} />;
            case 'date': {
                return <DatePicker 
                    disablePast={disablePast} 
                    disabled={disabled} 
                    onChange={(e) => handleOnChange({target: { value: e.format('YYYY-MM-DD').toString()}})} 
                    defaultValue={defaultValue ? moment(defaultValue) : moment()} 
                    label={labelText}
                    {...(minDate ? { minDate: moment(minDate) } : {})}
                    {...(maxDate ? { maxDate: moment(maxDate) } : {})}
                />;
            }
            default: 
                return <OutlinedInput
                    id={name}
                    fullWidth={true}
                    className={classNames({
                        'fileStyle': type === 'file'
                    })}
                    onFocus={handleFocus}
                    inputRef={ref}
                    type={type}
                    disabled={disabled}
                    value={data}
                    label={labelText}
                    aria-describedby={name}
                    onChange={handleOnChange} 
                    required />;
        }
    };

    return (
        <FormControl className="w-full inputFieldCustom">
            { labelOnTop && (<div>{label}</div>)}
            { showInputLabel && <InputLabel htmlFor={name}>{labelText}</InputLabel>}
            { type === "file" && imageData && (<div className="image-container">{imageData}</div>) }
            { getField(type) }
        </FormControl>
    );
});

InputField.propTypes = {
    maxDate: PropTypes.string,
    minDate: PropTypes.string,
    label: PropTypes.string,
    name: PropTypes.string,
    onChange: PropTypes.func,
    disablePast: PropTypes.bool,
    labelOnTop: PropTypes.bool,
    defaultValue: PropTypes.string,
    disabled: PropTypes.bool,
    type: PropTypes.oneOf(['text', 'number', 'email', 'password', 'date', 'file', 'time'])
};

InputField.displayName = "InputField";

export default InputField;