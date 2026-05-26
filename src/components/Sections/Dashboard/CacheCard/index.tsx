import { useState } from 'react';
import { Snackbar } from '@mui/material';
import './index.scss';
import {
    useClearCityCache,
    useClearCountryCache,
    useCityCacheStatus,
    useCountryCacheStatus,
} from 'api/hooks/useAdmin';
import { useCountries } from 'api/hooks/useCountries';
import { formatDate } from 'utils/date';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { BUTTON_VARIANT } from 'constants';
import type { CountryResult } from 'api/hooks/useCountries';

/**
 * Admin cache management section.
 *
 * Lets an admin look up and wipe the AI-generated detail caches for a
 * single country (`country_details` row + optional hero image) or a
 * single city (`city_details` row keyed by `<lowercased name>--<code>`).
 *
 * Scope deliberately narrow: only per-entity caches. Global caches like
 * `place_results` / `top_cities_monthly_cache` / `world_event_cache` are
 * not addressable by country or city, so they're out of scope here.
 */
const CacheCard = () => {
    const [toast, setToast] = useState<string | null>(null);

    return (
        <>
            <CountryCacheSection onToast={setToast} />
            <CityCacheSection onToast={setToast} />
            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={3500}
                onClose={() => setToast(null)}
                message={toast ?? ''}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
};

const formatTime = (iso: string | null): string =>
    iso ? formatDate(iso, 'MMM D, YYYY h:mma') : '—';

// ---------- Country cache ----------

interface SectionProps {
    onToast: (msg: string) => void;
}

const CountryCacheSection = ({ onToast }: SectionProps) => {
    const [query, setQuery] = useState('');
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [includeImage, setIncludeImage] = useState(false);

    const { data: results, isFetching } = useCountries(query, {
        enabled: query.trim().length > 0,
        limit: 8,
    });
    const { data: status, isFetching: statusFetching } =
        useCountryCacheStatus(selectedCode);
    const clear = useClearCountryCache();

    const handlePick = (c: CountryResult) => {
        setSelectedCode(c.code);
        setQuery(c.name);
    };

    const handleClear = () => {
        if (!selectedCode) return;
        clear.mutate(
            { code: selectedCode, includeImage },
            {
                onSuccess: (res) =>
                    onToast(
                        res.cleared
                            ? `Cleared ${res.rowsDeleted} cache row(s)${includeImage ? ' + hero image' : ''} for ${selectedCode}`
                            : `Nothing to clear for ${selectedCode}`
                    ),
                onError: (err) =>
                    onToast(
                        err instanceof Error
                            ? err.message
                            : 'Failed to clear country cache'
                    ),
            }
        );
    };

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">Country cache</h2>
                <p className="dashboard-card-subtitle">
                    Wipe the cached AI details for one country. The
                    /country page rebuilds the entry on the next visit
                    (burns one OpenAI call).
                </p>
            </header>

            <div className="cache-card-search">
                <InputField
                    label="Search country"
                    placeholder="Type a country name…"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedCode(null);
                    }}
                />
                {query.trim().length > 0 && !selectedCode && (
                    <div className="cache-card-results">
                        {isFetching && (
                            <p className="cache-card-status">Searching…</p>
                        )}
                        {!isFetching && (results ?? []).length === 0 && (
                            <p className="cache-card-status">No matches.</p>
                        )}
                        {(results ?? []).map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className="cache-card-result"
                                onClick={() => handlePick(c)}
                            >
                                <span className="cache-card-result-name">
                                    {c.name}
                                </span>
                                <span className="cache-card-result-code">
                                    {c.code}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedCode && (
                <div className="cache-card-detail">
                    {statusFetching && !status && (
                        <p className="cache-card-status">Loading status…</p>
                    )}
                    {status && (
                        <>
                            <div className="cache-card-detail-head">
                                <div>
                                    <span className="cache-card-detail-name">
                                        {status.name}
                                    </span>
                                    <span className="cache-card-detail-sub">
                                        {status.code}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="cache-card-link"
                                    onClick={() => {
                                        setSelectedCode(null);
                                        setQuery('');
                                    }}
                                >
                                    Pick another
                                </button>
                            </div>

                            <ul className="cache-card-status-list">
                                <li>
                                    <span>Details cache</span>
                                    <span
                                        className={
                                            status.detailsCached
                                                ? 'cache-card-yes'
                                                : 'cache-card-no'
                                        }
                                    >
                                        {status.detailsCached
                                            ? `cached · ${status.detailsHits} hit(s) · updated ${formatTime(status.detailsUpdatedAt)}`
                                            : 'not cached'}
                                    </span>
                                </li>
                                <li>
                                    <span>Hero image</span>
                                    <span
                                        className={
                                            status.hasHeroImage
                                                ? 'cache-card-yes'
                                                : 'cache-card-no'
                                        }
                                    >
                                        {status.hasHeroImage
                                            ? 'present'
                                            : 'none'}
                                    </span>
                                </li>
                            </ul>

                            <label className="cache-card-checkbox">
                                <input
                                    type="checkbox"
                                    checked={includeImage}
                                    onChange={(e) =>
                                        setIncludeImage(e.target.checked)
                                    }
                                    disabled={!status.hasHeroImage}
                                />
                                Also clear hero image (Unsplash re-pull on
                                next visit)
                            </label>

                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD}
                                onClick={handleClear}
                                disabled={
                                    clear.isPending ||
                                    (!status.detailsCached && !includeImage)
                                }
                            >
                                {clear.isPending
                                    ? 'Clearing…'
                                    : 'Clear country cache'}
                            </ButtonCustom>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

// ---------- City cache ----------

const CityCacheSection = ({ onToast }: SectionProps) => {
    const [cityName, setCityName] = useState('');
    const [countryQuery, setCountryQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<{
        code: string;
        name: string;
    } | null>(null);
    const [submitted, setSubmitted] = useState<{
        name: string;
        code: string;
    } | null>(null);

    const { data: countryResults, isFetching: countriesFetching } = useCountries(
        countryQuery,
        {
            enabled: countryQuery.trim().length > 0 && !selectedCountry,
            limit: 8,
        }
    );
    const { data: status, isFetching: statusFetching } = useCityCacheStatus(
        submitted?.name ?? null,
        submitted?.code ?? null
    );
    const clear = useClearCityCache();

    const handleLookup = () => {
        if (!cityName.trim() || !selectedCountry) return;
        setSubmitted({ name: cityName.trim(), code: selectedCountry.code });
    };

    const handleClear = () => {
        if (!submitted) return;
        clear.mutate(
            { name: submitted.name, code: submitted.code },
            {
                onSuccess: (res) =>
                    onToast(
                        res.cleared
                            ? `Cleared city cache for ${submitted.name}, ${submitted.code}`
                            : `Nothing to clear for ${submitted.name}, ${submitted.code}`
                    ),
                onError: (err) =>
                    onToast(
                        err instanceof Error
                            ? err.message
                            : 'Failed to clear city cache'
                    ),
            }
        );
    };

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">City cache</h2>
                <p className="dashboard-card-subtitle">
                    Wipe the cached AI details for one city. Slug is
                    <code> {'<city>--<country code>'}</code> (e.g.
                    <code> honolulu--us</code>). Rebuilds on the next /city
                    visit.
                </p>
            </header>

            <div className="cache-card-city-grid">
                <InputField
                    label="City name"
                    placeholder="e.g. Honolulu"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                />
                <div>
                    <InputField
                        label="Country"
                        placeholder="Type a country…"
                        value={
                            selectedCountry ? selectedCountry.name : countryQuery
                        }
                        onChange={(e) => {
                            setCountryQuery(e.target.value);
                            setSelectedCountry(null);
                        }}
                    />
                    {countryQuery.trim().length > 0 && !selectedCountry && (
                        <div className="cache-card-results">
                            {countriesFetching && (
                                <p className="cache-card-status">Searching…</p>
                            )}
                            {!countriesFetching &&
                                (countryResults ?? []).length === 0 && (
                                    <p className="cache-card-status">
                                        No matches.
                                    </p>
                                )}
                            {(countryResults ?? []).map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className="cache-card-result"
                                    onClick={() => {
                                        setSelectedCountry({
                                            code: c.code,
                                            name: c.name,
                                        });
                                        setCountryQuery(c.name);
                                    }}
                                >
                                    <span className="cache-card-result-name">
                                        {c.name}
                                    </span>
                                    <span className="cache-card-result-code">
                                        {c.code}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="cache-card-actions">
                <ButtonCustom
                    type={BUTTON_VARIANT.LINE}
                    onClick={handleLookup}
                    disabled={!cityName.trim() || !selectedCountry}
                >
                    Look up
                </ButtonCustom>
            </div>

            {submitted && (
                <div className="cache-card-detail">
                    {statusFetching && !status && (
                        <p className="cache-card-status">Loading status…</p>
                    )}
                    {status && (
                        <>
                            <div className="cache-card-detail-head">
                                <div>
                                    <span className="cache-card-detail-name">
                                        {status.cityName},{' '}
                                        {status.countryName || status.countryCode}
                                    </span>
                                    <span className="cache-card-detail-sub">
                                        slug: <code>{status.slug}</code>
                                    </span>
                                </div>
                            </div>

                            <ul className="cache-card-status-list">
                                <li>
                                    <span>Details cache</span>
                                    <span
                                        className={
                                            status.detailsCached
                                                ? 'cache-card-yes'
                                                : 'cache-card-no'
                                        }
                                    >
                                        {status.detailsCached
                                            ? `cached · ${status.detailsHits} hit(s) · updated ${formatTime(status.detailsUpdatedAt)}`
                                            : 'not cached'}
                                    </span>
                                </li>
                            </ul>

                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD}
                                onClick={handleClear}
                                disabled={clear.isPending || !status.detailsCached}
                            >
                                {clear.isPending
                                    ? 'Clearing…'
                                    : 'Clear city cache'}
                            </ButtonCustom>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

export default CacheCard;
