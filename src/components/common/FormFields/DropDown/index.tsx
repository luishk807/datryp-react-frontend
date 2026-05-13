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

export interface DropdownCustomProps<T extends DropdownOption = DropdownOption> {
    options?: T[];
    label?: string;
    onChange?: (option: T | undefined) => void;
    name?: string;
    /** Uncontrolled initial selection. Ignored when `value` is supplied. */
    defaultValue?: T | null;
    /** Controlled selection (the option id). Pass `null` for empty. */
    value?: T['id'] | null;
}

const DropdownCustom = <T extends DropdownOption = DropdownOption>({
    options = [],
    label = '',
    onChange,
    name,
    defaultValue = null,
    value,
}: DropdownCustomProps<T>) => {
    const labelId = useId();
    const [internal, setInternal] = useState<T | null>(defaultValue);
    const isControlled = value !== undefined;
    const selectedId: T['id'] | '' = isControlled
        ? (value ?? '')
        : (internal?.id ?? '');

    const handleChange = (e: SelectChangeEvent<T['id'] | ''>) => {
        const raw = e.target.value;
        const selected =
            raw === '' ? undefined : options.find((item) => item.id === raw);
        if (!isControlled) setInternal(selected ?? null);
        onChange?.(selected);
    };

    return (
        <FormControl fullWidth className="custom-dropdown">
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
                labelId={labelId}
                name={name}
                label={label}
                value={selectedId}
                onChange={handleChange}
            >
                {options.map((option) => (
                    <MenuItem
                        className="custom-dropdown-item"
                        key={String(option.id)}
                        value={option.id}
                    >
                        {option.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default DropdownCustom;
