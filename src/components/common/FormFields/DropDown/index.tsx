import { useId, useState } from 'react';
import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
} from '@mui/material';
import './index.scss';

export interface DropdownOption {
    id: number | string;
    name: string;
}

type DropdownVariant = 'outlined' | 'bare';

export interface DropdownCustomProps<T extends DropdownOption = DropdownOption> {
    options?: T[];
    label?: string;
    onChange?: (option: T | undefined) => void;
    name?: string;
    /** Uncontrolled initial selection. Ignored when `value` is supplied. */
    defaultValue?: T | null;
    /** Controlled selection (matches the keyed field — `id` by default, or `valueKey` if set). */
    value?: string | number | null;
    disabled?: boolean;
    /** Empty-state text. Renders as a leading blank option / placeholder MenuItem. */
    placeholder?: string;
    /**
     * `'outlined'` (default): MUI OutlinedSelect with floating notched label.
     * `'bare'`: stacked label above a plain native `<select>` — settings-form aesthetic
     *           (matches `<InputField variant="bare" />`).
     */
    variant?: DropdownVariant;
    /** Option field to use as the key/value. Defaults to `'id'`. */
    valueKey?: keyof T;
}

const DropdownCustom = <T extends DropdownOption = DropdownOption>({
    options = [],
    label = '',
    onChange,
    name,
    defaultValue = null,
    value,
    disabled = false,
    placeholder,
    variant = 'outlined',
    valueKey,
}: DropdownCustomProps<T>) => {
    const labelId = useId();
    const [internal, setInternal] = useState<T | null>(defaultValue);
    const isControlled = value !== undefined;

    const getKey = (opt: T): string | number =>
        (valueKey ? (opt[valueKey] as unknown) : opt.id) as string | number;

    const selectedRaw: string | number | '' = isControlled
        ? (value ?? '')
        : (internal ? getKey(internal) : '');

    const findOptionByRaw = (raw: string | number | ''): T | undefined =>
        raw === '' ? undefined : options.find((o) => String(getKey(o)) === String(raw));

    if (variant === 'bare') {
        return (
            <label className="input-field-bare">
                {label && <span className="input-field-bare-label">{label}</span>}
                <select
                    className="input-field-bare-input"
                    name={name}
                    disabled={disabled}
                    value={String(selectedRaw)}
                    onChange={(e) => {
                        const selected = findOptionByRaw(e.target.value);
                        if (!isControlled) setInternal(selected ?? null);
                        onChange?.(selected);
                    }}
                >
                    {placeholder !== undefined && <option value="">{placeholder}</option>}
                    {options.map((opt) => {
                        const key = getKey(opt);
                        return (
                            <option key={String(key)} value={String(key)}>
                                {opt.name}
                            </option>
                        );
                    })}
                </select>
            </label>
        );
    }

    const handleChange = (e: SelectChangeEvent<string | number | ''>) => {
        const selected = findOptionByRaw(e.target.value);
        if (!isControlled) setInternal(selected ?? null);
        onChange?.(selected);
    };

    return (
        <FormControl fullWidth className="custom-dropdown" disabled={disabled}>
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
                labelId={labelId}
                name={name}
                label={label}
                disabled={disabled}
                value={selectedRaw}
                displayEmpty={placeholder !== undefined}
                onChange={handleChange}
            >
                {placeholder !== undefined && (
                    <MenuItem value="">{placeholder}</MenuItem>
                )}
                {options.map((option) => {
                    const key = getKey(option);
                    return (
                        <MenuItem
                            className="custom-dropdown-item"
                            key={String(key)}
                            value={key}
                        >
                            {option.name}
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
};

export default DropdownCustom;
