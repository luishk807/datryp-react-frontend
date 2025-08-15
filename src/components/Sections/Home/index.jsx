import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// import Autocomplete from '@mui/material/Autocomplete';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
// import { tripType } from 'sample';
import { TRIP_BASIC } from 'constants';

const Home = ({
    onBasicInfo,
    tripInfo
}) => {
    const [isSingleSelected, setIsSingleSelected] = useState(true);
    const navigate = useNavigate();

    const handleClick = (e) => {
        console.log(e);
        setIsSingleSelected(TRIP_BASIC.SINGLE.id === e ? true : false);
    };

    const handleSelectedSearch = (searchData) => {
        console.log(searchData, 'searchData');
        console.log("tripInfo", tripInfo);
        const type = isSingleSelected ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        onBasicInfo && onBasicInfo({
            type,
            destinations: isSingleSelected ? [
                {
                    country: searchData
                }
            ] : []
        });
        navigate(type.route, {replace: true});
    };

    useEffect(() => {
        if (!isSingleSelected) {
            handleSelectedSearch();
        }
    }, [isSingleSelected]);
    
    return (
        <Layout>
            <Grid container spacing={0} className="searchContainer">
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container>
                        <Grid item lg={12} md={12} xs={12} className="mainText pb-4">Where are you planning to go</Grid>
                        <Grid item lg={12} md={12} xs={12} >
                            <Grid container>
                                <Grid item lg={12} md={12} xs={12}>
                                    <Grid container className="optionSelection">
                                        <Grid item>
                                            <button className={classnames(
                                                'selection', {
                                                    'selected': isSingleSelected
                                                })} onClick={() => handleClick(TRIP_BASIC.SINGLE.id)}>Single Place</button>
                                        </Grid>
                                        <Grid item>
                                            <button className={classnames(
                                                'selection', {
                                                    'selected': !isSingleSelected
                                                })} onClick={() => handleClick(TRIP_BASIC.MULTIPLE.id)}>Multiple locations</button>
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

const mapStateToProps = (state) => ({ tripInfo: state });

const mapDispatchToProps = (dispatch) => ({
    onBasicInfo: (value) => dispatch({ type: "BASIC_INFO", payload: value})
});


Home.propTypes = {
    tripInfo: PropTypes.object,
    onBasicInfo: PropTypes.func,
};
export default connect(mapStateToProps, mapDispatchToProps)(Home);