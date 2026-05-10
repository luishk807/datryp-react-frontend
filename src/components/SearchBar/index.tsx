import { useRef, useState, useEffect, useMemo } from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import './index.css';
import { debounce } from 'lodash';
import countryList from 'sample/countryList.json';
import InputField from 'components/common/FormFields/InputField';
import classNames from 'classnames';
import type { Country } from 'types/trip.types';

type SearchBarVariant = 'standard' | 'simple';

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
    onCreate?: () => void;
    defaultValue?: Country;
    className?: string;
    type?: SearchBarVariant;
}

const SearchBar = ({
    onSelected,
    onCreate,
    defaultValue,
    className = 'justify-center',
    type = 'standard',
}: SearchBarProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [countriesFound, setCountriesFound] = useState<CountryOption[]>([]);
    const [selectedDestination, setSelectedDestination] = useState('');

    const handleButtonClick = (option: CountryOption) => {
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

    useEffect(() => {
        if (defaultValue) {
            setSelectedDestination(defaultValue.name);
            if (inputRef.current) inputRef.current.value = defaultValue.name;
        }
    }, [defaultValue]);

    const handleListHover = (option: CountryOption) => {
        if (inputRef.current) inputRef.current.value = option.label ?? '';
    };

    const handleOnChange = () => {
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

    const debounceChange = useMemo(() => debounce(handleOnChange, 500), []);
    const debounceClick = useMemo(() => debounce(handleButtonClick, 500), [onSelected]);

    useEffect(() => {
        return () => {
            debounceChange.cancel();
            debounceClick.cancel();
        };
    }, [debounceChange, debounceClick]);

    const handleCreateClick = () => {
        if (onCreate) {
            onCreate();
            return;
        }
        debounceClick({});
    };

    const handleClickAway = () => {
        setCountriesFound([]);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
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
                        holder: type === 'standard',
                        'holder-simple': type === 'simple',
                    })}
                >
                    <Grid
                        container
                        className={classNames({
                            container: type === 'standard',
                            'container-simple': type === 'simple',
                        })}
                    >
                        {type === 'standard' ? (
                            <>
                                <Grid item lg={10} md={10} className="inputHolder">
                                    <input
                                        onChange={debounceChange}
                                        ref={inputRef}
                                        className="inputBar"
                                        type="text"
                                        onFocus={handleFocus}
                                        placeholder="Search Country for trip"
                                    />
                                </Grid>
                                <Grid item lg={2} className="buttonContainer">
                                    <button className="button" onClick={handleCreateClick}>
                                        CREATE
                                    </button>
                                </Grid>
                            </>
                        ) : (
                            <Grid item lg={12} md={12} xs={12}>
                                <InputField
                                    ref={inputRef}
                                    defaultValue={selectedDestination}
                                    label="Search Destination"
                                    onChange={debounceChange}
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
                                            onClick={() => handleButtonClick(item)}
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
                </Grid>
            </Grid>
        </ClickAwayListener>
    );
};

export default SearchBar;
