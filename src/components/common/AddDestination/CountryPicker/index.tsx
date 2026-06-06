import { useEffect, useState } from 'react';
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
     *  (may be null — for a flight, step 2 derives it from the arrival
     *  airport), and the transport kind detected from the text. */
    onSmartAdvance: (
        text: string,
        country: Country | null,
        kind: TransportKind,
    ) => void;
}

const PLACEHOLDER = 'EWR to Panama City June 6 on Copa for $450';

// Why we resolve a country query: a smart-box submit advances to step 2;
// a city/country pick from the Search dropdown just sets the destination.
type ResolvePurpose = 'smart' | 'pick';

// Ground-transport keyword cues. A destination smart-entry defaults to
// FLIGHT (you fly to a country far more often than not) and only flips to
// train / bus / rental when the text says so explicitly.
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
    const cut = tail.split(
        /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
    )[0];
    return (cut || tail).trim();
};

/** Step 1 — Destination. A smart box ("Describe your destination &
 *  transport") with the city/country search offered below as an "OR"
 *  alternative — both visible, no mode toggle. Smart submit parses the
 *  sentence + advances to step 2; a search pick sets the destination (and
 *  in add mode the orchestrator advances). No "first place" — this flow
 *  only adds the destination; places are added later from the day. */
const CountryPicker = ({
    mode,
    country,
    defaultCountry,
    onCountryChange,
    onSmartAdvance,
}: CountryPickerProps) => {
    const isEdit = mode === 'edit';
    const [smartText, setSmartText] = useState('');
    // The country query we want resolved, plus why. Empty until a smart
    // submit or a search pick so we don't fire the catalog on every key.
    const [resolveQuery, setResolveQuery] = useState('');
    const [resolvePurpose, setResolvePurpose] = useState<ResolvePurpose>('smart');

    const { data: matches, isFetching } = useCountries(resolveQuery, {
        enabled: resolveQuery.length > 0,
        limit: 5,
    });

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
            // Advance even when the text named no destination — for a flight,
            // step 2 derives the country from the arrival airport.
            onSmartAdvance(
                smartText.trim(),
                resolved,
                detectTransportKind(smartText),
            );
        } else if (resolved) {
            onCountryChange(resolved);
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
        setResolvePurpose('pick');
        setResolveQuery(
            place.kind === 'country' ? place.name : place.countryName,
        );
    };

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">Where to?</h4>
            </header>

            {/* Smart box first (add mode only) — describe the whole leg. */}
            {!isEdit && (
                <>
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
                        <p className="country-picker-smart-note">
                            We&rsquo;ll read the destination and how you&rsquo;re
                            getting there from this.
                        </p>
                    </div>

                    <div className="country-picker-or" role="separator">
                        <span>OR</span>
                    </div>
                </>
            )}

            {/* City / country search — the manual alternative, always shown. */}
            <div className="add-destination-field">
                <label className="add-destination-label">
                    {isEdit ? 'Country' : 'Search a city or country'}
                </label>
                <SearchBar
                    defaultValue={defaultCountry ?? undefined}
                    type="simple"
                    mode="place"
                    onPlaceSelected={handlePlacePicked}
                />
            </div>
        </section>
    );
};

export default CountryPicker;
