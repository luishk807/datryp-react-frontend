import React, { useRef} from 'react';
import { Grid } from '@mui/material';
import './index.css';
import PropTypes from 'prop-types';
import { debounce} from 'lodash';
// import { top100Films } from '../../sample/movielist';

const SearchBar = ({
    onSelected
}) => {
    const inputRef = useRef();

    const handleButtonClick = () => {
        onSelected && onSelected(inputRef.current.value);
    };

    const handleOnChange = () => {
        onSelected && onSelected(inputRef.current.value);
    };

    const debounceChange = debounce(handleOnChange, 500);

    const debounceClick = debounce(handleButtonClick, 500);

    return (
        <Grid container className="searchbarMain">
            <Grid item lg={7} md={12} xs={12} className="holder">
                <Grid container className="container">
                    <Grid item lg={10}>
                        <input onChange={debounceChange} ref={inputRef} className="inputBar" type='text' placeholder="Search Country for trip" />
                    </Grid>
                    <Grid item lg={2} className="buttonContainer">
                        <button className="button" onClick={debounceClick}>CREATE</button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

SearchBar.propTypes = {
    onSelected: PropTypes.func
};

export default SearchBar;