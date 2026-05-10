import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { TRIP_BASIC } from 'constants';
import { basicInfo, useTripDispatch, useTripState } from 'context/TripContext';

const Home = () => {
    const dispatch = useTripDispatch();
    const tripInfo = useTripState();
    const [isSingleSelected, setIsSingleSelected] = useState(true);
    const navigate = useNavigate();

    const handleClick = (e) => {
        setIsSingleSelected(TRIP_BASIC.SINGLE.id === e);
    };

    const handleSelectedSearch = (searchData) => {
        console.log(searchData, 'searchData');
        console.log('tripInfo', tripInfo);
        const type = isSingleSelected ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        dispatch(
            basicInfo({
                type,
                destinations: isSingleSelected
                    ? [{ country: searchData }]
                    : [],
            })
        );
        navigate(type.route, { replace: true });
    };

    useEffect(() => {
        if (!isSingleSelected) {
            handleSelectedSearch(undefined);
        }
    }, [isSingleSelected]);

    return (
        <Layout>
            <Grid container spacing={0} className="searchContainer">
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container>
                        <Grid item lg={12} md={12} xs={12} className="mainText pb-4">Where are you planning to go</Grid>
                        <Grid item lg={12} md={12} xs={12}>
                            <Grid container>
                                <Grid item lg={12} md={12} xs={12}>
                                    <Grid container className="optionSelection">
                                        <Grid item>
                                            <button
                                                className={classnames('selection', {
                                                    selected: isSingleSelected,
                                                })}
                                                onClick={() => handleClick(TRIP_BASIC.SINGLE.id)}
                                            >
                                                Single Place
                                            </button>
                                        </Grid>
                                        <Grid item>
                                            <button
                                                className={classnames('selection', {
                                                    selected: !isSingleSelected,
                                                })}
                                                onClick={() => handleClick(TRIP_BASIC.MULTIPLE.id)}
                                            >
                                                Multiple locations
                                            </button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item lg={12} md={12} className="searchBarContainer">
                                    <SearchBar onSelected={handleSelectedSearch} />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Layout>
    );
};

export default Home;
