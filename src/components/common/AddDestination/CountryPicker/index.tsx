import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { IconButton } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import InputField from 'components/common/FormFields/InputField';
import SearchBar from 'components/SearchBar';
import { useCountries } from 'api/hooks/useCountries';
import type { PlaceResult } from 'api/hooks/usePlaces';
import { ACTIVITY_KIND } from 'constants';
import type { Country } from 'types';
import type { TransportKind } from '../TransportStep';
import './index.scss';

export interface CountryPickerProps {
    mode: 'add' | 'edit';
    country: Country | null;
    defaultCountry?: Country | null;
    onCountryChange: (country: Country | null) => void;
    /** ADD-only: the user submitted the smart box. Carries the raw text
     *  (to seed step 2's transport box), a best-effort resolved country
     *  (may be null — step 2 surfaces a picker when so), and the transport
     *  kind detected from the text so step 2 lands straight on the parsed
     *  result instead of the empty chooser. */
    onSmartAdvance: (
        text: string,
        country: Country | null,
        kind: TransportKind,
    ) => void;
}

const ENTRY_MODE = { SEARCH: 'search', TYPE: 'type' } as const;
type EntryMode = (typeof ENTRY_MODE)[keyof typeof ENTRY_MODE];

const PLACEHOLDER = 'EWR to Panama City June 6 on Copa for $450';

const SEGMENTS = [
    { value: ENTRY_MODE.TYPE, label: 'Type it' },
    { value: ENTRY_MODE.SEARCH, label: 'Search' },
] as const;

// Why we resolve a country query: a smart-box submit advances to step 2;
// a city/country pick from the Search dropdown just sets the destination.
type ResolvePurpose = 'smart' | 'pick';

// Ground-transport keyword cues. A destination smart-entry defaults to
// FLIGHT (you fly to a country far more often than not) and only flips to
// train / bus / rental when the text says so explicitly — far more robust
// than the general classifier, which reads a bare "<airport> to <city> on
// <airline>" as a train (the airline becomes a generic "operator").
const TRAIN_RE =
    /\b(train|rail|railway|renfe|amtrak|eurostar|sncf|trenitalia|shinkansen|ave|tgv|ice)\b/i;
const BUS_RE = /\b(bus|flixbus|greyhound|megabus|coach|ouibus)\b/i;
const RENTAL_RE =
    /\b(rental|car rental|rent a car|hertz|avis|enterprise|sixt|budget|alamo|thrifty)\b/i;

const detectTransportKind = (text: string): TransportKind => {
    if (TRAIN_RE.test(text)) return ACTIVITY_KIND.TRAIN;
    if (BUS_RE.test(text)) return ACTIVITY_KIND.BUS;
    if (RENTAL_RE.test(text)) return ACTIVITY_KIND.RENTAL_CAR;
    return ACTIVITY_KIND.FLIGHT;
};

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
 *  free sentence, best-effort resolves the country, detects the transport
 *  kind, and advances to step 2's parsed result. Search is a unified
 *  city-or-country autocomplete (a city pick resolves to its country, since
 *  a destination is country-level). No "first place" — this flow only adds
 *  the destination; places are added later from the day's activities. */
const CountryPicker = ({
    mode,
    country,
    defaultCountry,
    onCountryChange,
    onSmartAdvance,
}: CountryPickerProps) => {
    const isEdit = mode === 'edit';
    const [entryMode, setEntryMode] = useState<EntryMode>(ENTRY_MODE.TYPE);
    const [smartText, setSmartText] = useState('');
    // The country query we want resolved, plus why. Empty until a smart
    // submit or a city pick so we don't fire the catalog on every key.
    const [resolveQuery, setResolveQuery] = useState('');
    const [resolvePurpose, setResolvePurpose] = useState<ResolvePurpose>('smart');
    // True when a smart submit caught the transport but no destination (e.g.
    // the user typed just "UA123"). We stay on step 1 and ask "where to?"
    // rather than dropping them into step 2 with an empty country picker.
    const [smartNeedsCountry, setSmartNeedsCountry] = useState(false);

    const { data: matches, isFetching } = useCountries(resolveQuery, {
        enabled: resolveQuery.length > 0,
        limit: 5,
    });

    // Once a resolution query settles, route by purpose: a smart submit
    // advances to step 2 (with the detected kind); a Search pick just sets
    // the destination country. Runs only while a query is active.
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
        if (resolvePurpose === 'smart') {
            if (resolved) {
                onSmartAdvance(
                    smartText.trim(),
                    resolved,
                    detectTransportKind(smartText),
                );
            } else {
                // Transport caught, destination missing — stay and ask.
                setSmartNeedsCountry(true);
            }
        } else if (resolved) {
            // A pick that completes a transport-only smart entry advances
            // with the parsed transport; a plain Search pick just sets the
            // destination and waits for Continue.
            if (smartNeedsCountry) {
                onSmartAdvance(
                    smartText.trim(),
                    resolved,
                    detectTransportKind(smartText),
                );
            } else {
                onCountryChange(resolved);
            }
        }
        setResolveQuery('');
        // Handlers are stable enough; re-running only on a settled query is
        // the intent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches, isFetching, resolveQuery]);

    const handleSmartSubmit = () => {
        const text = smartText.trim();
        if (!text) return;
        const query = guessCountryQuery(text);
        if (!query) {
            onSmartAdvance(text, null, detectTransportKind(text));
            return;
        }
        setResolvePurpose('smart');
        setResolveQuery(query);
    };

    // Unified city/country pick. A country pick is used directly; a city
    // pick resolves to its country by name (a destination is country-level,
    // and PlaceResult carries no country id).
    const handlePlacePicked = (place: PlaceResult) => {
        if (place.kind === 'country') {
            setResolvePurpose('pick');
            setResolveQuery(place.name);
            return;
        }
        setResolvePurpose('pick');
        setResolveQuery(place.countryName);
    };

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">Where to?</h4>
            </header>

            {/* Edit mode is a plain destination picker — no segmented entry. */}
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
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        Describe your destination &amp; transport
                    </label>
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
                            placeholder={PLACEHOLDER}
                            onChange={(e) => {
                                setSmartText(e.target.value);
                                setSmartNeedsCountry(false);
                            }}
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
                    {smartNeedsCountry ? (
                        <div className="country-picker-need">
                            <label className="add-destination-label">
                                And where are you headed?
                            </label>
                            <SearchBar
                                type="simple"
                                mode="place"
                                onPlaceSelected={handlePlacePicked}
                            />
                        </div>
                    ) : (
                        <p className="country-picker-smart-note">
                            We&rsquo;ll read the destination and how you&rsquo;re
                            getting there from this.
                        </p>
                    )}
                </div>
            ) : (
                <div className="add-destination-field">
                    <label className="add-destination-label">Destination</label>
                    <SearchBar
                        defaultValue={defaultCountry ?? undefined}
                        type="simple"
                        mode="place"
                        onPlaceSelected={handlePlacePicked}
                    />
                </div>
            )}
        </section>
    );
};

export default CountryPicker;
