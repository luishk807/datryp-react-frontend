import React, { useState} from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Grid } from '@mui/material';
import './index.css';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// import Autocomplete from '@mui/material/Autocomplete';
import SearchBar from '../SearchBar';
import Layout from '../common/Layout';
import { tripType } from '../../sample';

const Home = ({
    onBasicInfo,
    tripInfo
}) => {
    const [singleSelected, setSingleSelected] = useState(true);
    const navigate = useNavigate();
    const handleClick = (e) => {
        console.log(e);
        setSingleSelected(e);
    };

    const handleSelectedSearch = (searchData) => {
        console.log(searchData, 'searchData');
        console.log("tripInfo", tripInfo);

        const type = singleSelected ? 'single' : 'multiple';
        onBasicInfo && onBasicInfo({
            type: tripType[type],
            destinations: [
                {
                    country: searchData
                }
            ]
        });
        navigate(tripType[type].route, {replace: true});
        
    };
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