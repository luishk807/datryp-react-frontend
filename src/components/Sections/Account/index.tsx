import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import TripBox from 'components/common/TripBox';
import { userTrips } from 'sample/userTrips';
import './index.css';

export const Account = () => {
    return (
        <Layout title="Account">
            <Grid container id="account-section" spacing={0}>
                <Grid item lg={12} md={12} xs={12} className="account-greeting">
                    Welcome back, Luis
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <h2 className="account-section-heading">Your trips</h2>
                </Grid>
                {userTrips.map((trip) => (
                    <Grid
                        key={trip.id}
                        item
                        lg={4}
                        md={6}
                        xs={12}
                        className="account-trip-item"
                    >
                        <TripBox data={trip} />
                    </Grid>
                ))}
            </Grid>
        </Layout>
    );
};

export default Account;
