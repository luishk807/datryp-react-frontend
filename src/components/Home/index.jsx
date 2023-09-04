import React, { useState} from 'react';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
import Autocomplete from '@mui/material/Autocomplete';
import SearchBar from '../SearchBar';
import Layout from '../Layout';

const Home = () => {
    const [selected, setSelected] = useState(true);

    const handleClick = (e) => {
        console.log(e);
    };
    return (
        <Layout>
            <Grid container spacing={0} className="searchContainer">
                <Grid item lg={12} className="mainText pb-4">Where are you planning to go</Grid>
                <Grid item lg={12}>
                    <Grid container>
                        <Grid item lg={12}>
                            <Grid container className="optionSelection">
                                <Grid item>
                                    <button className={classnames(
                                        'selection', 
                                        {
                                            'selected': selected
                                        }
                                    )
                                    } onClick={handleClick}>Single Place</button>
                                </Grid>
                                <Grid item>
                                    <button className="selection" onClick={handleClick}>Multiple locations</button>
                                </Grid>
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