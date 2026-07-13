import { useState, useEffect, type ReactNode } from 'react';
import classnames from 'classnames';
import './index.scss';
import {
    TextField,
    Autocomplete,
    Chip,
    type AutocompleteChangeReason,
    type AutocompleteChangeDetails,
} from '@mui/material';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';

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
    onRemove?: (removed: T[]) => void;
    selectedOptions?: T[];
    renderOption?: (option: T, isSelected: boolean) => ReactNode;
    /** Accessible name for the combobox input when there's no visible field
     *  `label` (e.g. the label lives in a section header above the picker).
     *  Applied as `aria-label` on the native input. */
    ariaLabel?: string;
    /** Accessible name for each selected chip's remove button, per option
     *  (e.g. "Remove Alice"). When provided, chips render a real, named
     *  `<button>` delete affordance instead of MUI's unlabeled default icon. */
    getRemoveAriaLabel?: (option: T) => string;
}

// Stable empty-array default. Without it, omitting `selectedOptions` handed the
// sync effect below a FRESH `[]` on every render, so its `[selectedOptions]`
// dep always "changed" → setData → re-render → infinite loop. A shared module
// reference keeps the dependency stable when the caller passes nothing.
const EMPTY_SELECTION: never[] = [];

const AutocompleteCustom = <T extends AutocompleteOption = AutocompleteOption>({
    options = [],
    label = '',
    isMultiple = false,
    onSelect,
    name,
    onRemove,
    selectedOptions = EMPTY_SELECTION,
    renderOption,
    ariaLabel,
    getRemoveAriaLabel,
}: AutocompleteCustomProps<T>) => {
    const [data, setData] = useState<T[]>([]);

    useEffect(() => {
        setData(selectedOptions);
    }, [selectedOptions]);

    // Selection flows through MUI's own onChange rather than a hand-rolled
    // per-option onClick. That keeps the options fully keyboard-operable:
    // MUI leaves focus on the input and drives the highlighted option via
    // aria-activedescendant, so Arrow keys + Enter select without ever
    // needing the option element itself to be focusable. We translate MUI's
    // add/remove events back into this component's onSelect / onRemove.
    const handleOnChange = (
        _event: unknown,
        newValue: T[],
        reason: AutocompleteChangeReason,
        details?: AutocompleteChangeDetails<T>
    ) => {
        const option = details?.option;
        if (reason === 'selectOption' && option) {
            onSelect?.(option);
            return;
        }
        // removeOption / clear — report the items that left the selection,
        // preserving the original callback contract (onRemove receives the
        // removed options, not the survivors).
        const nextIds = new Set(newValue.map((item) => item.id));
        const removed = data.filter((item) => !nextIds.has(item.id));
        if (removed.length) onRemove?.(removed);
    };

    return (
        <Autocomplete
            multiple={isMultiple}
            id="combo-box-demo"
            options={options}
            value={data}
            freeSolo
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={handleOnChange}
            renderTags={
                getRemoveAriaLabel
                    ? (value, getTagProps) =>
                          value.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({
                                  index,
                              });
                              return (
                                  <Chip
                                      key={key}
                                      label={option.label}
                                      {...tagProps}
                                      // A real <button> (not MUI's default,
                                      // aria-hidden SVG) so screen readers
                                      // announce a named, operable delete
                                      // control. tabIndex -1 matches MUI's
                                      // "chips aren't tab stops" pattern —
                                      // keyboard removal is Backspace on the
                                      // empty input.
                                      deleteIcon={
                                          <button
                                              type="button"
                                              tabIndex={-1}
                                              className="autocomplete-custom-remove"
                                              aria-label={getRemoveAriaLabel(
                                                  option
                                              )}
                                          >
                                              <CancelRoundedIcon
                                                  fontSize="small"
                                                  aria-hidden="true"
                                              />
                                          </button>
                                      }
                                  />
                              );
                          })
                    : undefined
            }
            renderOption={(props, option) => {
                // MUI (>=5.15) puts `key` in the props object; pull it out so
                // it's passed explicitly and the rest spreads cleanly onto the
                // <li> — this spread is what carries role="option", the id
                // referenced by aria-activedescendant, and MUI's click/keyboard
                // selection wiring.
                const { key, ...optionProps } = props;
                const alreadySelected = selectedOptions.some(
                    (item) => item.id === option.id
                );

                if (renderOption) {
                    return (
                        <li
                            {...optionProps}
                            key={`fd-${option.id}`}
                            className={classnames(
                                optionProps.className,
                                'autocomplete-custom-li',
                                { disabled: alreadySelected && option.id !== -1 }
                            )}
                        >
                            {renderOption(option, alreadySelected)}
                        </li>
                    );
                }

                if (option.id === -1) {
                    return (
                        <li
                            {...optionProps}
                            key={`fd-${option.id}`}
                            className={classnames(optionProps.className)}
                        >
                            <hr className="my-2" />
                            <div className="autocomplete-custom-option">
                                {option.label}
                            </div>
                        </li>
                    );
                }
                return (
                    <li
                        {...optionProps}
                        key={`fd-${option.id}`}
                        className={classnames(optionProps.className, {
                            disabled: alreadySelected,
                        })}
                    >
                        <div className="autocomplete-custom-item">
                            {option.label}
                        </div>
                    </li>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    name={name}
                    label={label}
                    inputProps={{
                        ...params.inputProps,
                        // Names the combobox when there's no visible field
                        // label (title="" case). Merged into MUI's own
                        // inputProps so role/aria-autocomplete wiring survives.
                        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
                    }}
                />
            )}
        />
    );
};

export default AutocompleteCustom;
