import { useState } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    type SelectChangeEvent,
} from '@mui/material';
import './index.css';

export interface DropdownOption {
    id: number | string;
    name: string;
}

export interface DropdownCustomProps<T extends DropdownOption = DropdownOption> {
    options?: T[];
    label?: string;
    onChange?: (option: T | undefined) => void;
    name?: string;
    defaultValue?: T | null;
}

const DropdownCustom = <T extends DropdownOption = DropdownOption>({
    options = [],
    label = '',
    onChange,
    name,
    defaultValue = null,
}: DropdownCustomProps<T>) => {
    const [value, setValue] = useState<T | null>(defaultValue);

    const handleChange = (e: SelectChangeEvent<T['id']>) => {
        const selected = options.find((item) => item.id === e.target.value);
        if (selected) {
            setValue(selected);
            onChange?.(selected);
        }
    };

    if (!value) return null;

    return (
        <FormControl fullWidth className="custom-dropdown">
            <InputLabel id="dropdown-custom-label">{label}</InputLabel>
            <Select
                labelId="dropdown-custom-label"
                name={name}
                label={label}
                value={value.id}
                onChange={handleChange}
            >
                {options.map((option, indx) => (
                    <MenuItem
                        className="custom-dropdown-item"
                        key={indx}
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
