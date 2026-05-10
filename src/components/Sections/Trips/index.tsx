import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import TripBox from 'components/common/TripBox';
import './index.css';

const TRIP_ITEM_FLEX = {
    lg: 'calc(100% / 3)',
    xs: 'calc(100% / 1)',
    md: 'calc(100% / 3)',
};

export const Trips = () => {
    return (
        <Layout title="My Trips">
            <Grid container id="trip-container">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <Grid key={idx} item className="trip-item" sx={{ flexBasis: TRIP_ITEM_FLEX }}>
                        <TripBox />
                    </Grid>
                ))}
            </Grid>
        </Layout>
    );
};

export default Trips;
