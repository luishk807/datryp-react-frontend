import React, { useRef, useState, useEffect } from 'react';
import { Grid } from '@mui/material';
import './index.css';
import PropTypes from 'prop-types';
import { debounce} from 'lodash';
// import { top100Films } from 'sample/movielist';
import countryList from 'sample/countryList';
import { ClickAwayListener } from '@mui/base/ClickAwayListener';
import InputField from 'components/common/FormFields/InputField';
import classNames from 'classnames';

const SearchBar = ({
    onSelected,
    defaultValue = undefined,
    className = "justify-center",
    type="standard"
}) => {
    const inputRef = useRef();
    const [countriesFound, setCountriesFound] = useState([]);
    const [selectedDestination, setSelectedDestination] = useState('');

    const handleButtonClick = (e) => {
        setSelectedDestination(e.label);
        inputRef.current.value = e.label;
        setCountriesFound([]);
        onSelected && onSelected({
            id: e.id,
            name: e.label,
            code: e.code,
            local: e.local
        });
    };

    useEffect(() => {
        let unmounted = true;
        if(unmounted) {
            if(defaultValue) {
                setSelectedDestination(defaultValue.name);
                inputRef.current.value = defaultValue.name;
            }
        }
        return () => unmounted = false;
    }, [defaultValue]);

    const handleListHover = (e) => {
        inputRef.current.value = e.label;
    };

    const handleOnChange = (e) => {
        const check = inputRef.current.value.toLowerCase();
        const foundCountry = countryList.filter(item => {
            const data1 = item.en.toLowerCase();
            return data1.includes(check);
        });

        setCountriesFound([]);
        if (foundCountry.length) {
            setCountriesFound(foundCountry.map((item, idx) => ({ 
                id: idx, 
                label: item.en,
                code: item.code,
                local: item.local
            })));
        }
        // onSelected && onSelected(inputRef.current.value);
    };

    const debounceChange = debounce(handleOnChange, 500);

    const debounceClick = debounce(handleButtonClick, 500);

    const handleClickAway = () => {
        setCountriesFound([]);
    };

    const handleFocus = (e) => {
        e.target.select();
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <Grid container className={`searchbarMain flex w-full ${className}`}>
                <Grid item lg={ type === 'standard' ? 10 : 12} md={12} xs={12} className={
                    classNames({
                        'holder': type === 'standard',
                        'holder-simple': type === 'simple'
                    })
                }>
                    <Grid container className={classNames({
                        'container': type === 'standard',
                        'container-simple': type === 'simple'
                    })}>
                        {
                            type == "standard" ? (
                                <>
                                    <Grid item lg={10} md={10} className="inputHolder">
                                        <input 
                                            onChange={debounceChange} 
                                            ref={inputRef} 
                                            className="inputBar" 
                                            type='text' 
                                            value={defaultValue}
                                            onFocus={handleFocus}
                                            placeholder="Search Country for trip" 
                                        />
                                    </Grid>
                                    <Grid item lg={2} className="buttonContainer">
                                        <button className="button" onClick={debounceClick}>CREATE</button>
                                    </Grid>
                                </>
                            ) :(
                                <Grid item lg={12} md={12} xs={12}>
                                    <InputField 
                                        ref={inputRef} 
                                        defaultValue={selectedDestination}
                                        label="Search Destination" 
                                        onChange={debounceChange}
                                    />
                                </Grid>
                            )
                        }

                        {
                            !!countriesFound.length && (
                                <div className={classNames(
                                    {
                                        "listContainerV2": type === "standard",
                                        "listContainerV2-simple": type === "simple"
                                    }
                                )}>
                                    <ul>
                                        {
                                            countriesFound.map((item, indx) => {
                                                return (
                                                    <li 
                                                        onClick={(e) => handleButtonClick(item)} 
                                                        onMouseEnter={(e) => handleListHover(item)} 
                                                        key={indx} className="item">{item.label}, {item.code}, {item.local}
                                                    </li>
                                                );
                                            })
                                        }
                                    </ul>
                                </div>
                            )
                        }

                    </Grid>
                </Grid>
            </Grid>
        </ClickAwayListener>
    );
};

SearchBar.propTypes = {
    onSelected: PropTypes.func,
    className: PropTypes.string,
    defaultValue: PropTypes.object,
    type: PropTypes.oneOf(['standard', 'simple'])
};

export default SearchBar;