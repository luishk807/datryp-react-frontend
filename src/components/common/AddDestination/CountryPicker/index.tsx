import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { IconButton } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InputField from 'components/common/FormFields/InputField';
import SearchBar from 'components/SearchBar';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import { useCountries } from 'api/hooks/useCountries';
import type { Country } from 'types';
import './index.scss';

export interface CountryPickerProps {
    mode: 'add' | 'edit';
    country: Country | null;
    defaultCountry?: Country | null;
    firstPlace: PlaceSuggestion | null;
    onCountryChange: (country: Country | null) => void;
    onFirstPlaceChange: (place: PlaceSuggestion | null) => void;
    /** ADD-only: the user submitted the smart box. Carries the raw text
     *  (to seed step 2's transport box) and a best-effort resolved
     *  country (may be null — step 2 surfaces a picker when so). */
    onSmartAdvance: (text: string, country: Country | null) => void;
}

const ENTRY_MODE = { SEARCH: 'search', TYPE: 'type' } as const;
type EntryMode = (typeof ENTRY_MODE)[keyof typeof ENTRY_MODE];

const PLACEHOLDER = 'EWR to Panama City June 6 on Copa for $450';

const SEGMENTS = [
    { value: ENTRY_MODE.TYPE, label: 'Type it' },
    { value: ENTRY_MODE.SEARCH, label: 'Search' },
] as const;

/** Pull the most country-like token out of a smart-entry sentence. We bias
 *  the destination over the origin: take the chunk after the last "to" /
 *  arrow if present, otherwise the whole text. The async catalog lookup
 *  does the real resolution; this just narrows the query. */
const guessCountryQuery = (text: string): string => {
    const lower = text.trim();
    const arrowSplit = lower.split(/\s+(?:to|->|→)\s+/i);
    const tail = arrowSplit.length > 1 ? arrowSplit[arrowSplit.length - 1] : lower;
    // Drop trailing date / cost / operator noise — keep the leading words
    // (the city / country name) before any of those markers.
    const cut = tail.split(
        /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
    )[0];
    return (cut || tail).trim();
};

/** Step 1 — Destination. Segmented "Type it" vs "Search". Type-it parses a
 *  free sentence and best-effort resolves the country to a confirmable
 *  chip, advancing to step 2 with the raw text. Search uses the country
 *  SearchBar + an optional first place, then Continue. */
const CountryPicker = ({
    mode,
    country,
    defaultCountry,
    firstPlace,
    onCountryChange,
    onFirstPlaceChange,
    onSmartAdvance,
}: CountryPickerProps) => {
    const isEdit = mode === 'edit';
    const [entryMode, setEntryMode] = useState<EntryMode>(ENTRY_MODE.SEARCH);
    const [smartText, setSmartText] = useState('');
    const [firstPlaceText, setFirstPlaceText] = useState('');
    // The country query we want resolved when the user submits the smart
    // box. Empty until submit so we don't fire the catalog on every key.
    const [resolveQuery, setResolveQuery] = useState('');

    const { data: matches, isFetching } = useCountries(resolveQuery, {
        enabled: resolveQuery.length > 0,
        limit: 5,
    });

    // Once a resolution query settles, advance with the best match (or
    // null so step 2 shows its own picker). Runs only while we have an
    // active query — cleared immediately after to avoid re-firing.
    useEffect(() => {
        if (!resolveQuery || isFetching) return;
        const best = matches?.[0];
        const resolved: Country | null = best
            ? {
                  id: best.id,
                  name: best.name,
                  code: best.code,
                  local: best.local ?? undefined,
                  image: best.image ?? undefined,
              }
            : null;
        onSmartAdvance(smartText.trim(), resolved);
        setResolveQuery('');
        // onSmartAdvance is stable enough for our purpose; re-running only
        // on a settled query is the intent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches, isFetching, resolveQuery]);

    const handleSmartSubmit = () => {
        const text = smartText.trim();
        if (!text) return;
        const query = guessCountryQuery(text);
        if (!query) {
            onSmartAdvance(text, null);
            return;
        }
        setResolveQuery(query);
    };

    const handleFirstPlaceText = (text: string) => {
        setFirstPlaceText(text);
        if (firstPlace && text !== firstPlace.name) onFirstPlaceChange(null);
    };

    const handleFirstPlacePicked = (suggestion: PlaceSuggestion) => {
        onFirstPlaceChange(suggestion);
        setFirstPlaceText(suggestion.name);
    };

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">Where to?</h4>
            </header>

            {/* Edit mode is a plain country picker — no segmented entry. */}
            {!isEdit && (
                <div
                    className={classNames('country-picker-seg', {
                        'is-type': entryMode === ENTRY_MODE.TYPE,
                    })}
                    role="tablist"
                    aria-label="Destination entry mode"
                >
                    <span className="country-picker-seg-thumb" aria-hidden="true" />
                    {SEGMENTS.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            role="tab"
                            aria-selected={entryMode === s.value}
                            className={classNames('country-picker-seg-btn', {
                                selected: entryMode === s.value,
                            })}
                            onClick={() => setEntryMode(s.value)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}

            {!isEdit && entryMode === ENTRY_MODE.TYPE ? (
                <>
                    {country ? (
                        <div className="country-picker-chip">
                            <span className="country-picker-chip-label">
                                Destination:{' '}
                                <strong>{country.name}</strong>
                            </span>
                            <button
                                type="button"
                                className="country-picker-chip-change"
                                onClick={() => onCountryChange(null)}
                            >
                                change
                            </button>
                        </div>
                    ) : (
                        <form
                            className="country-picker-smart"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSmartSubmit();
                            }}
                        >
                            <AutoAwesomeRoundedIcon className="country-picker-smart-spark" />
                            <InputField
                                variant="bare"
                                name="destination-smart"
                                value={smartText}
                                required={false}
                                label="Describe your destination & transport"
                                placeholder={PLACEHOLDER}
                                onChange={(e) => setSmartText(e.target.value)}
                            />
                            <IconButton
                                type="submit"
                                className="country-picker-smart-go"
                                aria-label="Parse and continue"
                                disabled={!smartText.trim() || isFetching}
                            >
                                <ArrowForwardRoundedIcon fontSize="small" />
                            </IconButton>
                        </form>
                    )}
                    {country && (
                        <p className="country-picker-smart-note">
                            We&rsquo;ll carry your transport details to the next
                            step.
                        </p>
                    )}
                </>
            ) : (
                <>
                    <div className="add-destination-field">
                        <label className="add-destination-label">Country</label>
                        <SearchBar
                            defaultValue={defaultCountry ?? undefined}
                            type="simple"
                            onSelected={onCountryChange}
                        />
                    </div>
                    {!isEdit && (
                        <div className="add-destination-field">
                            <label className="add-destination-label">
                                First place to visit{' '}
                                <span className="add-destination-optional">
                                    (optional)
                                </span>
                            </label>
                            <PlaceAutocomplete
                                value={firstPlaceText}
                                onTextChange={handleFirstPlaceText}
                                onSelect={handleFirstPlacePicked}
                                country={country?.name}
                                label={
                                    country?.name
                                        ? `First place in ${country.name}`
                                        : 'First place to visit'
                                }
                                placeholder={
                                    country?.name
                                        ? 'Type a landmark or activity in this country'
                                        : 'Pick the country above first'
                                }
                                disabled={!country?.name}
                            />
                            {firstPlace && (
                                <div className="country-picker-chip is-place">
                                    <span className="country-picker-chip-label">
                                        {firstPlace.name}
                                    </span>
                                    <button
                                        type="button"
                                        className="country-picker-chip-change"
                                        aria-label="Remove first place"
                                        onClick={() => {
                                            onFirstPlaceChange(null);
                                            setFirstPlaceText('');
                                        }}
                                    >
                                        <CloseRoundedIcon fontSize="small" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default CountryPicker;
