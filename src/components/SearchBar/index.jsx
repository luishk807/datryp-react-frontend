import React, { useRef} from 'react';
import { Grid } from '@mui/material';
import './index.css';
import PropTypes from 'prop-types';
// import { top100Films } from '../../sample/movielist';

const SearchBar = ({
    onSelected
}) => {
    const inputRef = useRef();
    
    const handleSelected = (e) => {
        onSelected && onSelected(e);
    };

    return (
        <Grid container className="searchbarMain">
            <Grid item lg={12} className="holder">
                <Grid container className="container">
                    <Grid item lg={10}>
                        <input ref={inputRef} className="inputBar" type='text' placeholder="Search Country for trip" />
                    </Grid>
                    <Grid item lg={2} className="buttonContainer">
                        <button className="button" onClick={handleSelected}>CREATE</button>
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