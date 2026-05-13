import { useMemo, useState, useEffect, forwardRef } from 'react';
import moment from 'moment';
import './index.css';
import classNames from 'classnames';
import { FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { TimePicker, DatePicker } from '@mui/x-date-pickers';

type InputFieldType = 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'time' | 'tel';

interface ChangeEventLike {
    target: { value: string };
}

export interface InputFieldProps {
    label?: string | null;
    maxDate?: string;
    name?: string;
    minDate?: string;
    onChange?: (e: ChangeEventLike) => void;
    disablePast?: boolean;
    defaultValue?: string;
    type?: InputFieldType;
    disabled?: boolean;
    labelOnTop?: boolean;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
    (
        {
            label = null,
            maxDate,
            name,
            minDate,
            onChange,
            disablePast = false,
            defaultValue = '',
            type = 'text',
            disabled = false,
            labelOnTop = false,
        },
        ref
    ) => {
        const [data, setData] = useState('');
        const [imageData, setImageData] = useState<string | null>(null);

        const handleOnChange = (e: ChangeEventLike) => {
            const value = e.target.value;
            if (type === 'file') {
                setImageData(value.substring(value.lastIndexOf('\\') + 1));
            }
            setData(value);
            onChange?.(e);
        };

        const labelText = useMemo(() => {
            if (type === 'date') return null;
            return label || (name ? name.charAt(0).toUpperCase() + name.slice(1) : '');
        }, [label, name, type]);

        useEffect(() => {
            if (defaultValue) setData(defaultValue);
        }, [defaultValue]);

        const showInputLabel = type !== 'time';
        const showTopLabel = labelOnTop || type === 'date';

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            e.target.select();
        };

        const renderField = () => {
            switch (type) {
                case 'time':
                    return (
                        <TimePicker
                            disablePast={disablePast}
                            disabled={disabled}
                            onChange={(e) =>
                                handleOnChange({
                                    target: { value: e ? e.format('HH:mm').toString() : '' },
                                })
                            }
                            defaultValue={moment()}
                            label={label}
                        />
                    );
                case 'date':
                    return (
                        <DatePicker
                            disablePast={disablePast}
                            disabled={disabled}
                            onChange={(e) =>
                                handleOnChange({
                                    target: { value: e ? e.format('YYYY-MM-DD').toString() : '' },
                                })
                            }
                            defaultValue={defaultValue ? moment(defaultValue) : moment()}
                            label={labelText}
                            {...(minDate ? { minDate: moment(minDate) } : {})}
                            {...(maxDate ? { maxDate: moment(maxDate) } : {})}
                        />
                    );
                default:
                    return (
                        <OutlinedInput
                            id={name}
                            fullWidth
                            className={classNames({ fileStyle: type === 'file' })}
                            onFocus={handleFocus}
                            inputRef={ref}
                            type={type}
                            disabled={disabled}
                            value={data}
                            label={labelText}
                            aria-describedby={name}
                            onChange={handleOnChange}
                            required
                        />
                    );
            }
        };

        return (
            <FormControl className="w-full inputFieldCustom">
                {showTopLabel && <div>{label}</div>}
                {showInputLabel && <InputLabel htmlFor={name}>{labelText}</InputLabel>}
                {type === 'file' && imageData && (
                    <div className="image-container">{imageData}</div>
                )}
                {renderField()}
            </FormControl>
        );
    }
);

InputField.displayName = 'InputField';

export default InputField;
