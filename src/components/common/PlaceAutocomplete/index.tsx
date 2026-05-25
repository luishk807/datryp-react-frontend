import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './index.scss';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import type { PlaceRecommendation } from 'types';

/** Build a /place URL that matches the rest of the app's convention:
 *  `q=<place name>&i=0`. The recommender is tuned for user-typed
 *  search queries ("bali", "south korea"), so packing
 *  `name, city, country` into `q` produces verbose queries that the
 *  recommender / OpenAI details call don't handle well (seen 500s on
 *  obscure places where the ISO country name carries parenthetical
 *  suffixes). Existing surfaces — Saved, Visited, NearbyGrid,
 *  PlaceResultCard — all use the name-only convention; this matches.
 *  Trip id is preserved when present so the destination /place page's
 *  "Add to itinerary" knows which trip to attach to. */
const buildPlaceDetailHref = (
    option: PlaceRecommendation,
    tripId: string | null
): string => {
    const params = new URLSearchParams({ q: option.name, i: '0' });
    if (tripId) params.set('id', tripId);
    return `/place?${params.toString()}`;
};

export interface PlaceSuggestion {
    name: string;
    /** "City, Country" string suitable for the location field. */
    location: string;
    city: string;
    country: string;
    /** ISO 3166-1 alpha-2, uppercase. Null when the underlying place
     *  recommendation predates the prompt change that enriched it. */
    countryCode: string | null;
    imageUrl: string | null;
    /** Approximate coordinates of the picked place. Both null when the
     *  underlying recommendation predates the prompt change. Consumers
     *  (e.g. activity create flow capturing structured place data for
     *  the Mapper trip-link cascade) should treat null as "not yet
     *  enriched" rather than treating the suggestion as invalid. */
    latitude: number | null;
    longitude: number | null;
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
    /** Optional bias prefix prepended to the user's typed query before
     *  it hits the AI. Used by kind-specific forms — e.g. the Hotel
     *  form passes `"hotel"` so typing "marriott" sends "hotel
     *  marriott" to the recommender and the results lean toward
     *  hotels. The user-visible input value is unaffected. */
    queryPrefix?: string;
}

const MIN_CHARS = 3;
// Cut from 800ms → 350ms — typing felt sluggish because the user paused
// nearly a full second between last keystroke and "Searching…" UI. 350ms
// is the typical autocomplete debounce floor that still groups bursty
// typing into one request. Backend caches by normalized query so the
// extra-keystroke cost is bounded.
const DEBOUNCE_MS = 350;
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
    queryPrefix,
}: PlaceAutocompleteProps) => {
    // Picker is rendered inside the trip editor (`/single?id=`, `/multiple?id=`)
    // — read the trip id off the URL so the per-option "View detail" link can
    // carry it into /place. Falls back to a global /place link when the picker
    // is somehow rendered outside a trip route.
    const [searchParams] = useSearchParams();
    const tripId = searchParams.get('id');

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

    // Prepend the bias prefix (if any) to the user's typed query before
    // it hits the recommender. Visible input value stays the user's
    // exact text — the prefix is invisible plumbing that nudges the AI
    // toward the right kind of result.
    const trimmedPrefix = queryPrefix?.trim() ?? '';
    const effectiveQuery = submittedQuery
        ? trimmedPrefix
            ? `${trimmedPrefix} ${submittedQuery}`
            : submittedQuery
        : '';
    const { data, isFetching } = useSearchPlaces(effectiveQuery, LIMIT, country);

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
            countryCode: next.countryCode,
            imageUrl: next.imageUrl,
            latitude: next.latitude,
            longitude: next.longitude,
        });
    };

    return (
        <Autocomplete<PlaceRecommendation, false, false, true>
            freeSolo
            disabled={disabled}
            // Bump popper z-index above MUI Modal (1300) so the dropdown
            // is visible when this picker is rendered inside a modal —
            // most relevant on mobile where some WebKit builds hide
            // popper content behind modals.
            slotProps={{
                popper: { sx: { zIndex: 1500 } },
            }}
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
            // Only flag `loading` while a real API request is in flight,
            // NOT during the local debounce window. With `loading={true}`
            // MUI auto-opens the listbox to show the loading indicator,
            // and once that listbox is mounted some keystrokes — most
            // notably space — get intercepted by its keydown handler
            // before reaching the input. Bug repro: type "Eat" → wait
            // a beat → press space → space is dropped.
            loading={isFetching}
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
                        {/* "View detail" opens the place page in a new
                            tab WITHOUT picking the option. stopPropagation
                            + preventDefault on mousedown is required —
                            MUI's Autocomplete listens on mousedown to
                            commit the highlighted option, which would
                            otherwise fire before our anchor click. */}
                        <a
                            className="place-autocomplete-option-detail"
                            href={buildPlaceDetailHref(option, tripId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Open ${option.name} details in a new tab`}
                            title="View details"
                        >
                            <OpenInNewRoundedIcon fontSize="small" />
                            <span>View</span>
                        </a>
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
