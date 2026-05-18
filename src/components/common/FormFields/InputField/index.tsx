import { useMemo, useState, useEffect, forwardRef } from 'react';
import moment from 'moment';
import './index.scss';
import classNames from 'classnames';
import { FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { TimePicker, DatePicker } from '@mui/x-date-pickers';

type InputFieldType = 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'time' | 'tel';
type InputFieldVariant = 'outlined' | 'bare';

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
    /** Controlled value. When set, parent state drives the input; takes precedence over `defaultValue`. */
    value?: string;
    type?: InputFieldType;
    disabled?: boolean;
    labelOnTop?: boolean;
    placeholder?: string;
    /** Defaults to true to preserve historical behaviour; pass false for optional fields. */
    required?: boolean;
    /**
     * `'outlined'` (default): MUI OutlinedInput with floating notched label.
     * `'bare'`: stacked label above a plain rounded input — settings-form aesthetic.
     *           No external `<Field>` wrapper needed; pass the label via `label`.
     */
    variant?: InputFieldVariant;
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
            value,
            type = 'text',
            disabled = false,
            labelOnTop = false,
            placeholder,
            required = true,
            variant = 'outlined',
        },
        ref
    ) => {
        const isControlled = value !== undefined;
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
                case 'time': {
                    // Parse the incoming HH:mm string into a moment so the
                    // picker shows the saved value on edit. Without this the
                    // picker defaulted to `now()` and the user's saved time
                    // appeared overwritten the moment the modal opened.
                    const timeSource = isControlled ? value : defaultValue;
                    const parsedTime = timeSource
                        ? moment(timeSource, 'HH:mm')
                        : moment();
                    return (
                        <TimePicker
                            disablePast={disablePast}
                            disabled={disabled}
                            onChange={(e) =>
                                handleOnChange({
                                    target: { value: e ? e.format('HH:mm').toString() : '' },
                                })
                            }
                            // Use `value` when controlled so external state
                            // updates reflect; defaultValue otherwise to keep
                            // legacy uncontrolled call sites working.
                            {...(isControlled
                                ? { value: parsedTime.isValid() ? parsedTime : null }
                                : { defaultValue: parsedTime.isValid() ? parsedTime : moment() })}
                            label={label}
                        />
                    );
                }
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
                            value={isControlled ? value : data}
                            label={labelText}
                            placeholder={placeholder}
                            aria-describedby={name}
                            onChange={handleOnChange}
                            required={required}
                        />
                    );
            }
        };

        if (variant === 'bare') {
            return (
                <label className="input-field-bare">
                    {label && <span className="input-field-bare-label">{label}</span>}
                    <input
                        ref={ref}
                        id={name}
                        name={name}
                        type={type}
                        disabled={disabled}
                        required={required}
                        placeholder={placeholder}
                        value={isControlled ? value : data}
                        onChange={(e) => handleOnChange(e)}
                        className="input-field-bare-input"
                    />
                </label>
            );
        }

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
