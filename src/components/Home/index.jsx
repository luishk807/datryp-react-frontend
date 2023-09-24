import React, { useState} from 'react';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
// import Autocomplete from '@mui/material/Autocomplete';
import SearchBar from '../SearchBar';
import Layout from '../Layout';

const Home = () => {
    const [singleSelected, setSingleSelected] = useState(true);

    const handleClick = (e) => {
        console.log(e);
        setSingleSelected(e);
    };

    const handleSelectedSearch = (searchData) => {
        console.log(searchData, 'searchData');
        if (singleSelected) {
            window.location.href='/single';
        } else {
            window.location.href='/multiple';
        }
        
    };
    return (
        <Layout>
            <Grid container spacing={0} className="searchContainer">
                <Grid item lg={12} md={12} xs={12} className="mainText pb-4">Where are you planning to go</Grid>
                <Grid item lg={12} md={12} xs={12} >
                    <Grid container>
                        <Grid item lg={12} md={12} xs={12}>
                            <Grid container className="optionSelection">
                                <Grid item>
                                    <button className={classnames(
                                        'selection', {
                                            'selected': singleSelected
                                        })} onClick={() => handleClick(true)}>Single Place</button>
                                </Grid>
                                <Grid item>
                                    <button className={classnames(
                                        'selection', {
                                            'selected': !singleSelected
                                        })} onClick={() => handleClick(false)}>Multiple locations</button>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item lg={12} md={12} className="searchBarContainer">
                            <SearchBar onSelected={handleSelectedSearch} />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Layout>
    );
};

export default Home;