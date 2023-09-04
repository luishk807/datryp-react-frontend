import React from 'react';
import { Grid } from '@mui/material';
import '../App.css';
import Autocomplete from '@mui/material/Autocomplete';
import SearchBar from './SearchBar';
import Layout from './Layout';

const Home = () => {
    return (
        <Layout>
            <Grid container  spacing={0}  className="searchContainer">
                <Grid item lg={12} className="mainText">Where are you planning to go</Grid>
                <Grid item lg={12}>
                    <Grid container>
                        <Grid item lg={12}>
                            <Grid container style={{display: 'flex'}}>
                                <Grid item>Single Place</Grid>
                                <Grid item>Multiple locations</Grid>
                            </Grid>
                        </Grid>
                        <Grid item lg={12}>
                            <SearchBar />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Layout>
    );
};

export default Home;