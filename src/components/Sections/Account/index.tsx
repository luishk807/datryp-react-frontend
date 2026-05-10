import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import './index.css';

export const Account = () => {
    return (
        <Layout title="Account">
            <Grid container id="account-section" spacing={0}>
                <Grid item lg={12} md={12} xs={12}>
                    Welcome Luis
                </Grid>
            </Grid>
        </Layout>
    );
};

export default Account;
