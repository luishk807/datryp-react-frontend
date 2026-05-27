/**
 * Airport picker with autocomplete. Backed by `/airports/search` on the
 * Python backend (static IATA catalog seeded from `app/data/airports.py`).
 *
 * Usage — same shape as a controlled text input:
 *
 *     <AirportAutocomplete
 *         value={segment.departAirport ?? ''}
 *         onChange={(code) => setSegment({ ...segment, departAirport: code })}
 *         label="From"
 *         placeholder="e.g. JFK, Tokyo, Heathrow"
 *     />
 *
 * `value` and `onChange` carry the IATA code (e.g. "JFK"). The component
 * shows a richer "JFK — New York, United States" row in the dropdown
 * but only persists the code, matching the existing FlightInfo.depart/
 * arrivalAirport shape.
 *
 * `freeSolo` means the user can type any string (e.g. a code for an
 * airport not in our static catalog) and it gets saved as-is. The
 * dropdown is just a convenience layer — anything they type without
 * picking from the list ends up in the form state too.
 */
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAirports } from 'api/hooks/useAirports';
import type { AirportOption } from 'api/airportsApi';
import './index.scss';

export interface AirportAutocompleteProps {
    /** IATA code currently saved. Empty string when no airport picked yet. */
    value: string;
    /** Fires with the new IATA code (or free-typed text uppercased). */
    onChange: (iataCode: string) => void;
    /** Fires when the user picks an option from the dropdown (NOT for
     *  free-typed strings) with the full airport record. Lets the
     *  parent prefill related fields (e.g. flight image based on the
     *  destination city). */
    onSelectMeta?: (option: AirportOption) => void;
    label?: string;
    placeholder?: string;
    /** Disable input while a parent save is in flight. */
    disabled?: boolean;
    /** Forwarded to the underlying TextField — useful for form layouts. */
    fullWidth?: boolean;
}

const AirportAutocomplete = ({
    value,
    onChange,
    onSelectMeta,
    label,
    placeholder = 'IATA code, city, or airport',
    disabled,
    fullWidth = true,
}: AirportAutocompleteProps) => {
    // Track the input string separately from the persisted IATA code.
    // This lets the user clear the field, retype, and see fresh search
    // results. Sync from `value` when the parent updates it externally
    // (e.g. an edit-mode form seeding the field after data loads) so
    // saved airports show up; once the user starts typing, the local
    // state is the source of truth for what renders in the input.
    const [inputValue, setInputValue] = useState<string>(value);
    useEffect(() => {
        setInputValue(value);
    }, [value]);
    const { data, isFetching } = useAirports(inputValue);
    const options = data?.items ?? [];

    const handleChange = (
        _event: SyntheticEvent,
        newValue: AirportOption | string | null,
    ) => {
        if (newValue == null) {
            onChange('');
            return;
        }
        if (typeof newValue === 'string') {
            // User pressed Enter on a free-typed string — uppercase + trim
            // and store. Doesn't have to be in our catalog.
            onChange(newValue.trim().toUpperCase());
            return;
        }
        onChange(newValue.iataCode);
        onSelectMeta?.(newValue);
    };

    return (
        <Autocomplete<AirportOption, false, false, true>
            className="airport-autocomplete"
            freeSolo
            // MUI Popper defaults to z-index 1300 — same as MUI Modal —
            // so when this picker lives inside a modal (AddDestination /
            // AddPlace flight segment) the dropdown can render behind
            // the modal on some mobile WebKit builds. Bump the popper
            // above the modal layer explicitly so the dropdown is
            // always visible.
            slotProps={{
                popper: { sx: { zIndex: 1500 } },
            }}
            // Server-side ranking — disable client filter so we don't
            // double-filter the already-ranked list.
            filterOptions={(x) => x}
            options={options}
            // `value` is the source of truth IATA code (string); we
            // surface it via inputValue rather than try to map back to
            // an AirportOption object.
            value={null}
            // `inputValue` alone — no `|| value` fallback. The fallback
            // made a cleared field snap back to the saved IATA code,
            // which read as "I can't change this airport". The
            // useEffect above keeps `inputValue` in sync with `value`
            // when the parent updates it externally.
            inputValue={inputValue}
            onInputChange={(_event, newInput, reason) => {
                if (reason === 'reset' && !newInput) return;
                setInputValue(newInput);
                // Push every keystroke up to the parent too — without
                // this, free-typed text only persisted when the user
                // pressed Enter or picked from the dropdown, so people
                // who typed an IATA code and hit Save found their
                // change silently dropped. On selection, the
                // Autocomplete's own onChange (handleChange below)
                // fires with the option's iataCode and overrides this.
                if (reason === 'input') {
                    onChange(newInput.toUpperCase());
                }
            }}
            onChange={handleChange}
            getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.iataCode
            }
            isOptionEqualToValue={(opt, val) =>
                typeof val === 'string'
                    ? opt.iataCode === val
                    : opt.iataCode === val.iataCode
            }
            renderOption={(props, option) => (
                <li
                    {...props}
                    key={option.iataCode}
                    className="airport-autocomplete-option"
                >
                    <span className="airport-autocomplete-option-code">
                        {option.iataCode}
                    </span>
                    <span className="airport-autocomplete-option-city">
                        {option.city}
                    </span>
                    <span className="airport-autocomplete-option-country">
                        {option.country}
                    </span>
                </li>
            )}
            disabled={disabled}
            fullWidth={fullWidth}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    variant="outlined"
                    size="small"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isFetching ? (
                                    <CircularProgress
                                        color="inherit"
                                        size={14}
                                    />
                                ) : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
};

export default AirportAutocomplete;
