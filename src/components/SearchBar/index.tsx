import { useRef, useState, useEffect, useMemo } from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import './index.css';
import { debounce } from 'lodash';
import countryList from 'sample/countryList.json';
import InputField from 'components/common/FormFields/InputField';
import classNames from 'classnames';
import { useCountryRecommendations } from 'api/hooks/useCountryRecommendations';
import type { Country, CountryRecommendation } from 'types';

type SearchBarVariant = 'standard' | 'simple';
export type SearchMode = 'country' | 'recommend';

interface CountryOption {
    id?: number;
    label?: string;
    code?: string;
    local?: string;
}

interface CountryListEntry {
    en: string;
    code: string;
    local: string;
}

interface SearchBarProps {
    onSelected?: (country: Country) => void;
    defaultValue?: Country;
    className?: string;
    type?: SearchBarVariant;
    /** Externally controlled mode. Defaults to 'country'. */
    mode?: SearchMode;
}

const SearchBar = ({
    onSelected,
    defaultValue,
    className = 'justify-center',
    type = 'standard',
    mode = 'country',
}: SearchBarProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [countriesFound, setCountriesFound] = useState<CountryOption[]>([]);
    const [selectedDestination, setSelectedDestination] = useState('');
    const [isCountrySearching, setIsCountrySearching] = useState(false);

    const [recommendQuery, setRecommendQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');

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
        setCountriesFound([]);
        setIsCountrySearching(false);
        setSubmittedQuery('');
        setRecommendQuery('');
    }, [mode]);

    // Debounce: 500ms of idle after the last keystroke before firing the query.
    // Matches Country mode's autocomplete feel and avoids one API call per keystroke.
    useEffect(() => {
        if (mode !== 'recommend') return;
        const trimmed = recommendQuery.trim();
        if (!trimmed) {
            setSubmittedQuery('');
            return;
        }
        const handle = setTimeout(() => setSubmittedQuery(trimmed), 500);
        return () => clearTimeout(handle);
    }, [recommendQuery, mode]);

    const handleCountryClick = (option: CountryOption) => {
        const label = option.label ?? '';
        setSelectedDestination(label);
        if (inputRef.current) inputRef.current.value = label;
        setCountriesFound([]);
        onSelected?.({
            id: option.id as number,
            name: label,
            code: option.code,
            local: option.local,
        });
    };

    const handleRecommendationClick = (item: CountryRecommendation) => {
        // The recommendation IS a country — we just look up the `local` name
        // from countryList.json so the downstream trip flow has everything.
        const localMatch = (countryList as CountryListEntry[]).find(
            (c) => c.code === item.code
        );

        const country: Country = {
            id: Date.now(),
            name: item.name,
            code: item.code,
            local: localMatch?.local,
        };

        setSelectedDestination(country.name);
        setSubmittedQuery('');
        setRecommendQuery('');
        onSelected?.(country);
    };

    useEffect(() => {
        if (defaultValue) {
            setSelectedDestination(defaultValue.name);
            if (inputRef.current) inputRef.current.value = defaultValue.name;
        }
    }, [defaultValue]);

    const handleListHover = (option: CountryOption) => {
        if (inputRef.current) inputRef.current.value = option.label ?? '';
    };

    const handleCountryInputChange = () => {
        const check = inputRef.current?.value.toLowerCase().trim() ?? '';
        setIsCountrySearching(false);
        if (!check) {
            setCountriesFound([]);
            return;
        }
        const found = (countryList as CountryListEntry[]).filter((item) =>
            item.en.toLowerCase().includes(check)
        );

        setCountriesFound(
            found.map((item, idx) => ({
                id: idx,
                label: item.en,
                code: item.code,
                local: item.local,
            }))
        );
    };

    const debounceCountryChange = useMemo(
        () => debounce(handleCountryInputChange, 500),
        []
    );

    const handleCountryKeystroke = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsCountrySearching(e.target.value.trim().length > 0);
        debounceCountryChange();
    };

    useEffect(() => {
        return () => {
            debounceCountryChange.cancel();
        };
    }, [debounceCountryChange]);

    const handleClickAway = () => {
        setCountriesFound([]);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };

    const renderCountryMode = () => (
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
                        onChange={handleCountryKeystroke}
                        ref={inputRef}
                        className="inputBar"
                        type="text"
                        onFocus={handleFocus}
                        placeholder="Search Country for trip"
                    />
                    {isCountrySearching && (
                        <span className="searchbar-country-spinner" aria-hidden="true" />
                    )}
                </Grid>
            ) : (
                <Grid item lg={12} md={12} xs={12}>
                    <InputField
                        ref={inputRef}
                        defaultValue={selectedDestination}
                        label="Search Destination"
                        onChange={handleCountryKeystroke}
                    />
                </Grid>
            )}

            {!!countriesFound.length && (
                <div
                    className={classNames({
                        listContainerV2: type === 'standard',
                        'listContainerV2-simple': type === 'simple',
                    })}
                >
                    <ul>
                        {countriesFound.map((item, indx) => (
                            <li
                                onClick={() => handleCountryClick(item)}
                                onMouseEnter={() => handleListHover(item)}
                                key={indx}
                                className="item"
                            >
                                {item.label}, {item.code}, {item.local}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Grid>
    );

    const renderRecommendMode = () => {
        const items = recommendations?.items ?? [];
        const showEmpty =
            submittedQuery && !isRecommending && items.length === 0 && !hasRecommendError;
        const showLoading = isRecommending && items.length === 0 && !hasRecommendError;
        const showDropdown =
            recommendQuery.trim().length > 0 &&
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
                        value={recommendQuery}
                        onChange={(e) => setRecommendQuery(e.target.value)}
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
