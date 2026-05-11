import { useRef, useState, useEffect, useMemo } from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import './index.css';
import { debounce } from 'lodash';
import countryList from 'sample/countryList.json';
import InputField from 'components/common/FormFields/InputField';
import classNames from 'classnames';
import { useDestinationRecommendations } from 'api/hooks/useDestinationRecommendations';
import type { Country, DestinationRecommendation } from 'types';

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

    const [recommendQuery, setRecommendQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');

    const {
        data: recommendations,
        isFetching: isRecommending,
        isError: hasRecommendError,
        error: recommendError,
    } = useDestinationRecommendations(
        { query: submittedQuery, limit: 6 },
        { enabled: mode === 'recommend' && submittedQuery.length > 0 }
    );

    useEffect(() => {
        setCountriesFound([]);
        setSubmittedQuery('');
        setRecommendQuery('');
    }, [mode]);

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

    const handleRecommendationClick = (item: DestinationRecommendation) => {
        const matched = item.country
            ? (countryList as CountryListEntry[]).find(
                  (c) => c.en.toLowerCase() === item.country!.toLowerCase()
              )
            : undefined;

        const country: Country = matched
            ? {
                  id: Date.now(),
                  name: matched.en,
                  code: matched.code,
                  local: matched.local,
              }
            : {
                  id: Date.now(),
                  name: item.country ?? item.name,
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

    const handleRecommendSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = recommendQuery.trim();
        if (!trimmed) return;
        setSubmittedQuery(trimmed);
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
                        onChange={debounceCountryChange}
                        ref={inputRef}
                        className="inputBar"
                        type="text"
                        onFocus={handleFocus}
                        placeholder="Search Country for trip"
                    />
                </Grid>
            ) : (
                <Grid item lg={12} md={12} xs={12}>
                    <InputField
                        ref={inputRef}
                        defaultValue={selectedDestination}
                        label="Search Destination"
                        onChange={debounceCountryChange}
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

        return (
            <div className="searchbar-recommend">
                <form
                    className="searchbar-recommend-form"
                    onSubmit={handleRecommendSubmit}
                >
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
                    <button
                        type="submit"
                        className="searchbar-recommend-submit"
                        disabled={!recommendQuery.trim() || isRecommending}
                    >
                        {isRecommending ? 'Searching…' : 'Find places'}
                    </button>
                </form>

                {submittedQuery && (items.length > 0 || showEmpty || hasRecommendError) && (
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
                                    {item.country && (
                                        <span className="searchbar-recommend-item-country">
                                            {item.country}
                                        </span>
                                    )}
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
