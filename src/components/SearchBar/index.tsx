import { useRef, useState, useEffect } from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import './index.scss';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import classNames from 'classnames';
import { useCountries } from 'api/hooks/useCountries';
import { useCountryRecommendations } from 'api/hooks/useCountryRecommendations';
import { usePlaces, type PlaceResult } from 'api/hooks/usePlaces';
import { isQueryBlockedError } from 'api/moderationError';
import { BUTTON_VARIANT } from 'constants';
import type { Country, CountryRecommendation } from 'types';

const SEARCH_VARIANT = {
    STANDARD: 'standard',
    SIMPLE: 'simple',
} as const;

const SEARCH_MODE = {
    COUNTRY: 'country',
    /** Unified city + country autocomplete. Picks fire `onPlaceSelected`
     *  with a `PlaceResult` whose `kind` discriminates between 'city'
     *  and 'country'. Used by the homepage hero. */
    PLACE: 'place',
    RECOMMEND: 'recommend',
} as const;

type SearchBarVariant = (typeof SEARCH_VARIANT)[keyof typeof SEARCH_VARIANT];
export type SearchMode = (typeof SEARCH_MODE)[keyof typeof SEARCH_MODE];

interface SearchBarProps {
    onSelected?: (country: Country) => void;
    /** Fired in 'place' mode after the user picks a result. Receives a
     *  PlaceResult with `kind` discriminator so the parent can route
     *  cities to /city and countries to /country. */
    onPlaceSelected?: (place: PlaceResult) => void;
    defaultValue?: Country;
    className?: string;
    type?: SearchBarVariant;
    /** Externally controlled mode. Defaults to 'country'. */
    mode?: SearchMode;
    /** Fired in 'recommend' mode when the user presses Enter on a non-empty
     *  query. Receives the raw input value (trimmed). */
    onAiSearchSubmit?: (query: string) => void;
    /** Rotating placeholder list for the search input (place OR description
     *  mode). When 2+ entries are given, the input cycles through them every
     *  few seconds (the first entry is the resting prompt; the rest are
     *  example searches). Switching the list (e.g. on a tab change) restarts
     *  from the first entry. Pass a referentially-stable array (module const)
     *  so the rotation timer isn't reset on every parent render. Omitted →
     *  the mode's static placeholder. */
    placeholders?: string[];
}

// Country lookup is a cheap DB query (no OpenAI); 500ms felt sluggish on
// the AddDestination modal where users expect the dropdown to pop fast.
// 250ms still groups bursty typing into one request without overloading
// the /countries endpoint.
const DEBOUNCE_MS = 250;

/** Two-letter ISO 3166-1 alpha-2 country code → Unicode flag emoji.
 *  Falls back to a globe icon if the code is missing/malformed. */
const flagEmoji = (code?: string | null): string => {
    const c = (code ?? '').trim().toUpperCase();
    if (c.length !== 2) return '🌐';
    const a = 0x1f1e6 - 65;
    return String.fromCodePoint(c.charCodeAt(0) + a, c.charCodeAt(1) + a);
};

const SearchBar = ({
    onSelected,
    onPlaceSelected,
    defaultValue,
    className = 'justify-center',
    type = SEARCH_VARIANT.STANDARD,
    mode = SEARCH_MODE.COUNTRY,
    onAiSearchSubmit,
    placeholders,
}: SearchBarProps) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedDestination, setSelectedDestination] = useState('');

    // Single text-state across both modes; we just route it to a different
    // submitted-query state based on `mode` so React Query can debounce.
    const [rawQuery, setRawQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');

    // Rotating placeholder. The placeholder is only ever visible on an
    // empty, unfocused field, so that's the only time we cycle it — once
    // the user focuses the input or types anything, the animation stops
    // (and resumes if they blur it while still empty). Switching the list
    // (a tab change) restarts from the first entry. The resolved value is
    // `rotatingPlaceholder` (undefined when no list is passed); each mode's
    // input falls back to its own static placeholder.
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const canRotate = !isFocused && rawQuery.trim().length === 0;
    useEffect(() => {
        setPlaceholderIdx(0);
    }, [placeholders]);
    useEffect(() => {
        if (!placeholders || placeholders.length < 2 || !canRotate) return;
        const id = setInterval(() => {
            setPlaceholderIdx((i) => (i + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(id);
    }, [placeholders, canRotate]);
    const rotatingPlaceholder =
        placeholders && placeholders.length > 0
            ? placeholders[placeholderIdx % placeholders.length]
            : undefined;

    const {
        data: countryResults,
        isFetching: isCountryFetching,
        isError: hasCountryError,
    } = useCountries(submittedQuery, {
        enabled: mode === SEARCH_MODE.COUNTRY && submittedQuery.length > 0,
        limit: 10,
    });

    const {
        data: recommendations,
        isFetching: isRecommending,
        isError: hasRecommendError,
        error: recommendError,
    } = useCountryRecommendations(
        { query: submittedQuery, limit: 6 },
        { enabled: mode === SEARCH_MODE.RECOMMEND && submittedQuery.length > 0 }
    );

    const {
        data: placeResults,
        isFetching: isPlaceFetching,
        isError: hasPlaceError,
    } = usePlaces(submittedQuery, {
        enabled: mode === SEARCH_MODE.PLACE && submittedQuery.length > 0,
        limit: 10,
    });

    useEffect(() => {
        // Clear in-flight state when the user toggles between country/recommend.
        setRawQuery('');
        setSubmittedQuery('');
        if (inputRef.current) inputRef.current.value = '';
    }, [mode]);

    // Debounce: 500ms of idle after the last keystroke before firing the query.
    useEffect(() => {
        const trimmed = rawQuery.trim();
        if (!trimmed) {
            setSubmittedQuery('');
            return;
        }
        const handle = setTimeout(() => setSubmittedQuery(trimmed), DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [rawQuery]);

    useEffect(() => {
        if (defaultValue) {
            setSelectedDestination(defaultValue.name);
            if (inputRef.current) inputRef.current.value = defaultValue.name;
        }
    }, [defaultValue]);

    const closeResults = () => {
        setRawQuery('');
        setSubmittedQuery('');
    };

    // After a pick the search bar clears (input value + raw / submitted
    // query state) so the user can immediately start a new search
    // without having to manually delete the previous selection. The
    // resolved Country still flows through `onSelected` for whatever
    // navigation / dispatch the parent wants.
    const clearSearchInput = () => {
        setSelectedDestination('');
        if (inputRef.current) inputRef.current.value = '';
        closeResults();
    };

    const handleCountryClick = (item: {
        id: string;
        name: string;
        code: string;
        local: string | null;
    }) => {
        clearSearchInput();
        onSelected?.({
            id: item.id,
            name: item.name,
            code: item.code,
            local: item.local ?? undefined,
        });
    };

    const handlePlaceClick = (place: PlaceResult) => {
        clearSearchInput();
        onPlaceSelected?.(place);
    };

    const handleRecommendationClick = (item: CountryRecommendation) => {
        const country: Country = {
            id: item.id,
            name: item.name,
            code: item.code,
            local: item.local ?? undefined,
            image: item.image ?? undefined,
        };
        clearSearchInput();
        onSelected?.(country);
    };

    const handleListHover = (label: string) => {
        if (inputRef.current) inputRef.current.value = label;
    };

    const handleKeystroke = (e: { target: { value: string } }) => {
        setRawQuery(e.target.value);
    };

    const handleClickAway = () => closeResults();

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        e.target.select();
    };

    const handleBlur = () => setIsFocused(false);

    const renderCountryMode = () => {
        const items = countryResults ?? [];
        const trimmed = rawQuery.trim();
        const showLoading = isCountryFetching && items.length === 0 && !hasCountryError;
        const showEmpty =
            submittedQuery && !isCountryFetching && items.length === 0 && !hasCountryError;
        const showDropdown =
            trimmed.length > 0 && (items.length > 0 || showLoading || showEmpty || hasCountryError);

        return (
            <Grid
                container
                className={classNames({
                    container: type === SEARCH_VARIANT.STANDARD,
                    'container-simple': type === SEARCH_VARIANT.SIMPLE,
                })}
            >
                {type === SEARCH_VARIANT.STANDARD ? (
                    <Grid item lg={12} md={12} xs={12} className="inputHolder">
                        <input
                            onChange={(e) => handleKeystroke(e)}
                            ref={inputRef}
                            className="inputBar"
                            type="text"
                            onFocus={handleFocus}
                            placeholder={t('search.bar.countryPlaceholder')}
                        />
                        {isCountryFetching && (
                            <span className="searchbar-country-spinner" aria-hidden="true" />
                        )}
                    </Grid>
                ) : (
                    <Grid item lg={12} md={12} xs={12}>
                        <InputField
                            ref={inputRef}
                            defaultValue={selectedDestination}
                            placeholder={t('search.bar.countryPlaceholderSimple')}
                            onChange={handleKeystroke}
                        />
                    </Grid>
                )}

                {showDropdown && (
                    <div
                        className={classNames({
                            listContainerV2: type === SEARCH_VARIANT.STANDARD,
                            'listContainerV2-simple': type === SEARCH_VARIANT.SIMPLE,
                        })}
                    >
                        {hasCountryError && (
                            <p className="searchbar-recommend-error">
                                {t('search.bar.countryError')}
                            </p>
                        )}
                        {showLoading && (
                            <p className="searchbar-recommend-loading">
                                {t('search.bar.searching')}
                            </p>
                        )}
                        {showEmpty && (
                            <p className="searchbar-recommend-empty">
                                {t('search.bar.noCountries', { query: submittedQuery })}
                            </p>
                        )}
                        {!!items.length && (
                            <ul className="searchbar-country-list">
                                {items.map((item) => (
                                    <li
                                        onClick={() => handleCountryClick(item)}
                                        onMouseEnter={() => handleListHover(item.name)}
                                        key={item.id}
                                        className="item searchbar-country-item"
                                    >
                                        <span
                                            className="searchbar-country-flag"
                                            aria-hidden="true"
                                        >
                                            {flagEmoji(item.code)}
                                        </span>
                                        <span className="searchbar-country-text">
                                            <span className="searchbar-country-name">
                                                {item.name}
                                            </span>
                                            {item.local &&
                                                item.local !== item.name && (
                                                    <span className="searchbar-country-local">
                                                        {item.local}
                                                    </span>
                                                )}
                                        </span>
                                        <span className="searchbar-country-code">
                                            {item.code}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </Grid>
        );
    };

    const renderPlaceMode = () => {
        const items = placeResults ?? [];
        const trimmed = rawQuery.trim();
        const showLoading = isPlaceFetching && items.length === 0 && !hasPlaceError;
        const showEmpty =
            submittedQuery && !isPlaceFetching && items.length === 0 && !hasPlaceError;
        const showDropdown =
            trimmed.length > 0 &&
            (items.length > 0 || showLoading || showEmpty || hasPlaceError);

        return (
            <Grid
                container
                className={classNames({
                    container: type === SEARCH_VARIANT.STANDARD,
                    'container-simple': type === SEARCH_VARIANT.SIMPLE,
                })}
            >
                {type === SEARCH_VARIANT.STANDARD ? (
                    <Grid item lg={12} md={12} xs={12} className="inputHolder">
                        <input
                            onChange={(e) => handleKeystroke(e)}
                            ref={inputRef}
                            className="inputBar"
                            type="text"
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={
                                rotatingPlaceholder ??
                                t('search.bar.placePlaceholder')
                            }
                        />
                        {isPlaceFetching && (
                            <span className="searchbar-country-spinner" aria-hidden="true" />
                        )}
                    </Grid>
                ) : (
                    <Grid item lg={12} md={12} xs={12}>
                        <InputField
                            ref={inputRef}
                            defaultValue={selectedDestination}
                            placeholder={
                                rotatingPlaceholder ??
                                t('search.bar.placePlaceholder')
                            }
                            onChange={handleKeystroke}
                        />
                    </Grid>
                )}

                {showDropdown && (
                    <div
                        className={classNames({
                            listContainerV2: type === SEARCH_VARIANT.STANDARD,
                            'listContainerV2-simple': type === SEARCH_VARIANT.SIMPLE,
                        })}
                    >
                        {hasPlaceError && (
                            <p className="searchbar-recommend-error">
                                {t('search.bar.placeError')}
                            </p>
                        )}
                        {showLoading && (
                            <p className="searchbar-recommend-loading">
                                {t('search.bar.searching')}
                            </p>
                        )}
                        {showEmpty && (
                            <p className="searchbar-recommend-empty">
                                {t('search.bar.noPlaces', { query: submittedQuery })}
                            </p>
                        )}
                        {!!items.length && (
                            <ul className="searchbar-country-list">
                                {items.map((place) => (
                                    <li
                                        onClick={() => handlePlaceClick(place)}
                                        onMouseEnter={() =>
                                            handleListHover(
                                                place.kind === 'country'
                                                    ? place.name
                                                    : `${place.name}, ${place.countryName}`
                                            )
                                        }
                                        key={place.id}
                                        className="item searchbar-country-item"
                                    >
                                        <span
                                            className="searchbar-country-flag"
                                            aria-hidden="true"
                                        >
                                            {flagEmoji(place.countryCode)}
                                        </span>
                                        <span className="searchbar-country-text">
                                            <span className="searchbar-country-name">
                                                {place.kind === 'country'
                                                    ? place.name
                                                    : `${place.name}, ${place.countryName}`}
                                            </span>
                                            <span className="searchbar-place-kind">
                                                {place.kind === 'country'
                                                    ? t('search.bar.kindCountry')
                                                    : t('search.bar.kindCity')}
                                            </span>
                                        </span>
                                        <span className="searchbar-country-code">
                                            {place.countryCode}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </Grid>
        );
    };

    const renderRecommendMode = () => {
        const items = recommendations?.items ?? [];
        const isBlocked = isQueryBlockedError(recommendError);
        const showEmpty =
            submittedQuery && !isRecommending && items.length === 0 && !hasRecommendError;
        const showLoading = isRecommending && items.length === 0 && !hasRecommendError;
        const showDropdown =
            rawQuery.trim().length > 0 &&
            (items.length > 0 || showEmpty || hasRecommendError || showLoading);

        // When onAiSearchSubmit is wired, the parent handles navigation to
        // /search?q=... and we suppress the inline dropdown entirely.
        const useNavigationFlow = Boolean(onAiSearchSubmit);

        const submitAiSearch = () => {
            const value = rawQuery.trim();
            if (!value) return;
            onAiSearchSubmit?.(value);
        };

        const handleAiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            submitAiSearch();
        };

        return (
            <div className="searchbar-recommend">
                <div className="searchbar-recommend-form">
                    <input
                        type="text"
                        className={classNames('searchbar-recommend-input', {
                            'is-standard': type === SEARCH_VARIANT.STANDARD,
                        })}
                        placeholder={
                            rotatingPlaceholder ??
                            t('search.bar.describePlaceholder')
                        }
                        value={rawQuery}
                        onChange={(e) => setRawQuery(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={useNavigationFlow ? handleAiKeyDown : undefined}
                        aria-label={t('search.bar.describeAria')}
                    />
                    {isRecommending && !useNavigationFlow && (
                        <span className="searchbar-recommend-spinner" aria-hidden="true" />
                    )}
                    {/* Explicit submit affordance: the description mode only
                        searches on Enter, which isn't discoverable — without
                        this button users typed a query then clicked the
                        unrelated "Plan my trip for me" CTA expecting it to
                        search. Mirrors the Enter handler exactly. */}
                    {useNavigationFlow && (
                        <button
                            type="button"
                            className="searchbar-recommend-submit"
                            onClick={submitAiSearch}
                            disabled={!rawQuery.trim()}
                            aria-label={t('nav.search')}
                        >
                            <SearchRoundedIcon className="searchbar-recommend-submit-icon" />
                            <span className="searchbar-recommend-submit-label">
                                {t('nav.search')}
                            </span>
                        </button>
                    )}
                </div>

                {!useNavigationFlow && showDropdown && (
                    <div
                        className={classNames('searchbar-recommend-results', {
                            'is-standard': type === SEARCH_VARIANT.STANDARD,
                        })}
                    >
                        {isBlocked && (
                            <p className="searchbar-recommend-blocked">
                                <Trans
                                    i18nKey="search.blocked"
                                    components={{
                                        link: (
                                            <Link
                                                to="/terms"
                                                className="searchbar-recommend-blocked-link"
                                            />
                                        ),
                                    }}
                                />
                            </p>
                        )}
                        {hasRecommendError && !isBlocked && (
                            <p className="searchbar-recommend-error">
                                {t('search.bar.recommendError', {
                                    detail:
                                        recommendError instanceof Error
                                            ? `: ${recommendError.message}`
                                            : '',
                                })}
                            </p>
                        )}

                        {showLoading && (
                            <p className="searchbar-recommend-loading">
                                {t('search.bar.searching')}
                            </p>
                        )}

                        {showEmpty && (
                            <p className="searchbar-recommend-empty">
                                {t('search.bar.noMatches', { query: submittedQuery })}
                            </p>
                        )}

                        {items.map((item) => (
                            <ButtonCustom
                                key={item.id}
                                nativeType="button"
                                type={BUTTON_VARIANT.NONE}
                                capitalizeType="none"
                                className="searchbar-recommend-item"
                                onClick={() => handleRecommendationClick(item)}
                            >
                                <span className="searchbar-recommend-item-main">
                                    <span className="searchbar-recommend-item-name">
                                        {item.name}
                                    </span>
                                    <span className="searchbar-recommend-item-country">
                                        {item.code}
                                    </span>
                                </span>
                                <span className="searchbar-recommend-item-score">
                                    {Math.round(item.score * 100)}%
                                </span>
                            </ButtonCustom>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Grid container className={`searchbarMain flex w-full ${className}`}>
                <Grid
                    item
                    lg={type === SEARCH_VARIANT.STANDARD ? 10 : 12}
                    md={12}
                    xs={12}
                    className={classNames({
                        holder:
                            type === SEARCH_VARIANT.STANDARD &&
                            (mode === SEARCH_MODE.COUNTRY ||
                                mode === SEARCH_MODE.PLACE),
                        'holder-simple':
                            type === SEARCH_VARIANT.SIMPLE &&
                            (mode === SEARCH_MODE.COUNTRY ||
                                mode === SEARCH_MODE.PLACE),
                        'holder-recommend': mode === SEARCH_MODE.RECOMMEND,
                    })}
                >
                    {mode === SEARCH_MODE.COUNTRY && renderCountryMode()}
                    {mode === SEARCH_MODE.PLACE && renderPlaceMode()}
                    {mode === SEARCH_MODE.RECOMMEND && renderRecommendMode()}
                </Grid>
            </Grid>
        </ClickAwayListener>
    );
};

export default SearchBar;
