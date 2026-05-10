import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import TripBox from 'components/common/TripBox';
import { userTrips } from 'sample/userTrips';
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
                {userTrips.map((trip) => (
                    <Grid
                        key={trip.id}
                        item
                        className="trip-item"
                        sx={{ flexBasis: TRIP_ITEM_FLEX }}
                    >
                        <TripBox data={trip} />
                    </Grid>
                ))}
            </Grid>
        </Layout>
    );
};

export default Trips;
