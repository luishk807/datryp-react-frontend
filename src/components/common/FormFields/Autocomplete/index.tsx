import { useState, useEffect, type ReactNode } from 'react';
import classnames from 'classnames';
import './index.css';
import { TextField, Autocomplete } from '@mui/material';

export interface AutocompleteOption {
    id: number;
    label: string;
}

export interface AutocompleteCustomProps<T extends AutocompleteOption = AutocompleteOption> {
    options?: T[];
    label?: string;
    isMultiple?: boolean;
    onSelect?: (selected: T) => void;
    name?: string;
    onRemove?: (remaining: T[]) => void;
    selectedOptions?: T[];
    renderOption?: (option: T, isSelected: boolean) => ReactNode;
}

const AutocompleteCustom = <T extends AutocompleteOption = AutocompleteOption>({
    options = [],
    label = '',
    isMultiple = false,
    onSelect,
    name,
    onRemove,
    selectedOptions = [],
    renderOption,
}: AutocompleteCustomProps<T>) => {
    const [data, setData] = useState<T[]>([]);

    const handleOnClick = (selected: T) => {
        if (selected.id !== -1) {
            const exists = data.some((item) => item.id === selected.id);
            if (!exists) setData((prev) => [...prev, selected]);
        }
        onSelect?.(selected);
    };

    const handleOnChange = (_event: unknown, newValue: T[]) => {
        const ids = new Set(newValue.map((item) => item.id));
        const remaining = data.filter((item) => !ids.has(item.id));
        onRemove?.(remaining);
    };

    useEffect(() => {
        setData(selectedOptions);
    }, [selectedOptions]);

    return (
        <Autocomplete
            multiple={isMultiple}
            id="combo-box-demo"
            options={options}
            value={data}
            freeSolo
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={handleOnChange}
            renderOption={(_props, option) => {
                const alreadySelected = selectedOptions.some(
                    (item) => item.id === option.id
                );

                if (renderOption) {
                    return (
                        <li
                            key={`fd-${option.id}`}
                            className={classnames('autocomplete-custom-li', {
                                disabled: alreadySelected && option.id !== -1,
                            })}
                            onClick={() => handleOnClick(option)}
                        >
                            {renderOption(option, alreadySelected)}
                        </li>
                    );
                }

                if (option.id === -1) {
                    return (
                        <li key={`fd-${option.id}`}>
                            <hr className="my-2" />
                            <div
                                className="autocomplete-custom-option"
                                onClick={() => handleOnClick(option)}
                            >
                                {option.label}
                            </div>
                        </li>
                    );
                }
                return (
                    <li key={`fd-${option.id}`}>
                        <div
                            className={classnames({
                                'autocomplete-custom-item': true,
                                disabled: alreadySelected,
                            })}
                            onClick={() => handleOnClick(option)}
                        >
                            {option.label}
                        </div>
                    </li>
                );
            }}
            renderInput={(params) => <TextField {...params} name={name} label={label} />}
        />
    );
};

export default AutocompleteCustom;
