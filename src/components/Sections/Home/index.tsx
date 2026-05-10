import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { TRIP_BASIC } from 'constants';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import type { Country, Destination } from 'types/trip';

const Home = () => {
    const dispatch = useTripDispatch();
    const [isSingleSelected, setIsSingleSelected] = useState(true);
    const navigate = useNavigate();

    const handleClick = (id: number) => {
        setIsSingleSelected(TRIP_BASIC.SINGLE.id === id);
    };

    const handleSelectedSearch = (searchData?: Country) => {
        const type = isSingleSelected ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        const destinations = (
            isSingleSelected && searchData ? [{ country: searchData }] : []
        ) as Destination[];
        dispatch(basicInfo({ type, destinations }));
        navigate(type.route, { replace: true });
    };

    useEffect(() => {
        if (!isSingleSelected) {
            handleSelectedSearch(undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSingleSelected]);

    return (
        <Layout>
            <Grid container spacing={0} className="searchContainer">
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container>
                        <Grid item lg={12} md={12} xs={12} className="mainText pb-4">
                            Where are you planning to go
                        </Grid>
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
