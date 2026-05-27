/**
 * City picker with autocomplete. Backed by the unified `/places`
 * resolver (`usePlaces`), filtered down to city kind — the same source
 * the homepage SearchBar uses. Returns the full structured city info
 * (name, country, ISO-2 code, lat/lng) so callers can persist all five
 * fields without a second round-trip.
 *
 * Usage:
 *
 *     <CityAutocomplete
 *         value={selected}            // { city, country, ... } | null
 *         onChange={setSelected}
 *         label="Home city"
 *         placeholder="Search a city"
 *     />
 *
 * Mirrors AirportAutocomplete's shape (Material UI Autocomplete +
 * debounced server search) so the look/feel matches the existing form
 * primitives.
 */
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePlaces, type PlaceResult } from 'api/hooks/usePlaces';
import './index.scss';

/** Compact value the parent persists — same shape the backend's
 *  `home_*` preference fields expect, rebrand-ed to camelCase. */
export interface CitySelection {
    city: string;
    country: string;
    countryCode: string;
    latitude: number | null;
    longitude: number | null;
}

export interface CityAutocompleteProps {
    /** Current selection. Null when the user hasn't picked a city yet. */
    value: CitySelection | null;
    /** Fires with the new selection (or null when the user clears the
     *  field). */
    onChange: (next: CitySelection | null) => void;
    label?: string;
    placeholder?: string;
    /** Disable input while a parent save is in flight. */
    disabled?: boolean;
    fullWidth?: boolean;
    /** `'outlined'` (default): MUI floating-label pill that matches
     *  AirportAutocomplete. `'bare'`: stacked uppercase-caps label above
     *  a flat rounded input — matches the settings-form aesthetic used
     *  by `InputField`/`DropDown` with `variant="bare"`. */
    variant?: 'outlined' | 'bare';
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const LIMIT = 10;

const optionLabel = (sel: CitySelection): string =>
    sel.country ? `${sel.city}, ${sel.country}` : sel.city;

const placeToSelection = (p: PlaceResult): CitySelection => ({
    city: p.name,
    country: p.countryName,
    countryCode: p.countryCode,
    latitude: p.latitude,
    longitude: p.longitude,
});

const CityAutocomplete = ({
    value,
    onChange,
    label,
    placeholder = 'Search a city',
    disabled,
    fullWidth = true,
    variant = 'outlined',
}: CityAutocompleteProps) => {
    const isBare = variant === 'bare';
    // Track input text separately from the committed selection — same
    // pattern as AirportAutocomplete. Lets the user edit the typed text
    // without losing the dropdown state.
    const [inputValue, setInputValue] = useState<string>(
        value ? optionLabel(value) : ''
    );
    const [debounced, setDebounced] = useState('');

    // Sync the visible text whenever the parent commits a new selection
    // (e.g. on edit-mode mount). Once the user starts typing, the local
    // state takes over.
    useEffect(() => {
        setInputValue(value ? optionLabel(value) : '');
    }, [value]);

    useEffect(() => {
        const trimmed = inputValue.trim();
        if (trimmed.length < MIN_CHARS) {
            setDebounced('');
            return;
        }
        const handle = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [inputValue]);

    const { data, isFetching } = usePlaces(debounced, {
        enabled: debounced.length >= MIN_CHARS,
        limit: LIMIT,
    });

    // Cities only — the `/places` resolver returns both cities and
    // countries; the home-base field is city-level so we drop the
    // country rows. Backend already orders cities by population so the
    // first option is usually the right one.
    const options = useMemo<PlaceResult[]>(
        () => (data ?? []).filter((p) => p.kind === 'city'),
        [data]
    );

    const handleChange = (
        _event: SyntheticEvent,
        next: PlaceResult | string | null
    ) => {
        if (next == null) {
            onChange(null);
            return;
        }
        if (typeof next === 'string') {
            // Free-typed strings can't fulfil the lat/lng contract —
            // we silently ignore the Enter and wait for the user to
            // pick a real option from the dropdown.
            return;
        }
        onChange(placeToSelection(next));
    };

    const autocomplete = (
        <Autocomplete<PlaceResult, false, false, true>
            className={isBare ? 'city-autocomplete is-bare' : 'city-autocomplete'}
            freeSolo
            // Bump above MUI Modal (z-index 1300) so the dropdown stays
            // visible when this picker is used inside a modal — same
            // mobile WebKit quirk AirportAutocomplete works around.
            slotProps={{ popper: { sx: { zIndex: 1500 } } }}
            // Server-side ranking — disable client filter so we don't
            // double-filter the already-ranked list.
            filterOptions={(x) => x}
            options={options}
            value={null}
            inputValue={inputValue}
            onInputChange={(_event, next, reason) => {
                if (reason === 'reset' && !next) return;
                setInputValue(next);
            }}
            onChange={handleChange}
            getOptionLabel={(option) =>
                typeof option === 'string'
                    ? option
                    : `${option.name}, ${option.countryName}`
            }
            isOptionEqualToValue={(opt, val) =>
                typeof val === 'string' ? false : opt.id === val.id
            }
            disabled={disabled}
            fullWidth={fullWidth}
            loading={isFetching}
            noOptionsText={
                inputValue.trim().length < MIN_CHARS
                    ? `Type at least ${MIN_CHARS} characters`
                    : isFetching
                        ? 'Searching…'
                        : 'No cities match.'
            }
            renderOption={(props, option) => (
                <li
                    {...props}
                    key={option.id}
                    className="city-autocomplete-option"
                >
                    <span className="city-autocomplete-option-name">
                        {option.name}
                    </span>
                    <span className="city-autocomplete-option-country">
                        {option.countryName}
                    </span>
                    <span className="city-autocomplete-option-code">
                        {option.countryCode}
                    </span>
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    // Bare mode hides MUI's floating notched label so we
                    // can stack our own uppercase caps label above the
                    // field — matches InputField/DropDown bare variants.
                    label={isBare ? undefined : label}
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

    if (isBare) {
        return (
            <label className="city-autocomplete-bare">
                {label && (
                    <span className="city-autocomplete-bare-label">
                        {label}
                    </span>
                )}
                {autocomplete}
            </label>
        );
    }
    return autocomplete;
};

export default CityAutocomplete;
