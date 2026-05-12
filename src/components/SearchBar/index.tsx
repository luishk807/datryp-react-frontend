import { useRef, useState, useEffect } from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import './index.css';
import InputField from 'components/common/FormFields/InputField';
import classNames from 'classnames';
import { useCountries } from 'api/hooks/useCountries';
import { useCountryRecommendations } from 'api/hooks/useCountryRecommendations';
import type { Country, CountryRecommendation } from 'types';

type SearchBarVariant = 'standard' | 'simple';
export type SearchMode = 'country' | 'recommend';

interface SearchBarProps {
    onSelected?: (country: Country) => void;
    defaultValue?: Country;
    className?: string;
    type?: SearchBarVariant;
    /** Externally controlled mode. Defaults to 'country'. */
    mode?: SearchMode;
}

const DEBOUNCE_MS = 500;

const SearchBar = ({
    onSelected,
    defaultValue,
    className = 'justify-center',
    type = 'standard',
    mode = 'country',
}: SearchBarProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedDestination, setSelectedDestination] = useState('');

    // Single text-state across both modes; we just route it to a different
    // submitted-query state based on `mode` so React Query can debounce.
    const [rawQuery, setRawQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');

    const {
        data: countryResults,
        isFetching: isCountryFetching,
        isError: hasCountryError,
    } = useCountries(submittedQuery, {
        enabled: mode === 'country' && submittedQuery.length > 0,
        limit: 10,
    });

    const {
        data: recommendations,
        isFetching: isRecommending,
        isError: hasRecommendError,
        error: recommendError,
    } = useCountryRecommendations(
        { query: submittedQuery, limit: 6 },
        { enabled: mode === 'recommend' && submittedQuery.length > 0 }
    );

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

    const handleCountryClick = (item: {
        id: string;
        name: string;
        code: string;
        local: string | null;
    }) => {
        setSelectedDestination(item.name);
        if (inputRef.current) inputRef.current.value = item.name;
        closeResults();
        onSelected?.({
            id: item.id,
            name: item.name,
            code: item.code,
            local: item.local ?? undefined,
        });
    };

    const handleRecommendationClick = (item: CountryRecommendation) => {
        const country: Country = {
            id: item.id,
            name: item.name,
            code: item.code,
            local: item.local ?? undefined,
            image: item.image ?? undefined,
        };
        setSelectedDestination(country.name);
        closeResults();
        if (inputRef.current) inputRef.current.value = country.name;
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
        e.target.select();
    };

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
                    container: type === 'standard',
                    'container-simple': type === 'simple',
                })}
            >
                {type === 'standard' ? (
                    <Grid item lg={12} md={12} xs={12} className="inputHolder">
                        <input
                            onChange={(e) => handleKeystroke(e)}
                            ref={inputRef}
                            className="inputBar"
                            type="text"
                            onFocus={handleFocus}
                            placeholder="Search Country for trip"
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
                            label="Search Destination"
                            onChange={handleKeystroke}
                        />
                    </Grid>
                )}

                {showDropdown && (
                    <div
                        className={classNames({
                            listContainerV2: type === 'standard',
                            'listContainerV2-simple': type === 'simple',
                        })}
                    >
                        {hasCountryError && (
                            <p className="searchbar-recommend-error">
                                Could not reach the country service. Is the backend running?
                            </p>
                        )}
                        {showLoading && (
                            <p className="searchbar-recommend-loading">Searching…</p>
                        )}
                        {showEmpty && (
                            <p className="searchbar-recommend-empty">
                                No countries match &ldquo;{submittedQuery}&rdquo;.
                            </p>
                        )}
                        {!!items.length && (
                            <ul>
                                {items.map((item) => (
                                    <li
                                        onClick={() => handleCountryClick(item)}
                                        onMouseEnter={() => handleListHover(item.name)}
                                        key={item.id}
                                        className="item"
                                    >
                                        {item.name}, {item.code}
                                        {item.local ? `, ${item.local}` : ''}
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
        const showEmpty =
            submittedQuery && !isRecommending && items.length === 0 && !hasRecommendError;
        const showLoading = isRecommending && items.length === 0 && !hasRecommendError;
        const showDropdown =
            rawQuery.trim().length > 0 &&
            (items.length > 0 || showEmpty || hasRecommendError || showLoading);

        return (
            <div className="searchbar-recommend">
                <div className="searchbar-recommend-form">
                    <input
                        type="text"
                        className={classNames('searchbar-recommend-input', {
                            'is-standard': type === 'standard',
                        })}
                        placeholder="Try 'beach yoga retreat' or 'ancient ruins'"
                        value={rawQuery}
                        onChange={(e) => setRawQuery(e.target.value)}
                        aria-label="Describe what you're looking for"
                    />
                    {isRecommending && (
                        <span className="searchbar-recommend-spinner" aria-hidden="true" />
                    )}
                </div>

                {showDropdown && (
                    <div
                        className={classNames('searchbar-recommend-results', {
                            'is-standard': type === 'standard',
                        })}
                    >
                        {hasRecommendError && (
                            <p className="searchbar-recommend-error">
                                Could not reach the recommender service
                                {recommendError instanceof Error
                                    ? `: ${recommendError.message}`
                                    : ''}
                                . Is the backend running?
                            </p>
                        )}

                        {showLoading && (
                            <p className="searchbar-recommend-loading">Searching…</p>
                        )}

                        {showEmpty && (
                            <p className="searchbar-recommend-empty">
                                No matches for &ldquo;{submittedQuery}&rdquo;. Try a
                                different vibe.
                            </p>
                        )}

                        {items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
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
                            </button>
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
                    lg={type === 'standard' ? 10 : 12}
                    md={12}
                    xs={12}
                    className={classNames({
                        holder: type === 'standard' && mode === 'country',
                        'holder-simple': type === 'simple' && mode === 'country',
                        'holder-recommend': mode === 'recommend',
                    })}
                >
                    {mode === 'country' ? renderCountryMode() : renderRecommendMode()}
                </Grid>
            </Grid>
        </ClickAwayListener>
    );
};

export default SearchBar;
