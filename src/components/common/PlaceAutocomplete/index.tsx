import { useEffect, useMemo, useState } from 'react';
import './index.scss';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import type { PlaceRecommendation } from 'types';

export interface PlaceSuggestion {
    name: string;
    /** "City, Country" string suitable for the location field. */
    location: string;
    city: string;
    country: string;
    imageUrl: string | null;
}

export interface PlaceAutocompleteProps {
    /** Current value of the underlying free-text input. The parent owns
     *  the actual form state; this component just suggests + commits. */
    value: string;
    /** Free-text typing — runs on every keystroke without debounce. */
    onTextChange: (text: string) => void;
    /** Fired when the user picks an AI suggestion from the dropdown. */
    onSelect: (suggestion: PlaceSuggestion) => void;
    /** Optional country scope. When set, AI suggestions are constrained to
     *  that country (a Spain trip's autocomplete won't surface the Eiffel
     *  Tower). Omit for a global search. */
    country?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 800;
const LIMIT = 5;

/** Free-text input with AI-suggested places in a dropdown. Backend caches
 *  by normalized query, so repeated identical searches don't burn OpenAI
 *  tokens (e.g. typing "bali" twice in the same session is one DB read).
 *  Falls back to manual typing if no suggestion fits — the parent gets the
 *  raw text via onTextChange regardless. */
const PlaceAutocomplete = ({
    value,
    onTextChange,
    onSelect,
    country,
    label = 'Name of Place',
    placeholder = 'Start typing — we\'ll suggest matching places',
    disabled = false,
}: PlaceAutocompleteProps) => {
    // Debounced submitted query. Only crosses MIN_CHARS triggers a fetch;
    // shorter input clears the dropdown without burning OpenAI on partials.
    const [submittedQuery, setSubmittedQuery] = useState('');
    // Tracks whether the user is actively typing — keeps the dropdown
    // closed during the debounce window so it doesn't flash empty/loading
    // states on every keystroke.
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const trimmed = value.trim();
        if (trimmed.length < MIN_CHARS) {
            setSubmittedQuery('');
            setIsTyping(false);
            return;
        }
        // If the new value already matches the in-flight query, no need to
        // re-debounce — the dropdown can stay open with the resolved data.
        if (trimmed === submittedQuery) {
            setIsTyping(false);
            return;
        }
        setIsTyping(true);
        const handle = setTimeout(() => {
            setSubmittedQuery(trimmed);
            setIsTyping(false);
        }, DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [value, submittedQuery]);

    const { data, isFetching } = useSearchPlaces(submittedQuery, LIMIT, country);

    // While the user is mid-keystroke we hand MUI an empty options array
    // so the dropdown has nothing to flash. We deliberately DON'T control
    // `open` itself — forcing `open={false}` while typing was swallowing
    // the space key (MUI treats some keys as dropdown signals when open
    // is controlled). Letting MUI manage open naturally + starving it of
    // options achieves the same visual calm without breaking input.
    const options = useMemo<PlaceRecommendation[]>(() => {
        if (isTyping) return [];
        return data?.items ?? [];
    }, [data, isTyping]);

    const handleChange = (
        _event: unknown,
        next: string | PlaceRecommendation | null
    ) => {
        if (!next) return;
        if (typeof next === 'string') {
            // freeSolo committed string — let the parent keep its typed text.
            // Don't fire onSelect (no place metadata to fill location/image).
            onTextChange(next);
            return;
        }
        onSelect({
            name: next.name,
            location: `${next.city}, ${next.country}`,
            city: next.city,
            country: next.country,
            imageUrl: next.imageUrl,
        });
    };

    return (
        <Autocomplete<PlaceRecommendation, false, false, true>
            freeSolo
            disabled={disabled}
            options={options}
            inputValue={value}
            // Disable MUI's built-in client-side filtering — the backend
            // already returns AI-curated matches for the typed query, so
            // filtering them would hide relevant results.
            filterOptions={(x) => x}
            getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.name
            }
            onInputChange={(_e, next, reason) => {
                if (reason === 'reset') return;
                onTextChange(next);
            }}
            onChange={handleChange}
            loading={isFetching || isTyping}
            noOptionsText={
                value.trim().length < MIN_CHARS
                    ? `Type at least ${MIN_CHARS} characters`
                    : isTyping
                        ? 'Waiting for you to finish typing…'
                        : isFetching
                            ? 'Searching…'
                            : 'No suggestions — keep typing to use this name as-is.'
            }
            renderOption={(props, option) => {
                const { key, ...rest } = props as {
                    key: string;
                    [k: string]: unknown;
                };
                return (
                    <li
                        key={key ?? `${option.name}-${option.city}`}
                        {...rest}
                        className="place-autocomplete-option"
                    >
                        {option.imageUrl ? (
                            <img
                                src={option.imageUrl}
                                alt=""
                                loading="lazy"
                                className="place-autocomplete-option-thumb"
                            />
                        ) : (
                            <span className="place-autocomplete-option-thumb is-placeholder">
                                <LocationOnRoundedIcon fontSize="small" />
                            </span>
                        )}
                        <span className="place-autocomplete-option-text">
                            <span className="place-autocomplete-option-name">
                                {option.name}
                            </span>
                            <span className="place-autocomplete-option-loc">
                                {option.city} · {option.country}
                            </span>
                        </span>
                    </li>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isFetching && (
                                    <CircularProgress
                                        size={16}
                                        color="inherit"
                                    />
                                )}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
};

export default PlaceAutocomplete;
