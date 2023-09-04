import React from 'react';
import { Grid } from '@mui/material';
import './index.css';
import { top100Films } from '../../sample/movielist';

const SearchBar = () => {
    return (
        <Grid container className="searchbarMain">
            <Grid item lg={12} className="holder">
                <Grid container className="container">
                    <Grid item lg={10}>
                        <input className="inputBar" type='text' placeholder="Search Country for trip" />
                    </Grid>
                    <Grid item lg={2} className="buttonContainer">
                        <button className="button">CREATE</button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default SearchBar;