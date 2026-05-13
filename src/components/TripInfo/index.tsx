import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import type { TripState } from 'types';
import './index.scss';

interface TripInfoProps {
    data: TripState;
}

const TripInfo = ({ data }: TripInfoProps) => {
    return (
        <Layout>
            <Grid container className="tripInfo">
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="header">
                        <Grid item lg={6} md={6} xs={6} className="title">
                          Trip: {data.name}
                        </Grid>
                        <Grid item lg={6} md={6} xs={6} className="menu">
                          Edit
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <hr />
                </Grid>
                <Grid item lg={12} md={12} xs={12}>
                    <Grid container className="tripData">
                        <Grid item lg={6} md={6} xs={12} className="data">
                            <ul>
                                <li>
                                    <span className="title">Budget:</span>
                                    <span>${data.budget}</span>
                                </li>
                                <li>
                                    <span className="title">Total:</span>
                                    <span>${data.total}</span>
                                </li>
                                <li>
                                    <span className="title">Date:</span>
                                    <span>{`${data.startDate} - ${data.endDate}`}</span>
                                </li>
                                <li>
                                    <span className="title">People:</span>
                                    <span>{data.people}</span>
                                </li>
                            </ul>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} className="status">
                          Completed?
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} className="tripItems">
                    <DestinationDetail
                        startDate={data.startDate}
                        endDate={data.endDate}
                        type={data.type}
                        destinations={data.destinations}
                        onChangeBudget={() => {}}
                        onChangePlace={() => {}}
                    />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default TripInfo;
